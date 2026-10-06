import type { Question } from './questions';
import { postingAt, questionDay, type PromoSlot } from './daily-clock';
import noonHooks from './promotion-noon.json';

export type PromoConfig = { key: string; channelId: string; origin: string; organizationId: string };
export type PromoTopic = { question: Question; image: string };
export type PromoRow = { day: string; channel: string; status: string; text: string; image: string; post_id: string | null; error: string | null; updated: string; attempts: number };
type Channel = { id: string; name: string; displayName: string; service: string; isQueuePaused: boolean };
export class PromoError extends Error {
  constructor(message: string, public uncertain = false) { super(message); }
}
const shorten = (text: string, n: number) => Array.from(text.replace(/\s+/g, ' ').trim()).slice(0, n).join('');
export function promoContent(day: string, topic: PromoTopic, origin: string, slot: PromoSlot = 'morning') {
  const link = new URL('/', origin);
  link.search = new URLSearchParams({ utm_source: 'threads', utm_medium: 'social', utm_campaign: (slot === 'noon' ? 'noon-' : 'daily-') + day }).toString();
  const q = topic.question;
  let text = `오늘의 사상 질문\n\n${shorten(q.title[0], 150)}\n\nA. ${shorten(q.options[0][0], 75)}\nB. ${shorten(q.options[1][0], 75)}\n\n너는 어느 쪽이야? 반대편의 이유도 들어보자.\n로그인 없이 선택하고 댓글을 읽을 수 있어.\n${link.href}`;
  if (slot === 'noon') {
    const hook = (noonHooks as Record<string, string>)[q.title[0]] || `오늘의 질문: ${shorten(q.title[0], 150)}\n\n내가 선택한 쪽의 비용을 가장 가까운 사람이 감당해도 같은 답을 고를까? 반대편이 지키려는 가치는 무엇일까?`;
    text = `점심의 생각 실험\n\n${hook}\n\n아침에 고른 답, 지금도 같아? 이유를 남겨줘.\n${link.href}`;
  }
  if (Array.from(text).length > 500) throw new PromoError('홍보 문장이 Threads 글자 제한을 넘었어요.');
  // Seven axis illustrations are exported as PNG, a supported social media format.
  const match = topic.image.match(/\/code-(\d{3})\.svg$/);
  const labels = ['정치', '젠더', '계급', '개방성', '개인 가치', '사회 관점', '윤리 판단'];
  const axis = labels.findIndex(label => q.tag[0].startsWith(label));
  const image = match && axis >= 0 ? `/images/promotion/axis-${axis + 1}.png` : topic.image.endsWith('.svg') ? '/images/community-you.png' : topic.image;
  return { text, image: new URL(image, origin).href, dueAt: postingAt(day, slot) };
}
export async function bufferRequest<T>(config: PromoConfig, query: string, fetcher: typeof fetch = fetch, mutation = false): Promise<T> {
  if (!config.key || !config.channelId) throw new PromoError('Cloudflare의 BUFFER_API_KEY와 BUFFER_THREADS_CHANNEL_ID를 확인해 주세요.');
  let response: Response;
  try {
    response = await fetcher('https://api.buffer.com', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.key}` }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(20000) });
  } catch { throw new PromoError('Buffer 응답을 확인하지 못했어요. 중복 방지를 위해 게시 결과를 먼저 확인합니다.', mutation); }
  if (!response.ok) throw new PromoError(response.status === 401 || response.status === 403 ? 'Buffer 키 또는 게시 권한을 확인해 주세요.' : `Buffer 연결 오류 (${response.status}).`, mutation && response.status >= 500);
  let result: { data?: T; errors?: unknown[] };
  try { result = await response.json(); } catch { throw new PromoError('Buffer 응답을 읽지 못했어요.', mutation); }
  if (result.errors?.length || !result.data) throw new PromoError('Buffer API 요청이 거절됐어요. 키의 권한과 연결 상태를 확인해 주세요.', mutation);
  return result.data;
}
export async function checkPromoChannel(config: PromoConfig, fetcher: typeof fetch = fetch) {
  const data = await bufferRequest<{ channel: Channel | null }>(config, `query { channel(input: { id: ${JSON.stringify(config.channelId)} }) { id name displayName service isQueuePaused } }`, fetcher);
  const c = data.channel;
  if (!c || c.service !== 'threads' || c.name.replace(/^@/, '').toLowerCase() !== 'communitydailyab') throw new PromoError('communitydailyab Threads 계정이 연결돼 있는지 확인해 주세요.');
  if (c.isQueuePaused) throw new PromoError('Buffer 대기열이 일시 정지돼 있어요. Buffer에서 재개해 주세요.');
  return c;
}
export async function promoTables(db: D1Database) {
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS promotion_settings (id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL DEFAULT 0)'),
    db.prepare('INSERT OR IGNORE INTO promotion_settings(id,enabled) VALUES (1,0)'),
    db.prepare('CREATE TABLE IF NOT EXISTS promotion_posts (day TEXT NOT NULL, channel TEXT NOT NULL, status TEXT NOT NULL, text TEXT NOT NULL, image TEXT NOT NULL, post_id TEXT, error TEXT, updated TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day,channel))')
  ]);
}
export async function createBufferPost(config: PromoConfig, content: ReturnType<typeof promoContent>, draft: boolean, fetcher: typeof fetch = fetch) {
  const data = await bufferRequest<{ createPost: { post?: { id: string; dueAt?: string }; message?: string } }>(config, `mutation { createPost(input: { text: ${JSON.stringify((draft ? '[연결 테스트 초안]\n' : '') + content.text)} channelId: ${JSON.stringify(config.channelId)} schedulingType: automatic mode: ${draft ? 'addToQueue' : 'customScheduled'} ${draft ? 'saveToDraft: true' : 'dueAt: ' + JSON.stringify(content.dueAt)} assets: [{ image: { url: ${JSON.stringify(content.image)} } }] }) { ... on PostActionSuccess { post { id dueAt } } ... on MutationError { message } } }`, fetcher, true);
  if (!data.createPost.post?.id) throw new PromoError('Buffer에서 게시물을 만들지 못했어요. Buffer 연결·권한·이미지 주소를 확인해 주세요.');
  return data.createPost.post;
}
async function findRemote(config: PromoConfig, text: string, fetcher: typeof fetch) {
  const data = await bufferRequest<{ posts: { edges: { node: { id: string; text: string; status: string } }[] } }>(config, `query { posts(first: 100, input: { organizationId: ${JSON.stringify(config.organizationId)} filter: { channelIds: [${JSON.stringify(config.channelId)}] } }) { edges { node { id text status } } } }`, fetcher);
  return data.posts.edges.map(e => e.node).find(p => p.text === text);
}
export async function runDailyPromotion(db: D1Database, config: PromoConfig, getTopic: (day: string) => Promise<PromoTopic>, now = new Date(), fetcher: typeof fetch = fetch, slot: PromoSlot = 'morning') {
  await promoTables(db);
  const setting = await db.prepare('SELECT enabled FROM promotion_settings WHERE id=1').first<{ enabled: number }>();
  if (!setting?.enabled) return { status: 'disabled' };
  const day = questionDay(now), dueAt = postingAt(day, slot);
  const recordChannel = slot === 'noon' ? config.channelId + ':noon' : config.channelId;
  const due = Date.parse(dueAt);
  // Prepare each slot 30–5 minutes before its posting time in Seoul.
  if (now.getTime() < due - 30 * 60000 || now.getTime() >= due - 5 * 60000) return { status: 'outside_window' };
  let row = await db.prepare('SELECT * FROM promotion_posts WHERE day=? AND channel=?').bind(day, recordChannel).first<PromoRow>();
  if (row?.status === 'queued') return { status: 'queued', postId: row.post_id };
  if (row && ['submitting', 'uncertain'].includes(row.status)) {
    // A timed-out write may have succeeded. Never repeat it blindly.
    if (row.status === 'submitting' && Date.parse(row.updated) > now.getTime() - 120000) return { status: 'busy' };
    const remote = await findRemote(config, row.text, fetcher);
    if (remote) {
      await db.prepare("UPDATE promotion_posts SET status='queued',post_id=?,error=NULL,updated=? WHERE day=? AND channel=?").bind(remote.id, now.toISOString(), day, recordChannel).run();
      return { status: 'queued', postId: remote.id };
    }
    await db.prepare("UPDATE promotion_posts SET status='uncertain',error=?,updated=? WHERE day=? AND channel=?").bind('결과 확인 필요: Buffer에 게시물이 있는지 확인해 주세요. 자동 재전송하지 않습니다.', now.toISOString(), day, recordChannel).run();
    return { status: 'uncertain' };
  }
  const content = row ? { text: row.text, image: row.image, dueAt } : promoContent(day, await getTopic(day), config.origin, slot);
  await db.prepare("INSERT INTO promotion_posts(day,channel,status,text,image,updated) VALUES (?,?,'ready',?,?,?) ON CONFLICT(day,channel) DO NOTHING").bind(day, recordChannel, content.text, content.image, now.toISOString()).run();
  try { await checkPromoChannel(config, fetcher); } catch (e) {
    await db.prepare("UPDATE promotion_posts SET status='failed',error=?,updated=? WHERE day=? AND channel=? AND status IN ('ready','failed')").bind(e instanceof PromoError ? e.message : '연결 확인 실패', now.toISOString(), day, recordChannel).run();
    return { status: 'failed' };
  }
  const lock = await db.prepare("UPDATE promotion_posts SET status='submitting',error=NULL,updated=?,attempts=attempts+1 WHERE day=? AND channel=? AND status IN ('ready','failed') RETURNING day").bind(now.toISOString(), day, recordChannel).first();
  if (!lock) return { status: 'busy' };
  // Read persisted content after acquiring the lock, so concurrent invocations agree.
  row = await db.prepare('SELECT * FROM promotion_posts WHERE day=? AND channel=?').bind(day, recordChannel).first<PromoRow>();
  if (!row) throw new Error('Promotion record unavailable');
  let post: { id: string };
  try { post = await createBufferPost(config, { text: row.text, image: row.image, dueAt }, false, fetcher); }
  catch (e) {
    const uncertain = !(e instanceof PromoError) || e.uncertain;
    await db.prepare('UPDATE promotion_posts SET status=?,error=?,updated=? WHERE day=? AND channel=?').bind(uncertain ? 'uncertain' : 'failed', e instanceof PromoError ? e.message : '게시 결과 확인 필요', now.toISOString(), day, recordChannel).run();
    return { status: uncertain ? 'uncertain' : 'failed' };
  }
  // If this DB write fails, keep 'submitting'; the next run reconciles with Buffer.
  await db.prepare("UPDATE promotion_posts SET status='queued',post_id=?,error=NULL,updated=? WHERE day=? AND channel=?").bind(post.id, now.toISOString(), day, recordChannel).run();
  return { status: 'queued', postId: post.id };
}

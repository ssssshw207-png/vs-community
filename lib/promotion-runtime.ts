import type { Question } from './questions';
import { postingAt, questionDay, type PromoSlot } from './daily-clock';
import socialCopy from './promotion-social.json';

export type PromoConfig = { key: string; channelId: string; origin: string; organizationId: string };
export type PromoTopic = { question: Question; image: string };
export type PromoRow = { day: string; channel: string; status: string; text: string; image: string; post_id: string | null; error: string | null; updated: string; attempts: number };
type Channel = { id: string; name: string; displayName: string; service: string; isQueuePaused: boolean };
export class PromoError extends Error {
  constructor(message: string, public uncertain = false) { super(message); }
}
const shorten = (text: string, n: number) => Array.from(text.replace(/\s+/g, ' ').trim()).slice(0, n).join('');
export function promoContent(day: string, topic: PromoTopic, origin: string, slot: PromoSlot = 'morning') {
  const q = topic.question;
  const copy = (socialCopy as Record<string, Record<PromoSlot, string>>)[q.title[0]];
  // Custom questions receive conservative, self-contained fallback copy.
  const title = shorten(q.title[0].replace(/https?:\/\/\S+/g, ''), 150);
  const fallback: Record<PromoSlot, string> = {
    morning: `${title}\n\n같은 질문을 읽어도 가장 먼저 떠오르는 사람이나 장면은 다를 수 있어. 누군가는 자신이 지키고 싶은 것을 생각하고, 누군가는 그 선택 때문에 힘들어질 사람을 생각하겠지.\n\n반대하는 이유를 듣다 보면 몰랐던 사정이 보일 때도 있어. 그렇다고 곧바로 내 생각을 바꿔야 하는 것은 아닐 거야.\n\n쉽게 답하지 못한다고 생각이 부족한 건 아닐 수 있어. 어느 쪽이든 남는 아쉬움이 있다는 걸 알아서 망설이는 걸 수도 있지. 오늘은 조금 천천히 생각해 봐도 좋겠어.`,
    noon: `${title}\n\n이 선택의 비용을 내 가족이 감당해야 해도 같은 답을 고를까?`,
    afternoon: `${title}\n\n내가 지금보다 생활에 여유가 있다면 어떤 답을 고르게 될까?`,
    evening: `${title}\n\n반대편 사람은 무엇을 잃을까 봐 걱정하는 걸까? 그 마음을 먼저 듣고 싶어.`,
    night: `${title}\n\n오늘 내 답이 조금 바뀌었다면 어떤 장면 때문일까? 그대로라면 꼭 지키고 싶은 것은 무엇일까?`
  };
  const text = copy?.[slot] || fallback[slot];
  if (Array.from(text).length > 480) throw new PromoError('게시 글이 글자 제한을 넘었어요.');
  return { text, image: '', dueAt: postingAt(day, slot) };
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
  const data = await bufferRequest<{ createPost: { post?: { id: string; dueAt?: string }; message?: string } }>(config, `mutation { createPost(input: { text: ${JSON.stringify((draft ? '[연결 테스트 초안]\n' : '') + content.text)} channelId: ${JSON.stringify(config.channelId)} schedulingType: automatic mode: ${draft ? 'addToQueue' : 'customScheduled'} ${draft ? 'saveToDraft: true' : 'dueAt: ' + JSON.stringify(content.dueAt)} ${content.image ? 'assets: [{ image: { url: ' + JSON.stringify(content.image) + ' } }]' : ''} }) { ... on PostActionSuccess { post { id dueAt } } ... on MutationError { message } } }`, fetcher, true);
  if (!data.createPost.post?.id) throw new PromoError('Buffer에서 게시물을 만들지 못했어요. Buffer 연결·권한·이미지 주소를 확인해 주세요.');
  return data.createPost.post;
}
async function findRemote(config: PromoConfig, text: string, dueAt: string, fetcher: typeof fetch) {
  const data = await bufferRequest<{ posts: { edges: { node: { id: string; text: string; status: string; dueAt: string | null } }[] } }>(config, `query { posts(first: 100, input: { organizationId: ${JSON.stringify(config.organizationId)} filter: { channelIds: [${JSON.stringify(config.channelId)}] } }) { edges { node { id text status dueAt } } } }`, fetcher);
  return data.posts.edges.map(e => e.node).find(p => p.text === text && p.dueAt && Date.parse(p.dueAt) === Date.parse(dueAt));
}
export async function runDailyPromotion(db: D1Database, config: PromoConfig, getTopic: (day: string) => Promise<PromoTopic>, now = new Date(), fetcher: typeof fetch = fetch, slot: PromoSlot = 'morning') {
  await promoTables(db);
  const setting = await db.prepare('SELECT enabled FROM promotion_settings WHERE id=1').first<{ enabled: number }>();
  if (!setting?.enabled) return { status: 'disabled' };
  const day = questionDay(now), dueAt = postingAt(day, slot);
  const recordChannel = slot === 'morning' ? config.channelId : config.channelId + ':' + slot;
  const due = Date.parse(dueAt);
  // Prepare each slot 30–5 minutes before its posting time in Seoul.
  if (now.getTime() < due - 30 * 60000 || now.getTime() >= due - 5 * 60000) return { status: 'outside_window' };
  let row = await db.prepare('SELECT * FROM promotion_posts WHERE day=? AND channel=?').bind(day, recordChannel).first<PromoRow>();
  if (row?.status === 'queued') return { status: 'queued', postId: row.post_id };
  if (row && ['submitting', 'uncertain'].includes(row.status)) {
    // A timed-out write may have succeeded. Never repeat it blindly.
    if (row.status === 'submitting' && Date.parse(row.updated) > now.getTime() - 120000) return { status: 'busy' };
    const remote = await findRemote(config, row.text, dueAt, fetcher);
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

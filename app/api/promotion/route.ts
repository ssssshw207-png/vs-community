import { adminUser } from '@/lib/admin';
import { database } from '@/db';
import { promotionConfig, promotionPreview } from '@/lib/promotion';
import { checkPromoChannel, createBufferPost, promoTables, PromoError, type PromoRow } from '@/lib/promotion-runtime';
export const dynamic = 'force-dynamic';
const answer = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(req: Request) {
  if (!await adminUser(req)) return answer({ error: '관리자 로그인이 필요해요.' }, 403);
  try {
    const db = database(), config = promotionConfig();
    await promoTables(db);
    const setting = await db.prepare('SELECT enabled FROM promotion_settings WHERE id=1').first<{ enabled: number }>();
    const rows = await db.prepare('SELECT * FROM promotion_posts ORDER BY day DESC LIMIT 30').all<PromoRow>();
    return answer({ enabled: !!setting?.enabled, configured: !!(config.key && config.channelId), preview: await promotionPreview(), rows: rows.results });
  } catch { return answer({ error: '홍보 설정을 불러오지 못했어요.' }, 503); }
}
export async function POST(req: Request) {
  if (req.headers.get('origin') !== new URL(req.url).origin) return answer({ error: '잘못된 요청이에요.' }, 403);
  if (!await adminUser(req)) return answer({ error: '관리자 로그인이 필요해요.' }, 403);
  try {
    const body = await req.json() as { action?: string; enabled?: boolean }, db = database(), config = promotionConfig();
    await promoTables(db);
    if (body.action === 'check') return answer({ ok: true, channel: await checkPromoChannel(config) });
    if (body.action === 'toggle' && typeof body.enabled === 'boolean') {
      if (body.enabled) await checkPromoChannel(config);
      await db.prepare('UPDATE promotion_settings SET enabled=? WHERE id=1').bind(body.enabled ? 1 : 0).run();
      return answer({ ok: true });
    }
    if (body.action === 'draft') {
      await checkPromoChannel(config);
      const preview = await promotionPreview();
      const post = await createBufferPost(config, preview, true);
      return answer({ ok: true, postId: post.id });
    }
    return answer({ error: '지원하지 않는 요청이에요.' }, 400);
  } catch (e) { return answer({ error: e instanceof PromoError ? e.message : '홍보 요청을 처리하지 못했어요.' }, 503); }
}

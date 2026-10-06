import { env } from 'cloudflare:workers';
import { database } from '@/db';
import { defaultTopic, topicFor } from './topic-store';
import { adminTables } from './admin';
import { nextPostingDay } from './daily-clock';
import { promoContent, promoTables, runDailyPromotion, type PromoConfig } from './promotion-runtime';
export function promotionConfig(): PromoConfig {
  const e = env as unknown as Record<string, string>;
  const origin = new URL(e.APP_URL || 'https://vs-community.sconsulting77.workers.dev').origin;
  if (!origin.startsWith('https://')) throw new Error('HTTPS APP_URL required');
  return { key: e.BUFFER_API_KEY || '', channelId: e.BUFFER_THREADS_CHANNEL_ID || '', origin, organizationId: e.BUFFER_ORGANIZATION_ID || '6ac51eeec724593e2654b055' };
}
export async function promotionPreview() {
  await adminTables();
  const day = nextPostingDay(), db = database();
  const row = await db.prepare('SELECT question,image FROM question_days WHERE day=? UNION ALL SELECT question,image FROM scheduled_questions WHERE day=? LIMIT 1').bind(day, day).first<{ question: string; image: string }>();
  const topic = row ? { question: JSON.parse(row.question), image: row.image } : defaultTopic(day);
  return { day, ...promoContent(day, topic, promotionConfig().origin) };
}
export async function scheduledPromotion(now = new Date()) {
  const db = database();
  await promoTables(db);
  return runDailyPromotion(db, promotionConfig(), topicFor, now);
}

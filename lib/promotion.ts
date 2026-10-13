import { env } from 'cloudflare:workers';
import { database } from '@/db';
import { defaultTopic, topicFor } from './topic-store';
import { adminTables } from './admin';
import { nextPostingDay, activePromoSlot, promoSlots, promoTimes, type PromoSlot } from './daily-clock';
import { promoContent, promoTables, runDailyPromotion, type PromoConfig } from './promotion-runtime';
export function promotionConfig(): PromoConfig {
  const e = env as unknown as Record<string, string>;
  const origin = new URL(e.APP_URL || 'https://vs-community.sconsulting77.workers.dev').origin;
  if (!origin.startsWith('https://')) throw new Error('HTTPS APP_URL required');
  return { key: e.BUFFER_API_KEY || '', channelId: e.BUFFER_THREADS_CHANNEL_ID || '', origin, organizationId: e.BUFFER_ORGANIZATION_ID || '6ac51eeec724593e2654b055' };
}
export async function promotionPreviews(slots: readonly PromoSlot[] = promoSlots, now = new Date()) {
  await adminTables();
  const db = database(), origin = promotionConfig().origin;
  const topics = new Map<string, ReturnType<typeof defaultTopic>>();
  for (const day of new Set(slots.map(slot => nextPostingDay(now, slot)))) {
    const row = await db.prepare('SELECT question,image FROM question_days WHERE day=? UNION ALL SELECT question,image FROM scheduled_questions WHERE day=? LIMIT 1').bind(day, day).first<{ question: string; image: string }>();
    topics.set(day, row ? { question: JSON.parse(row.question), image: row.image } : defaultTopic(day));
  }
  return slots.map(slot => {
    const day = nextPostingDay(now, slot);
    return { slot, time: promoTimes[slot], day, ...promoContent(day, topics.get(day)!, origin, slot) };
  });
}
export async function promotionPreview(slot: PromoSlot = 'morning') {
  return (await promotionPreviews([slot]))[0];
}
export async function scheduledPromotion(now = new Date()) {
  const slot = activePromoSlot(now);
  if (!slot) return { status: 'outside_window' };
  return runDailyPromotion(database(), promotionConfig(), topicFor, now, fetch, slot);
}

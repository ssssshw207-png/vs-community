// A question day starts at 07:00 Asia/Seoul (22:00 UTC the previous day).
export function questionDay(now = new Date()) {
  return new Date(now.getTime() + 2 * 3600000).toISOString().slice(0, 10);
}
export function nextQuestionAt(now = new Date()) {
  return Date.parse(questionDay(now) + 'T22:00:00Z');
}
export const promoSlots = ['morning', 'noon', 'afternoon', 'evening', 'night'] as const;
export type PromoSlot = typeof promoSlots[number];
export const promoTimes: Record<PromoSlot, string> = { morning: '07:30', noon: '12:00', afternoon: '15:00', evening: '18:00', night: '21:00' };
export function isPromoSlot(value: unknown): value is PromoSlot {
  return typeof value === 'string' && (promoSlots as readonly string[]).includes(value);
}
export function postingAt(day: string, slot: PromoSlot = 'morning') {
  const [hour, minute] = promoTimes[slot].split(':').map(Number);
  return new Date(Date.parse(day + 'T00:00:00Z') + (hour * 60 + minute - 9 * 60) * 60000).toISOString();
}
export function nextPostingDay(now = new Date(), slot: PromoSlot = 'morning') {
  const day = new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
  return now.getTime() < Date.parse(postingAt(day, slot)) ? day : new Date(Date.parse(day + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
}
export function activePromoSlot(now = new Date()): PromoSlot | undefined {
  const day = questionDay(now);
  return promoSlots.find(slot => {
    const due = Date.parse(postingAt(day, slot));
    return now.getTime() >= due - 30 * 60000 && now.getTime() < due - 5 * 60000;
  });
}

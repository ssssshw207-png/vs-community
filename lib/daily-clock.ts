// A question day starts at 07:00 Asia/Seoul (22:00 UTC the previous day).
export function questionDay(now = new Date()) {
  return new Date(now.getTime() + 2 * 3600000).toISOString().slice(0, 10);
}
export function nextQuestionAt(now = new Date()) {
  return Date.parse(questionDay(now) + 'T22:00:00Z');
}
export const promoSlots = ['morning', 'at0830', 'at0930', 'at1030', 'at1130', 'noon', 'at1300', 'at1400', 'afternoon', 'at1600', 'at1700', 'evening', 'at1900', 'at2000', 'night'] as const;
export type PromoSlot = typeof promoSlots[number];
export const promoTimes: Record<PromoSlot, string> = { morning: '07:30', at0830: '08:30', at0930: '09:30', at1030: '10:30', at1130: '11:30', noon: '12:00', at1300: '13:00', at1400: '14:00', afternoon: '15:00', at1600: '16:00', at1700: '17:00', evening: '18:00', at1900: '19:00', at2000: '20:00', night: '21:00' };
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

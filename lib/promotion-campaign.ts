import campaign from './promotion-100-days.json';
import { promoSlots, type PromoSlot } from './daily-clock';

const midnight = (day: string) => Date.parse(day + 'T00:00:00Z');
export const campaignStart = campaign.startDay;
export const campaignDays = campaign.dayCount;
export const campaignEnd = new Date(midnight(campaignStart) + (campaignDays - 1) * 86400000).toISOString().slice(0, 10);
export function campaignState(day: string): 'upcoming' | 'active' | 'completed' {
  return day < campaignStart ? 'upcoming' : day > campaignEnd ? 'completed' : 'active';
}
export function campaignPost(day: string, slot: PromoSlot) {
  if (campaignState(day) !== 'active') return null;
  const offset = Math.floor((midnight(day) - midnight(campaignStart)) / 86400000);
  const index = campaign.slots.indexOf(slot);
  if (!Number.isFinite(offset) || index < 0 || campaign.slots.length !== promoSlots.length) throw new Error('Invalid campaign schedule');
  const text = campaign.posts[offset * campaign.slots.length + index];
  if (!text || Array.from(text).length > 480) throw new Error('Invalid campaign copy');
  return { text, questionTitle: campaign.morningQuestionTitles[offset] };
}

// A question day starts at 07:00 Asia/Seoul (22:00 UTC the previous day).
export function questionDay(now = new Date()) {
  return new Date(now.getTime() + 2 * 3600000).toISOString().slice(0, 10);
}
export function nextQuestionAt(now = new Date()) {
  return Date.parse(questionDay(now) + 'T22:00:00Z');
}
export function postingAt(day: string) {
  return new Date(Date.parse(day + 'T00:00:00Z') - 90 * 60000).toISOString();
}
export function nextPostingDay(now = new Date()) {
  const day = new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
  return now.getTime() < Date.parse(postingAt(day)) ? day : new Date(Date.parse(day + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
}

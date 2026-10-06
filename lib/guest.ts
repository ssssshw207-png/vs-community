import {database} from '@/db';
const NAME='community_guest';
export function guestId(cookie:string|null){const value=cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith(NAME+'='))?.slice(NAME.length+1);return value&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)?'guest:'+value:null}
export function newGuest(){const token=crypto.randomUUID();return {id:'guest:'+token,cookie:`${NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`}}
export const clearGuestCookie=`${NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
// Atomic transfer: the signed-in account's existing choice wins on conflicts.
export async function claimGuestVotes(user:string,guest:string){const db=database();await db.batch([
 db.prepare('INSERT INTO votes (user,day,choice,country,reflection,created) SELECT ?,day,choice,country,reflection,created FROM votes WHERE user=? AND 1=1 ON CONFLICT(user,day) DO NOTHING').bind(user,guest),
 db.prepare('DELETE FROM votes WHERE user=?').bind(guest),
]);}

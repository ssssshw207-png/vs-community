import {nicknameError,normalizeNickname,nicknameKey} from './nickname';
import {regions,genders,ageGroups,type Profile} from './community';
export function parseProfile(input:Record<string,unknown>):Profile|null{
 const nickname=normalizeNickname(input.nickname);
 if(nicknameError(nickname))return null;
 if(!regions.some(r=>r[0]===input.country)||!genders.some(r=>r[0]===input.gender)||!ageGroups.some(r=>r[0]===input.ageGroup))return null;
 return {nickname,country:String(input.country),gender:String(input.gender),ageGroup:String(input.ageGroup)};
}
export async function saveProfile(db:D1Database,user:string,profile:Profile){
 await nicknameTables(db);
 await db.batch([
  db.prepare('DELETE FROM nickname_claims WHERE user=?').bind(user),
  db.prepare('INSERT INTO nickname_claims(name,user) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET user=CASE WHEN user=excluded.user THEN excluded.user ELSE NULL END').bind(nicknameKey(profile.nickname),user),
  db.prepare('INSERT INTO profiles (user,country,gender,age_group,nickname,updated) VALUES (?,?,?,?,?,?) ON CONFLICT(user) DO UPDATE SET country=excluded.country,gender=excluded.gender,age_group=excluded.age_group,nickname=excluded.nickname,updated=excluded.updated').bind(user,profile.country,profile.gender,profile.ageGroup,profile.nickname,new Date().toISOString()),
  db.prepare('UPDATE comments SET name=? WHERE user=?').bind(profile.nickname,user)
 ]);
}

let nickReady:Promise<unknown>|undefined;
export function nicknameTables(db:D1Database){return nickReady??=(async()=>{await db.prepare('CREATE TABLE IF NOT EXISTS nickname_claims(name TEXT PRIMARY KEY,user TEXT NOT NULL UNIQUE)').run();const rows=await db.prepare("SELECT user,nickname FROM profiles WHERE nickname<>'' ORDER BY updated,user").all<{user:string;nickname:string}>();if(rows.results.length)await db.batch(rows.results.map(r=>db.prepare('INSERT OR IGNORE INTO nickname_claims(name,user) VALUES (?,?)').bind(nicknameKey(r.nickname),r.user)));})().catch(e=>{nickReady=undefined;throw e})}
export function nicknameConflict(e:unknown){return /nickname_claims|NOT NULL constraint failed.*user|UNIQUE constraint failed/i.test(String(e))}

import {regions,genders,ageGroups,type Profile} from './community';
export function parseProfile(input:Record<string,unknown>):Profile|null{
 const nickname=typeof input.nickname==='string'?input.nickname.trim():'';
 if(nickname.length<2||nickname.length>24||/[\u0000-\u001f\u007f]/.test(nickname)||/씨발|시발|개새끼|병신|좆|\bfuck\b|\bnigger\b/i.test(nickname))return null;
 if(!regions.some(r=>r[0]===input.country)||!genders.some(r=>r[0]===input.gender)||!ageGroups.some(r=>r[0]===input.ageGroup))return null;
 return {nickname,country:String(input.country),gender:String(input.gender),ageGroup:String(input.ageGroup)};
}
export async function saveProfile(db:D1Database,user:string,profile:Profile){
 await db.batch([
  db.prepare('INSERT INTO profiles (user,country,gender,age_group,nickname,updated) VALUES (?,?,?,?,?,?) ON CONFLICT(user) DO UPDATE SET country=excluded.country,gender=excluded.gender,age_group=excluded.age_group,nickname=excluded.nickname,updated=excluded.updated').bind(user,profile.country,profile.gender,profile.ageGroup,profile.nickname,new Date().toISOString()),
  db.prepare('UPDATE comments SET name=? WHERE user=?').bind(profile.nickname,user)
 ]);
}

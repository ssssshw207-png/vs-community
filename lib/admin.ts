import {env} from 'cloudflare:workers';
import {sessionUser,type GoogleUser} from './google-auth';
import {database} from '@/db';
export function isAdmin(user:GoogleUser|null){const email=(env as unknown as Record<string,string>).ADMIN_EMAIL;return Boolean(email&&user&&user.email.toLowerCase()===email.trim().toLowerCase())}
export async function adminUser(req:Request){const user=await sessionUser(req.headers.get('cookie'));return isAdmin(user)?user:null}
let ready:Promise<unknown>|undefined;
export function adminTables(){return ready??=(async()=>{const db=database();await db.batch([
 db.prepare('CREATE TABLE IF NOT EXISTS admin_hidden (comment TEXT PRIMARY KEY, updated TEXT NOT NULL)'),
 db.prepare('CREATE TABLE IF NOT EXISTS visit_days (day TEXT NOT NULL, visitor TEXT NOT NULL, views INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(day,visitor))'),
 db.prepare('CREATE TABLE IF NOT EXISTS scheduled_questions (day TEXT PRIMARY KEY, question TEXT NOT NULL, image TEXT NOT NULL)'),
 db.prepare('CREATE TABLE IF NOT EXISTS question_days (day TEXT PRIMARY KEY, question TEXT NOT NULL, image TEXT NOT NULL)')
 ]);})().catch(e=>{ready=undefined;throw e})}
export function calendarDay(now=new Date()){return new Date(now.getTime()+9*3600000).toISOString().slice(0,10)}

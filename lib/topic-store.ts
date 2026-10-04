import {bankTopicFor} from './topic-bank';
import {database} from '@/db';
import {adminTables} from './admin';
import {questionFor,questionIndexFor,type Question} from './questions';
export type StoredTopic={question:Question;image:string};
export function defaultTopic(day:string):StoredTopic{if(day>='2026-10-06'){const item=bankTopicFor(day);return {question:item.question,image:item.image}}return {question:questionFor(day),image:`/images/topic-${questionIndexFor(day)}.webp`}}
export async function topicFor(day:string):Promise<StoredTopic>{
 await adminTables();const db=database();let saved=await db.prepare('SELECT question,image FROM question_days WHERE day=?').bind(day).first<{question:string;image:string}>();
 if(!saved){const plan=await db.prepare('SELECT question,image FROM scheduled_questions WHERE day=?').bind(day).first<{question:string;image:string}>();const fallback=defaultTopic(day);await db.prepare('INSERT INTO question_days(day,question,image) VALUES (?,?,?) ON CONFLICT(day) DO NOTHING').bind(day,plan?.question||JSON.stringify(fallback.question),plan?.image||fallback.image).run();saved=await db.prepare('SELECT question,image FROM question_days WHERE day=?').bind(day).first<{question:string;image:string}>()}
 if(!saved)throw Error('Topic unavailable');return {question:JSON.parse(saved.question),image:saved.image};
}
export async function questionsForDays(days:string[]){await adminTables();const unique=[...new Set(days)];const result:Record<string,Question>={};for(const day of unique)result[day]=defaultTopic(day).question;if(unique.length){const rows=await database().prepare(`SELECT day,question FROM question_days WHERE day IN (${unique.map(()=>'?').join(',')})`).bind(...unique).all<{day:string;question:string}>();for(const row of rows.results)result[row.day]=JSON.parse(row.question)}return result}
export function validDay(value:unknown):value is string{return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value}
export function parseQuestion(value:unknown):Question|null{
 if(!value||typeof value!=='object')return null;const q=value as Record<string,unknown>;const pair=(v:unknown,max:number)=>Array.isArray(v)&&v.length===2&&v.every(x=>typeof x==='string'&&x.trim().length>0&&x.length<=max);const grid=(v:unknown,max:number)=>Array.isArray(v)&&v.length===2&&v.every(x=>pair(x,max));
 if(!pair(q.tag,100)||!pair(q.title,400)||!grid(q.options,150)||!grid(q.sub,200)||!pair(q.story,3000)||!grid(q.arguments,1500)||!pair(q.knowledge,1500)||!pair(q.prompt,400)||!grid(q.insight,1000))return null;
 return Object.fromEntries(['tag','title','options','sub','story','arguments','knowledge','prompt','insight'].map(key=>[key,q[key]])) as Question;
}

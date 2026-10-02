import { database } from '@/db';
import { currentDay } from '@/lib/questions';
import { memberKey } from '@/lib/member';
export const dynamic='force-dynamic';
const PAGE_SIZE=10;
function respond(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store'}})}
export async function GET(req:Request){try{
 const user=memberKey(req);
 if(!user)return respond({error:'로그인 후 참여해 주세요. / Please sign in.'},401);
 const url=new URL(req.url),day=currentDay(),side=url.searchParams.get('side')||'0',parent=url.searchParams.get('parent');
 if(url.searchParams.get('day')!==day)return respond({error:'새 질문이 열렸습니다. 새로고침해 주세요. / Please refresh for the new question.'},409);
 if(!['0','1'].includes(side))return respond({error:'Invalid choice'},400);
 const db=database();
 const own=await db.prepare('SELECT choice FROM votes WHERE user=? AND day=?').bind(user,day).first();
 if(!own)return respond({error:'먼저 투표해 주세요. / Vote first.'},403);
 const visible=`NOT EXISTS(SELECT 1 FROM reactions r WHERE r.comment=c.id AND r.user=? AND r.kind='report') AND (SELECT COUNT(*) FROM reactions r WHERE r.comment=c.id AND r.kind='report')<3`;
 if(parent){const root=await db.prepare(`SELECT c.id FROM comments c WHERE c.id=? AND c.day=? AND c.parent IS NULL AND ${visible}`).bind(parent,day,user).first();if(!root)return respond({error:'댓글을 찾을 수 없습니다. / Comment unavailable.'},404)}
 let after:{created:string;id:string}|null=null;const cursor=url.searchParams.get('cursor');
 if(cursor){try{after=JSON.parse(atob(cursor));if(!after||typeof after.id!=='string'||typeof after.created!=='string'||after.id.length>60||!Number.isFinite(Date.parse(after.created)))throw Error('cursor')}catch{return respond({error:'Invalid cursor'},400)}}
 // All pages are free in this version. Future entitlement checks belong here,
 // before loading additional records; hidden comments are never bundled in the UI.
 const query=`SELECT c.id,c.day,c.choice,c.country,c.name,c.body,c.parent,c.created,
 (SELECT COUNT(*) FROM reactions r WHERE r.comment=c.id AND r.kind='like') AS likes,
 (SELECT COUNT(*) FROM reactions r WHERE r.comment=c.id AND r.kind='persuaded') AS persuaded,
 EXISTS(SELECT 1 FROM reactions r WHERE r.comment=c.id AND r.user=? AND r.kind='like') AS liked,
 EXISTS(SELECT 1 FROM reactions r WHERE r.comment=c.id AND r.user=? AND r.kind='persuaded') AS convinced,
 c.user=? AS mine,
 (SELECT COUNT(*) FROM comments child WHERE child.parent=c.id AND NOT EXISTS(SELECT 1 FROM reactions r WHERE r.comment=child.id AND r.user=? AND r.kind='report') AND (SELECT COUNT(*) FROM reactions r WHERE r.comment=child.id AND r.kind='report')<3) AS replyCount
 FROM comments c WHERE c.day=? AND ${parent?'c.parent=?':'c.parent IS NULL AND c.choice=?'} AND ${visible}
 ${after?'AND (c.created<? OR (c.created=? AND c.id<?))':''}
 ORDER BY c.created DESC,c.id DESC LIMIT ?`;
 const args:unknown[]=[user,user,user,user,day,parent||Number(side),user];if(after)args.push(after.created,after.created,after.id);args.push(PAGE_SIZE+1);
 const rows=(await db.prepare(query).bind(...args).all<{id:string;created:string}>()).results;
 const hasMore=rows.length>PAGE_SIZE,items=rows.slice(0,PAGE_SIZE),last=items[items.length-1];
 return respond({items,nextCursor:hasMore?btoa(JSON.stringify({created:last.created,id:last.id})):null,pageSize:PAGE_SIZE});
 }catch(e){console.error('comment page failed',e);return respond({error:'댓글을 불러오지 못했습니다. 다시 시도해 주세요. / Could not load comments. Try again.'},503)}}

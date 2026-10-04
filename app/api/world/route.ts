import {topicFor,questionsForDays} from '@/lib/topic-store';
import {nicknameError} from '@/lib/nickname';
import { database } from '@/db';
import { memberKey } from '@/lib/member';
import { parseProfile,saveProfile,nicknameConflict } from '@/lib/profile';
import { currentDay } from '@/lib/questions';
export const dynamic='force-dynamic';
const countries=['KR','US','JP','GB','DE','FR','CA','BR','IN','AU','TH','OTHER'];
async function identity(req:Request){return {id:(await memberKey(req))||'anonymous',cookie:''}}
function answer(value:unknown,cookie='',status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}})}
async function payload(user:string){const db=database(),day=currentDay();const [profile,own,totals,regions,history]=await Promise.all([
 db.prepare('SELECT country,gender,age_group AS ageGroup,nickname FROM profiles WHERE user=?').bind(user).first(),
 db.prepare('SELECT choice,country,reflection FROM votes WHERE user=? AND day=?').bind(user,day).first(),
 db.prepare('SELECT choice,COUNT(*) AS n FROM votes WHERE day=? GROUP BY choice').bind(day).all(),
 db.prepare('SELECT country,choice,COUNT(*) AS n FROM votes WHERE day=? GROUP BY country,choice').bind(day).all(),
 db.prepare('SELECT day,choice,country,reflection FROM votes WHERE user=? ORDER BY day DESC LIMIT 100').bind(user).all(),

]);const topic=await topicFor(day),historyQuestions=await questionsForDays(history.results.map(v=>String((v as {day:string}).day)));return {profile,day,question:topic.question,image:topic.image,historyQuestions,own,totals:totals.results,regions:regions.results,history:history.results}}
export async function GET(req:Request){const who=await identity(req);try{return answer(await payload(who.id),who.cookie)}catch(e){console.error('world read failed',e);return answer({error:'잠시 데이터를 불러올 수 없습니다. 다시 시도해 주세요. / Please try again.'},who.cookie,503)}}
export async function POST(req:Request){const user=await memberKey(req);if(!user)return answer({error:'로그인 후 참여해 주세요. / Please sign in to participate.'},'',401);const who={id:user,cookie:''};try{
 const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)return answer({error:'Request origin rejected'},who.cookie,403);
 if(Number(req.headers.get('content-length')||0)>10000)return answer({error:'Request too large'},who.cookie,413);
 const body=await req.json() as Record<string,unknown>,db=database(),day=currentDay();
 await topicFor(day);
 if(body.day!==day)return answer({error:'새 질문이 열렸습니다. 새로고침해 주세요. / A new question is ready. Refresh.'},who.cookie,409);
 if(body.action==='profile'){
 const invalid=nicknameError(body.nickname);if(invalid)return answer({error:invalid},'',400);const profile=parseProfile(body);if(!profile)return answer({error:'닉네임은 2–24자로, 성별·나이대·나라는 목록에서 선택해 주세요. / Use a 2–24 character nickname and select your profile details.'},who.cookie,400);
 await saveProfile(db,who.id,profile);
 }else if(body.action==='vote'){
 const profile=await db.prepare('SELECT nickname FROM profiles WHERE user=?').bind(who.id).first<{nickname:string}>();if(!profile?.nickname)return answer({error:'먼저 내 정보를 등록해 주세요. / Complete your profile first.'},'',403);
 if((body.choice!==0&&body.choice!==1)||!countries.includes(String(body.country)))return answer({error:'Please choose an option and region'},who.cookie,400);
 await db.prepare('INSERT INTO votes (user,day,choice,country,created) VALUES (?,?,?,?,?) ON CONFLICT(user,day) DO NOTHING').bind(who.id,day,body.choice,body.country,new Date().toISOString()).run();
 }else{
 const vote=await db.prepare('SELECT choice,country FROM votes WHERE user=? AND day=?').bind(who.id,day).first<{choice:number,country:string}>();
 if(!vote)return answer({error:'먼저 투표해 주세요. / Vote first.'},who.cookie,403);
 if(body.action==='comment'){
 const profile=await db.prepare('SELECT nickname FROM profiles WHERE user=?').bind(who.id).first<{nickname:string}>();
 const text=String(body.body||'').trim(),name=profile?.nickname||'';
 if(text.length<3||text.length>600||name.length<1||name.length>24)return answer({error:'닉네임 1–24자, 의견 3–600자로 작성해 주세요. / Check the length of your name and comment.'},who.cookie,400);
 if(/씨발|시발|개새끼|병신|좆|\bfuck\b|\bnigger\b/i.test(text))return answer({error:'서로 존중하는 표현으로 바꿔 주세요. / Please use respectful language.'},who.cookie,400);
 const recent=await db.prepare('SELECT COUNT(*) AS n FROM comments WHERE user=? AND created>?').bind(who.id,new Date(Date.now()-60000).toISOString()).first<{n:number}>();if((recent?.n||0)>=3)return answer({error:'잠시 후 다시 작성해 주세요. / Please wait before posting again.'},who.cookie,429);
 let parent:null|string=null;if(body.parent){const p=await db.prepare('SELECT id FROM comments WHERE id=? AND day=? AND parent IS NULL AND NOT EXISTS(SELECT 1 FROM admin_hidden h WHERE h.comment=comments.id OR h.comment=comments.parent) AND NOT EXISTS(SELECT 1 FROM reactions r WHERE r.comment=comments.id AND r.user=? AND r.kind=\'report\') AND (SELECT COUNT(*) FROM reactions r WHERE r.comment=comments.id AND r.kind=\'report\')<3').bind(String(body.parent),day,who.id).first<{id:string}>();if(!p)return answer({error:'Comment no longer available'},who.cookie,404);parent=p.id}
 await db.prepare('INSERT INTO comments (id,user,day,choice,country,name,body,parent,created) VALUES (?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),who.id,day,vote.choice,vote.country,name,text,parent,new Date().toISOString()).run();
 }else if(body.action==='reflection'){
 if(!['same','unsure','changed'].includes(String(body.value)))return answer({error:'Invalid reflection'},who.cookie,400);
 await db.prepare('UPDATE votes SET reflection=? WHERE user=? AND day=?').bind(body.value,who.id,day).run();
 }else if(body.action==='reaction'){
 const kind=String(body.kind);if(!['like','persuaded','report'].includes(kind))return answer({error:'Invalid reaction'},who.cookie,400);
 const comment=await db.prepare('SELECT user,choice FROM comments WHERE id=? AND day=? AND NOT EXISTS(SELECT 1 FROM admin_hidden h WHERE h.comment=comments.id OR h.comment=comments.parent)').bind(String(body.comment),day).first<{user:string,choice:number}>();if(!comment)return answer({error:'Comment not found'},who.cookie,404);
 if(kind==='persuaded'&&(comment.user===who.id||comment.choice===vote.choice))return answer({error:'반대 선택의 의견에만 표시할 수 있어요. / Use this on an opposing view.'},who.cookie,400);
 const existing=await db.prepare('SELECT kind FROM reactions WHERE user=? AND comment=? AND kind=?').bind(who.id,body.comment,kind).first();
 if(existing&&kind!=='report')await db.prepare('DELETE FROM reactions WHERE user=? AND comment=? AND kind=?').bind(who.id,body.comment,kind).run();
 else await db.prepare('INSERT INTO reactions (user,comment,kind) VALUES (?,?,?) ON CONFLICT DO NOTHING').bind(who.id,body.comment,kind).run();
 }else return answer({error:'Unknown action'},who.cookie,400);
 }
 return answer(await payload(who.id),who.cookie);
 }catch(e){if(nicknameConflict(e))return answer({error:'이미 사용 중인 닉네임입니다. 다른 이름을 선택해 주세요.'},'',409);console.error('world write failed',e);return answer({error:'저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해 주세요. / Could not save. Please try again.'},who.cookie,503)}}

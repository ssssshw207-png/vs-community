import {database} from '@/db';
import {memberKey} from '@/lib/member';
import {parseProfile,saveProfile} from '@/lib/profile';
export const dynamic='force-dynamic';
function response(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store'}})}
function originAllowed(req:Request){return req.headers.get('origin')===new URL(req.url).origin}
export async function GET(req:Request){
 const user=memberKey(req);if(!user)return response({error:'로그인이 필요합니다. / Sign in required.'},401);
 try{const db=database(),cursor=new URL(req.url).searchParams.get('cursor');let after:{created:string;id:string}|null=null;
 if(cursor){try{after=JSON.parse(atob(cursor));if(!after||typeof after.id!=='string'||after.id.length>60||typeof after.created!=='string'||!Number.isFinite(Date.parse(after.created)))throw Error()}catch{return response({error:'Invalid cursor'},400)}}
 const commentsQuery=db.prepare(`SELECT id,day,choice,country,name,body,parent,created FROM comments WHERE user=? ${after?'AND (created<? OR (created=? AND id<?))':''} ORDER BY created DESC,id DESC LIMIT 21`);
 const args:unknown[]=[user];if(after)args.push(after.created,after.created,after.id);
 const [profile,history,rows,stats]=await Promise.all([
 db.prepare('SELECT country,gender,age_group AS ageGroup,nickname FROM profiles WHERE user=?').bind(user).first(),
 db.prepare('SELECT day,choice,country,reflection FROM votes WHERE user=? ORDER BY day DESC LIMIT 100').bind(user).all(),
 commentsQuery.bind(...args).all<{id:string;created:string}>(),
 db.prepare('SELECT (SELECT COUNT(*) FROM votes WHERE user=?) AS votes,(SELECT COUNT(*) FROM comments WHERE user=?) AS comments').bind(user,user).first()
 ]);
 const comments=rows.results.slice(0,20),last=comments[comments.length-1];
 return response({profile,history:history.results,comments,stats,nextCursor:rows.results.length>20?btoa(JSON.stringify({created:last.created,id:last.id})):null});
 }catch(e){console.error('account read failed',e);return response({error:'내 정보를 불러오지 못했습니다. 다시 시도해 주세요. / Could not load your account.'},503)}
}
export async function POST(req:Request){
 const user=memberKey(req);if(!user)return response({error:'로그인이 필요합니다. / Sign in required.'},401);
 if(!originAllowed(req))return response({error:'Request origin rejected'},403);
 if(Number(req.headers.get('content-length')||0)>10000)return response({error:'Request too large'},413);
 try{const profile=parseProfile(await req.json() as Record<string,unknown>);if(!profile)return response({error:'닉네임은 2–24자로, 나머지 항목은 목록에서 선택해 주세요. / Check your nickname and profile details.'},400);
 await saveProfile(database(),user,profile);return response({profile});
 }catch(e){console.error('account update failed',e);return response({error:'저장하지 못했습니다. 다시 시도해 주세요. / Could not save your profile.'},503)}
}
export async function DELETE(req:Request){
 const user=memberKey(req);if(!user)return response({error:'로그인이 필요합니다. / Sign in required.'},401);
 if(!originAllowed(req))return response({error:'Request origin rejected'},403);
 if(Number(req.headers.get('content-length')||0)>1000)return response({error:'Request too large'},413);
 try{const body=await req.json() as Record<string,unknown>;if(body.confirm!=='DELETE_COMMUNITY_ACCOUNT')return response({error:'탈퇴 확인이 필요합니다. / Confirm account deletion.'},400);
 const db=database();await db.batch([
 db.prepare('DELETE FROM reactions WHERE user=?').bind(user),
 // Preserve other members’ replies, but erase this member’s comment text and identity.
 db.prepare("UPDATE comments SET user=?,name='탈퇴한 회원',body='[삭제된 댓글]',country='OTHER' WHERE user=?").bind('deleted:'+crypto.randomUUID(),user),
 db.prepare('DELETE FROM votes WHERE user=?').bind(user),
 db.prepare('DELETE FROM profiles WHERE user=?').bind(user)
 ]);return response({deleted:true});
 }catch(e){console.error('account deletion failed',e);return response({error:'탈퇴하지 못했습니다. 다시 시도해 주세요. / Could not delete your community account.'},503)}
}

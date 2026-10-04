import {database} from '@/db';
import {adminTables,calendarDay} from '@/lib/admin';
export async function POST(req:Request){
 const headers={'Cache-Control':'no-store'};if(req.headers.get('origin')!==new URL(req.url).origin)return new Response(null,{status:403,headers});if(/bot|crawler|spider|headless/i.test(req.headers.get('user-agent')||''))return new Response(null,{status:204,headers});
 try{await adminTables();const prior=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-community-visitor='))?.split('=')[1];const validPrior=!!prior&&/^[a-f0-9-]{36}$/.test(prior);const visitor=validPrior?prior!:crypto.randomUUID();const day=calendarDay();const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(day+':'+visitor));const hash=Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('');const db=database();await db.batch([
 db.prepare('INSERT INTO visit_days(day,visitor,views) VALUES (?,?,1) ON CONFLICT(day,visitor) DO UPDATE SET views=views+1').bind(day,hash),
 db.prepare('DELETE FROM visit_days WHERE day<?').bind(calendarDay(new Date(Date.now()-90*86400000)))
 ]);return new Response(null,{status:204,headers:{...headers,...(!validPrior?{'Set-Cookie':`__Host-community-visitor=${visitor}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`}:{})}})
 }catch{return new Response(null,{status:503,headers})}
}

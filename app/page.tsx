import VisitTracker from './visit-tracker';
import {isAdmin} from '@/lib/admin';
import World from './world';
import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Home(){const user=await getChatGPTUser();return <><VisitTracker/>{isAdmin(user)&&<a href="/admin" style={{position:"fixed",bottom:16,right:16,zIndex:100,padding:"10px 16px",borderRadius:24,background:"#ffd35c",color:"#161b26"}}>관리자</a>}<World member={user?{email:user.email,name:user.displayName}:null} signInUrl={chatGPTSignInPath('/')} signOutUrl={chatGPTSignOutPath('/')}/></>}

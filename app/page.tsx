import World from './world';
import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Home(){const user=await getChatGPTUser();return <World member={user?{email:user.email,name:user.displayName}:null} signInUrl={chatGPTSignInPath('/')} signOutUrl={chatGPTSignOutPath('/')}/>}

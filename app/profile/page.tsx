import {requireChatGPTUser,chatGPTSignOutPath} from '../chatgpt-auth';
import Account from './account';
export const dynamic='force-dynamic';
export default function ProfilePage(){return <SignedInAccount/>}
async function SignedInAccount(){const user=await requireChatGPTUser('/profile');return <Account member={{email:user.email,name:user.displayName}} signOutUrl={chatGPTSignOutPath('/')}/>}

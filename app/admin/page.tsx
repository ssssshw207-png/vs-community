import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from '../chatgpt-auth';
import {isAdmin} from '@/lib/admin';
import Dashboard from './dashboard';
export const dynamic='force-dynamic';
export const metadata={title:'관리자 · 커뮤니티',robots:{index:false,follow:false}};
export default async function Admin(){const user=await getChatGPTUser();if(!user||!isAdmin(user))return <main style={{maxWidth:600,margin:'80px auto',padding:24}}><h1>관리자 전용 화면</h1><p>{user?'이 계정에는 관리자 권한이 없습니다.':'관리자 구글 계정으로 로그인해 주세요.'}</p><a href={user?chatGPTSignOutPath('/admin'):chatGPTSignInPath('/admin')}>{user?'로그아웃하고 계정 바꾸기':'구글로 로그인'}</a><p><a href="/">커뮤니티로 돌아가기</a></p></main>;return <Dashboard email={user.email}/>}

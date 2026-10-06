import InstallNotifications from './install-notifications';
import type { Metadata,Viewport } from 'next';
import './globals.css';
import './community-theme.css';
export const metadata: Metadata={title:'커뮤니티 — 같은 질문, 다른 선택',description:'사람들이 모여 의견을 나누는 커뮤니티. 하나의 질문에 답하고, 서로 다른 선택의 이유를 만나보세요.',verification:{other:{'naver-site-verification':'67e899628c3b7d99c3b348ab397fa2154bd21f09'}},manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'커뮤니티',statusBarStyle:'black-translucent'},icons:{icon:'/favicon.svg',apple:'/icons/community-180.png'},openGraph:{title:'커뮤니티 — 같은 질문, 다른 선택',description:'오늘 당신은 어느 쪽인가요? 전 세계와 당신의 선택을 비교해 보세요.',type:'website'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#121722'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="ko"><body><InstallNotifications/>{children}<footer style={{textAlign:"center",padding:"24px",fontSize:13}}><a href="/privacy">개인정보처리방침</a><span> · </span><a href="mailto:ssssshw207@gmail.com">문의</a></footer></body></html>}

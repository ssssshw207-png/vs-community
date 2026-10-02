import type { Metadata } from 'next';
import './globals.css';
import './community-theme.css';
export const metadata: Metadata={title:'커뮤니티 · 서로 다른 생각이 모이는 곳',description:'사람들이 모여 의견을 나누는 커뮤니티. 하나의 질문에 답하고, 서로 다른 선택의 이유를 만나보세요.',icons:{icon:'/favicon.svg'},openGraph:{title:'커뮤니티 · 하나의 질문, 수많은 생각',description:'오늘 당신은 어느 쪽인가요? 전 세계와 당신의 선택을 비교해 보세요.',type:'website'}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="ko"><body>{children}<footer style={{textAlign:"center",padding:"24px",fontSize:13}}><a href="/privacy">개인정보처리방침</a><span> · </span><a href="mailto:ssssshw207@gmail.com">문의</a></footer></body></html>}

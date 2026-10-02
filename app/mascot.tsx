export default function Mascot({side=0,badge=false,className=''}:{side?:number;badge?:boolean;className?:string}){
 return <span className={`people-icon person-side${side} ${className}`}><img src="/images/mascot.webp" width={256} height={256} alt="" decoding="async"/>{badge&&<span className="person-badge">{side===0?'A':'B'}</span>}</span>
}

'use client';
import { useEffect, useState } from 'react';
import { Globe2, RefreshCw, UsersRound } from 'lucide-react';
import { regions, genders, ageGroups, type Profile } from '@/lib/community';
import type { Lang } from '@/lib/questions';
import type { Member } from '@/lib/member';
type Props={member:Member|null;signInUrl:string;signOutUrl:string;lang:Lang;setLang:(l:Lang)=>void;profile:Profile|null;loading:boolean;busy:boolean;error:string;onRetry:()=>void;onEnter:(profile:Profile)=>Promise<void>};
export default function Entrance({member,signInUrl,signOutUrl,lang,setLang,profile,loading,busy,error,onRetry,onEnter}:Props){
 const [gender,setGender]=useState(''),[ageGroup,setAgeGroup]=useState(''),[country,setCountry]=useState(''),[nickname,setNickname]=useState(''),[imageFailed,setImageFailed]=useState(false);
 const i=lang==='ko'?0:1,t=(ko:string,en:string)=>i===0?ko:en;
 useEffect(()=>{if(profile){setGender(profile.gender);setAgeGroup(profile.ageGroup);setCountry(profile.country);setNickname(profile.nickname||'')}},[profile?.gender,profile?.ageGroup,profile?.country,profile?.nickname]);
 return <div className={'entrance entrance-static intro-ready '+(imageFailed?'image-unavailable':'')}>
  <div className="entrance-scene" aria-hidden="true">
   <div className="scene-camera"><img className="scene-base" src="/images/community-path.webp" width={941} height={1672} fetchPriority="high" decoding="async" alt="" onError={()=>setImageFailed(true)}/>
   <div className="you-character"><img src="/images/community-you.webp" width={2172} height={724} decoding="async" alt=""/></div></div>
   <div className="scene-bottom-shade"/>
  </div>
  <div className="entrance-top"><a className="entry-wordmark" href="/">COMMUNITY<span>●</span></a><button className="entry-language" onClick={()=>setLang(lang==='ko'?'en':'ko')}><Globe2 size={16}/>{lang==='ko'?'EN':'한국어'}</button></div>
  <div className="entrance-content"><div className="entry-title"><span className="entry-kicker">ONE QUESTION. MANY VOICES.</span><h1>{t('커뮤니티','COMMUNITY')}</h1><p>{t('같은 질문, 서로 다른 생각.','One question. Different perspectives.')}</p></div>
  {member?<form className="entry-form" onSubmit={async e=>{e.preventDefault();if(gender&&ageGroup&&country&&nickname.trim().length>=2)await onEnter({gender,ageGroup,country,nickname})}}>
   <div className="entry-form-intro"><UsersRound size={18}/><span>{t('당신의 이야기도 들려주세요.','Your perspective belongs here.')}</span></div>
   <div className="entry-account"><span>{member.email}</span><a href={signOutUrl} target="_top">{t('다른 계정으로','Switch account')}</a></div>
   <label className="entry-nickname">{t('닉네임','Nickname')}<input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder={t('댓글에 표시할 이름','Your public display name')} minLength={2} maxLength={24} autoComplete="nickname" required/></label>
   <fieldset className="gender-field"><legend>{t('성별','Gender')}</legend><div>{genders.map(r=><button key={r[0]} type="button" aria-pressed={gender===r[0]} className={gender===r[0]?'selected':''} onClick={()=>setGender(r[0])}>{r[i+1]}</button>)}</div></fieldset>
   <div className="entry-selects"><label>{t('나이대','Age group')}<select value={ageGroup} onChange={e=>setAgeGroup(e.target.value)} required><option value="" disabled>{t('나이대 선택','Choose age group')}</option>{ageGroups.map(r=><option value={r[0]} key={r[0]}>{r[i+1]}</option>)}</select></label><label>{t('나라 / 지역','Country / region')}<select value={country} onChange={e=>setCountry(e.target.value)} required><option value="" disabled>{t('나라 선택','Choose country')}</option>{regions.map(r=><option value={r[0]} key={r[0]}>{r[1]} {r[i+2]}</option>)}</select></label></div>
   {error&&<div className="entry-error" role="alert">{error}{loading&&<button type="button" onClick={onRetry}><RefreshCw size={14}/>{t('다시 시도','Try again')}</button>}</div>}
   <button className="entry-submit" disabled={busy||loading||!gender||!ageGroup||!country||nickname.trim().length<2}>{busy?t('정보 저장 중…','Saving…'):loading?t('불러오는 중…','Loading…'):t('커뮤니티 참여하기','Join the community')}</button>
   <p className="entry-privacy">{t('닉네임과 지역은 댓글에 표시됩니다. 나이대·성별·이메일은 공개되지 않아요.','Your nickname and region are public. Age group, gender and email stay private.')}</p>
  </form>:<div className="entry-form entry-signin"><UsersRound size={25}/><h2>{t('당신의 선택을 이어가세요.','Keep your choices with you.')}</h2><p>{t('로그인하면 다른 기기에서도 내 정보와 지난 선택을 볼 수 있어요.','Sign in to access your profile and choices on any device.')}</p><a className="entry-submit" href={signInUrl} target="_top">{t('구글로 가입·로그인','Sign up / sign in with Google')}</a><p className="entry-privacy">{t('첫 로그인 후 커뮤니티 닉네임과 기본 정보를 등록합니다.','Set up your community nickname and profile after your first sign-in.')}</p></div>}
  </div>
  <div className="entrance-bottom"><span>{t('하루 하나의 질문으로 연결되는 우리.','One daily question brings us together.')}</span></div>
 </div>
}

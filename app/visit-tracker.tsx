'use client';
import {useEffect,useRef} from 'react';
export default function VisitTracker(){const sent=useRef(false);useEffect(()=>{if(sent.current)return;sent.current=true;fetch('/api/visit',{method:'POST',credentials:'same-origin',keepalive:true}).catch(()=>{})},[]);return null}

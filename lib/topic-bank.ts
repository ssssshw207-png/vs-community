import records from './topic-bank.json';
import lifeRecords from './topic-life.json';
import previousRecords from './topic-bank-v1.json';
import legacyRecords from './topic-editorial-legacy.json';
import type {Question} from './questions';
const octoberBank=records as {id:string;question:Question;image:string}[];
export const topicBank=lifeRecords as {id:string;question:Question;image:string}[];
export const topicImages=[...records,...previousRecords,...lifeRecords].map(t=>t.image);
const previousBank=previousRecords as {id:string;question:Question;image:string}[];
export const LIFE_START_DAY='2026-10-14';
function indexFor(day:string,start:string,length:number){
 const delta=Math.floor((Date.parse(day+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000);
 return ((delta%length)+length)%length;
}
export function bankIndexFor(day:string){return indexFor(day,LIFE_START_DAY,topicBank.length)}
export function bankTopicFor(day:string){
 if(day<'2026-10-07')return previousBank[indexFor(day,'2026-10-06',previousBank.length)];
 if(day<LIFE_START_DAY)return octoberBank[indexFor(day,'2026-10-07',octoberBank.length)];
 return topicBank[bankIndexFor(day)];
}

// Published titles and choices remain frozen. Only untouched first-edition
// editorial fields receive the new explanations; administrator edits win.
export function refreshEditorial(question:Question,image:string):Question{
 const old=legacyRecords.find(item=>item.image===image);
 const revised=previousBank.find(item=>item.image===image)?.question;
 if(!old||!revised||JSON.stringify(question.title)!==JSON.stringify(old.title)||JSON.stringify(question.options)!==JSON.stringify(old.options))return question;
 const result={...question};
 for(const key of ['story','knowledge','arguments','prompt','sub'] as const){
  if(JSON.stringify(question[key])===JSON.stringify(old[key])){
   if(key==='arguments'||key==='sub')result[key]=revised[key];
   else result[key]=revised[key];
  }
 }
 return result;
}

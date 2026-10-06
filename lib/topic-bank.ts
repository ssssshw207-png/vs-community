import records from './topic-bank.json';
import legacyRecords from './topic-editorial-legacy.json';
import type {Question} from './questions';
export const topicBank=records as {id:string;question:Question;image:string}[];
export function bankIndexFor(day:string){return ((Math.floor(Date.parse(day+'T00:00:00Z')/86400000)-Math.floor(Date.parse('2026-10-06T00:00:00Z')/86400000))%topicBank.length+topicBank.length)%topicBank.length}
export function bankTopicFor(day:string){return topicBank[bankIndexFor(day)]}

// Published titles and choices remain frozen. Only untouched first-edition
// editorial fields receive the new explanations; administrator edits win.
export function refreshEditorial(question:Question,image:string):Question{
 const old=legacyRecords.find(item=>item.image===image);
 const revised=topicBank.find(item=>item.image===image)?.question;
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

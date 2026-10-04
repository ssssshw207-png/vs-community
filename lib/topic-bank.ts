import records from './topic-bank.json';
import type {Question} from './questions';
export const topicBank=records as {id:string;question:Question;image:string}[];
export function bankIndexFor(day:string){return ((Math.floor(Date.parse(day+'T00:00:00Z')/86400000)-Math.floor(Date.parse('2026-10-06T00:00:00Z')/86400000))%topicBank.length+topicBank.length)%topicBank.length}
export function bankTopicFor(day:string){return topicBank[bankIndexFor(day)]}

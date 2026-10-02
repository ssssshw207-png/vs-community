import {questionIndexFor} from '@/lib/questions';
export default function QuestionMood({day}:{day:string}){
 return <div className="question-mood" aria-hidden="true"><img src={`/images/topic-${questionIndexFor(day)}.webp`} width={1024} height={512} alt="" decoding="async"/></div>
}

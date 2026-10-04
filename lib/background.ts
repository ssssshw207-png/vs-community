import {AsyncLocalStorage} from 'node:async_hooks';
const context=new AsyncLocalStorage<{waitUntil(promise:Promise<unknown>):void}>();
export function runWithBackground<T>(ctx:{waitUntil(promise:Promise<unknown>):void},fn:()=>T):T{return context.run(ctx,fn)}
export function defer(task:Promise<unknown>){const caught=task.catch(()=>{});const ctx=context.getStore();if(ctx)ctx.waitUntil(caught);return caught}

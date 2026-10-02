import {sessionUser} from './google-auth';
export type Member={email:string;name:string};
export async function memberKey(req:Request){const user=await sessionUser(req.headers.get('cookie'));return user?'auth:'+user.userId:null}

export type Member={email:string;name:string};
// These headers are supplied by Sites dispatch after verifying the browser session.
// A cookie or a user ID in the request body never establishes a member identity.
export function memberKey(req:Request){
 const id=req.headers.get('oai-authenticated-user-id'),email=req.headers.get('oai-authenticated-user-email');
 return id&&email?'auth:'+id:null;
}

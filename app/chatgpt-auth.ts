import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {sessionUser,safeReturn,type GoogleUser} from '@/lib/google-auth';
// Preserve existing imports while authentication now uses Google sessions.
export type ChatGPTUser=GoogleUser;
export async function getChatGPTUser(){return sessionUser((await headers()).get('cookie'))}
export async function requireChatGPTUser(returnTo:string):Promise<GoogleUser>{const user=await getChatGPTUser();if(user)return user;redirect(chatGPTSignInPath(returnTo))}
export function chatGPTSignInPath(returnTo:string){return '/api/auth/google/login?return_to='+encodeURIComponent(safeReturn(returnTo))}
export function chatGPTSignOutPath(returnTo='/'){return '/api/auth/google/logout?return_to='+encodeURIComponent(safeReturn(returnTo))}

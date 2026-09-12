import { NextResponse,type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { api,ApiError,SESSION_COOKIE,messageFor } from "../../../../lib/api";
export async function POST(req:NextRequest,ctx:{params:Promise<{path:string[]}>}) {
  const target=(await ctx.params).path.join("/");
  if(target!=="events/account-branding"&&!/^events(?:\/[0-9a-f-]{36}\/(?:edit|publish|cancel|sync-attendance|sync-invitations|reconcile|remote-content|member-group|invite-speaker))?$/.test(target)&&!/^events\/diaspora\/[0-9a-f-]{36}\/decision$/.test(target)) return NextResponse.json({ok:false,message:"Action inconnue"},{status:404});
  const token=(await cookies()).get(SESSION_COOKIE)?.value;
  if(!token) return NextResponse.json({ok:false,message:"Connexion requise"},{status:401});
  try { const body=await req.json(); const result=await api<Record<string,unknown>>(`/${target}`,{method:"POST",token,body:JSON.stringify(body)}); return NextResponse.json({ok:true,...result}); }
  catch(error) { return NextResponse.json({ok:false,message:messageFor(error)},{status:error instanceof ApiError?error.status:502}); }
}

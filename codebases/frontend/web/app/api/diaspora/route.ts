import { NextResponse,type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { api,ApiError,SESSION_COOKIE,messageFor } from "../../../lib/api";
export async function POST(req:NextRequest){
  const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!token)return NextResponse.json({ok:false,message:"Connexion requise"},{status:401});
  try{const result=await api<Record<string,unknown>>("/events/diaspora/appointments",{method:"POST",token,body:JSON.stringify(await req.json())});return NextResponse.json({ok:true,...result});}
  catch(error){return NextResponse.json({ok:false,message:messageFor(error)},{status:error instanceof ApiError?error.status:502});}
}

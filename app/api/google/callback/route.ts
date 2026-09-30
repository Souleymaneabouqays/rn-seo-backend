import { NextRequest, NextResponse } from "next/server";
export const dynamic="force-dynamic";
function base(req:NextRequest){return process.env.GOOGLE_REDIRECT_BASE_URL?.replace(/\/$/,"") || req.nextUrl.origin}
export async function GET(req:NextRequest){
 const code=req.nextUrl.searchParams.get("code"),state=req.nextUrl.searchParams.get("state"),saved=req.cookies.get("gsc_oauth_state")?.value;
 if(!code||!state||!saved||state!==saved)return NextResponse.json({ok:false,error:"Validation OAuth invalide."},{status:400});
 const id=process.env.GOOGLE_CLIENT_ID,secret=process.env.GOOGLE_CLIENT_SECRET;
 if(!id||!secret)return NextResponse.json({ok:false,error:"Configuration OAuth incomplète."},{status:500});
 const tokenRes=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:id,client_secret:secret,redirect_uri:base(req)+"/api/google/callback",grant_type:"authorization_code"})});
 const token=await tokenRes.json();
 if(!tokenRes.ok)return NextResponse.json({ok:false,error:"Échange OAuth refusé.",detail:token},{status:502});
 const res=NextResponse.redirect(new URL("/?google=connected",req.url));
 if(token.refresh_token)res.cookies.set("gsc_refresh_token",token.refresh_token,{httpOnly:true,secure:true,sameSite:"lax",maxAge:31536000,path:"/"});
 res.cookies.delete("gsc_oauth_state");
 return res;
}
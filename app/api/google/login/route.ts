import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic="force-dynamic";

function base(req:NextRequest){return process.env.GOOGLE_REDIRECT_BASE_URL?.replace(/\/$/,"") || req.nextUrl.origin}

export async function GET(req:NextRequest){
 const id=process.env.GOOGLE_CLIENT_ID;
 if(!id)return NextResponse.json({ok:false,error:"GOOGLE_CLIENT_ID manquant"},{status:500});
 const state=crypto.randomBytes(24).toString("hex");
 const redirect=base(req)+"/api/google/callback";
 const u=new URL("https://accounts.google.com/o/oauth2/v2/auth");
 u.searchParams.set("client_id",id);
 u.searchParams.set("redirect_uri",redirect);
 u.searchParams.set("response_type","code");
 u.searchParams.set("scope","https://www.googleapis.com/auth/webmasters.readonly");
 u.searchParams.set("access_type","offline");
 u.searchParams.set("prompt","consent");
 u.searchParams.set("state",state);
 const res=NextResponse.redirect(u);
 res.cookies.set("gsc_oauth_state",state,{httpOnly:true,secure:true,sameSite:"lax",maxAge:600,path:"/"});
 return res;
}
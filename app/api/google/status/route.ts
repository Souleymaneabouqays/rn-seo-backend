import { NextRequest, NextResponse } from "next/server";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const refresh=req.cookies.get("gsc_refresh_token")?.value,id=process.env.GOOGLE_CLIENT_ID,secret=process.env.GOOGLE_CLIENT_SECRET;
 if(!refresh)return NextResponse.json({ok:false,connected:false});
 if(!id||!secret)return NextResponse.json({ok:false,connected:false,error:"Configuration OAuth incomplète."},{status:500});
 const tr=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:id,client_secret:secret,refresh_token:refresh,grant_type:"refresh_token"}),cache:"no-store"});
 const t=await tr.json(); if(!tr.ok)return NextResponse.json({ok:false,connected:false,error:"Jeton Google invalide."},{status:401});
 const sr=await fetch("https://www.googleapis.com/webmasters/v3/sites",{headers:{Authorization:"Bearer "+t.access_token},cache:"no-store"});
 const s=await sr.json(); if(!sr.ok)return NextResponse.json({ok:false,connected:false,error:"Lecture Search Console impossible."},{status:502});
 return NextResponse.json({ok:true,connected:true,sites:(s.siteEntry||[]).map((x:{siteUrl:string;permissionLevel:string})=>({siteUrl:x.siteUrl,permissionLevel:x.permissionLevel}))});
}
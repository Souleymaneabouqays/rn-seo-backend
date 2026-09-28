import { NextRequest, NextResponse } from "next/server";
export const dynamic="force-dynamic";

async function accessToken(req:NextRequest){
 const refresh=req.cookies.get("gsc_refresh_token")?.value;
 const id=process.env.GOOGLE_CLIENT_ID,secret=process.env.GOOGLE_CLIENT_SECRET;
 if(!refresh||!id||!secret) throw new Error("Search Console non connecté");
 const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:id,client_secret:secret,refresh_token:refresh,grant_type:"refresh_token"}),cache:"no-store"});
 const j=await r.json(); if(!r.ok) throw new Error("Impossible de renouveler l'accès Google");
 return j.access_token as string;
}
function iso(d:Date){return d.toISOString().slice(0,10)}
export async function GET(req:NextRequest){
 try{
  const token=await accessToken(req);
  const sitesRes=await fetch("https://www.googleapis.com/webmasters/v3/sites",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
  const sites=await sitesRes.json(); if(!sitesRes.ok) throw new Error("Impossible de lire les propriétés Search Console");
  const entries=(sites.siteEntry||[]) as {siteUrl:string;permissionLevel:string}[];
  const chosen=entries.find(s=>s.siteUrl.includes("rivieranuisibles.fr"))||entries[0];
  if(!chosen)return NextResponse.json({ok:false,error:"Aucune propriété Search Console accessible."},{status:404});
  const end=new Date(); end.setDate(end.getDate()-3);
  const start=new Date(end); start.setDate(start.getDate()-27);
  const endpoint="https://www.googleapis.com/webmasters/v3/sites/"+encodeURIComponent(chosen.siteUrl)+"/searchAnalytics/query";
  const query=async(dimensions:string[],rowLimit=1000)=>{
   const r=await fetch(endpoint,{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({startDate:iso(start),endDate:iso(end),dimensions,type:"web",rowLimit}),cache:"no-store"});
   const j=await r.json(); if(!r.ok) throw new Error(j?.error?.message||"Erreur Search Analytics"); return j.rows||[];
  };
  const [totals,queries,pages,queryPages]=await Promise.all([query([],1),query(["query"],250),query(["page"],250),query(["query","page"],25000)]);
  const t=totals[0]||{clicks:0,impressions:0,ctr:0,position:0};
  const map=new Map<string,{pages:Set<string>;clicks:number;impressions:number}>();
  for(const r of queryPages){const q=r.keys?.[0],p=r.keys?.[1];if(!q||!p)continue;const x=map.get(q)||{pages:new Set<string>(),clicks:0,impressions:0};x.pages.add(p);x.clicks+=r.clicks||0;x.impressions+=r.impressions||0;map.set(q,x)}
  const cannibalization=[...map.entries()].filter(([,v])=>v.pages.size>1).map(([query,v])=>({query,pages:[...v.pages],pageCount:v.pages.size,clicks:v.clicks,impressions:v.impressions})).sort((a,b)=>b.impressions-a.impressions).slice(0,100);
  return NextResponse.json({ok:true,property:chosen,period:{startDate:iso(start),endDate:iso(end),days:28},totals:{clicks:t.clicks||0,impressions:t.impressions||0,ctr:t.ctr||0,position:t.position||0},queries,pages,cannibalization});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Erreur inconnue"},{status:502})}
}
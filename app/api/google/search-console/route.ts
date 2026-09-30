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
  type PageSignal={url:string;clicks:number;impressions:number;position:number};
  const map=new Map<string,PageSignal[]>();
  for(const r of queryPages){
   const q=r.keys?.[0],url=r.keys?.[1]; if(!q||!url)continue;
   const rows=map.get(q)||[];
   rows.push({url,clicks:r.clicks||0,impressions:r.impressions||0,position:r.position||0});
   map.set(q,rows);
  }
  const generic=(url:string)=>{try{const p=new URL(url).pathname.replace(/\/$/,"")||"/";return p==="/"||p==="/contact"||p==="/mentions-legales"||p==="/politique-de-confidentialite"}catch{return false}};
  const normalize=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
  const branded=(q:string)=>{const n=normalize(q);return n.includes("riviera nuisibles")||n.includes("riviera nuisible")};
  const stop=new Set(["de","du","des","la","le","les","a","au","aux","en","et","un","une","pour","prix","tarif","devis","entreprise","traitement","desinsectisation","exterminateur","intervention"]);
  const tokens=(q:string)=>normalize(q).split(" ").map(x=>x.replace(/s$/,"")).filter(x=>x.length>2&&!stop.has(x));
  const similarity=(a:string,b:string)=>{const A=new Set(tokens(a)),B=new Set(tokens(b));if(!A.size||!B.size)return 0;const inter=[...A].filter(x=>B.has(x)).length;return inter/Math.min(A.size,B.size)};
  const signals=[...map.entries()].map(([query,rows])=>{
   if(branded(query))return null;
   const totalImpressions=rows.reduce((s,r)=>s+r.impressions,0),totalClicks=rows.reduce((s,r)=>s+r.clicks,0);
   const relevant=rows.filter(r=>r.impressions>=Math.max(5,totalImpressions*.08)).sort((a,b)=>b.impressions-a.impressions);
   const substantive=relevant.filter(r=>!generic(r.url));
   if(substantive.length<2)return null;
   const top=substantive.slice(0,2),secondShare=top[1].impressions/Math.max(1,totalImpressions),positionGap=Math.abs(top[0].position-top[1].position);
   let score=0;if(totalImpressions>=50)score+=2;else if(totalImpressions>=20)score+=1;if(secondShare>=.25)score+=3;else if(secondShare>=.12)score+=2;else score+=1;if(positionGap<=5)score+=2;else if(positionGap<=15)score+=1;score+=2;
   const severity=score>=7?"Élevée":score>=5?"Moyenne":"À surveiller";
   const reason=secondShare>=.25?"Deux URL se partagent une part importante des impressions":positionGap<=5?"Deux URL sont en concurrence à des positions proches":"Plusieurs URL significatives répondent à la même requête";
   return {query,severity,score,reason,clicks:totalClicks,impressions:totalImpressions,pages:substantive.map(r=>({...r,share:r.impressions/Math.max(1,totalImpressions)}))};
  }).filter(Boolean) as any[];
  const clusters:any[]=[];
  for(const s of signals.sort((a,b)=>b.impressions-a.impressions)){
   const pageKey=s.pages.slice(0,2).map((p:any)=>p.url).sort().join("|");
   let cl=clusters.find(c=>c.pageKey===pageKey&&c.queries.some((q:string)=>similarity(q,s.query)>=.66));
   if(!cl){cl={pageKey,queries:[],pages:s.pages,impressions:0,clicks:0,maxScore:0};clusters.push(cl)}
   cl.queries.push(s.query);cl.impressions+=s.impressions;cl.clicks+=s.clicks;cl.maxScore=Math.max(cl.maxScore,s.score);
  }
  const cannibalization=clusters.map(c=>{
   const lead=c.queries.sort((a:string,b:string)=>tokens(b).length-tokens(a).length)[0];
   const core=tokens(lead).join(" ");
   const severity=c.maxScore>=7?"Élevée":c.maxScore>=5?"Moyenne":"À surveiller";
   return {cluster:core||lead,severity,score:c.maxScore,reason:c.queries.length>1?`${c.queries.length} requêtes proches montrent le même chevauchement d'URL`:"Deux pages significatives se partagent cette intention",queries:c.queries,pageCount:c.pages.length,clicks:c.clicks,impressions:c.impressions,pages:c.pages};
  }).sort((a,b)=>b.score-a.score||b.impressions-a.impressions).slice(0,50);
  return NextResponse.json({ok:true,property:chosen,period:{startDate:iso(start),endDate:iso(end),days:28},totals:{clicks:t.clicks||0,impressions:t.impressions||0,ctr:t.ctr||0,position:t.position||0},queries,pages,cannibalization});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Erreur inconnue"},{status:502})}
}
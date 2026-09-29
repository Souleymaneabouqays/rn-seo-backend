"use client";

import { useEffect, useState } from "react";

const nav=[["▦","Tableau de bord"],["✦","Agent SEO"],["▤","Pages & Articles"],["▣","Calendrier éditorial"],["✎","Audit On-page"],["?","Schema"],["⌕","Mots-clés"],["♟","Concurrents"],["↗","Backlinks"],["⌖","SEO local"],["◎","Google Data"],["⚙","Paramètres"]];
const actions=[["Priorité haute","Analyser les cannibalisations","Plusieurs intentions présentent des chevauchements entre URL.","danger"],["Opportunité","Punaises de lit Toulon","La page est proche du Top 10 : enrichir le contenu local et le maillage.","warn"],["Technique","Schema LocalBusiness","Préparer les données structurées de l'entreprise.","info"]];

type WpItem={id:number;slug:string;status:string;link:string;title:{rendered?:string;raw?:string};modified:string};
type WpData={ok:boolean;site?:string;user?:{name:string};counts?:{pagesReturned:number;postsReturned:number};pages?:WpItem[];posts?:WpItem[];error?:string};
type GRow={keys:string[];clicks:number;impressions:number;ctr:number;position:number};
type Cannibal={cluster:string;queries:string[];severity:string;score:number;reason:string;pages:{url:string;clicks:number;impressions:number;position:number;share:number}[];pageCount:number;clicks:number;impressions:number};
type GData={ok:boolean;period?:{startDate:string;endDate:string;days:number};totals?:{clicks:number;impressions:number;ctr:number;position:number};queries?:GRow[];pages?:GRow[];cannibalization?:Cannibal[];error?:string};

export default function Home(){
 const [active,setActive]=useState("Tableau de bord");
 const [wp,setWp]=useState<WpData|null>(null);
 const [gsc,setGsc]=useState(false); const [gd,setGd]=useState<GData|null>(null);
 useEffect(()=>{fetch("/api/wordpress").then(r=>r.json()).then(setWp).catch(()=>setWp({ok:false,error:"Connexion impossible"})); fetch("/api/google/status").then(r=>r.json()).then(d=>{setGsc(!!d.connected);if(d.connected)fetch("/api/google/search-console").then(r=>r.json()).then(setGd).catch(()=>{})}).catch(()=>{})},[]);
 return <main><aside><div className="brand"><div className="shield">RN</div><div><b>Riviera Nuisibles</b><small>SEO COCKPIT</small></div></div><p className="section">PILOTAGE</p>{nav.map((n)=><button className={"nav "+(active===n[1]?"active":"")} key={n[1]} onClick={()=>setActive(n[1])}><span>{n[0]}</span>{n[1]}{n[1]==="Agent SEO"&&<em>3</em>}</button>)}</aside><section className="content">{active==="Pages & Articles"?<Content wp={wp}/>:active==="Google Data"?<GoogleData data={gd}/>:active==="Mots-clés"?<Keywords data={gd}/>:active==="Agent SEO"?<AgentSEO data={gd}/>:<Dashboard wp={wp} gsc={gsc} gd={gd}/>}</section></main>
}
function Dashboard({wp,gsc,gd}:{wp:WpData|null,gsc:boolean,gd:GData|null}){return <><header><div><p className="eyebrow">RIVIERA NUISIBLES · rivieranuisibles.fr</p><h1>Bonjour 👋</h1><p className="sub">Voici ce qui mérite votre attention aujourd'hui.</p></div><button>+ Nouvelle analyse</button></header><div className="stats"><Card k="Score SEO" v="—" s="Calculé avec les vraies données"/><Card k="Clics Google · 28 j" v={gd?.ok?String(Math.round(gd.totals?.clicks||0)):"—"} s={gd?.ok?`${Math.round(gd.totals?.impressions||0).toLocaleString("fr-FR")} impressions`:"Chargement Search Console..."}/><Card k="Contenus WordPress" v={wp?.ok?String((wp.pages?.length||0)+(wp.posts?.length||0)):"—"} s={wp?.ok?"Synchronisation active":"Connexion en cours..."}/><Card k="Actions prioritaires" v="3" s="À examiner aujourd'hui"/></div><div className="grid"><div className="panel wide"><div className="panelHead"><div><span className="dot"></span><b>Agent SEO</b><p>Recommandations classées par impact</p></div><button className="ghost">Tout analyser</button></div>{actions.map(a=><div className="action" key={a[1]}><span className={"badge "+a[3]}>{a[0]}</span><div><b>{a[1]}</b><p>{a[2]}</p></div><button className="arrow">→</button></div>)}</div><div className="panel"><div className="panelHead"><div><b>État des connexions</b><p>Sources de données</p></div></div><Connection name="WordPress" state={wp?.ok?"Connecté":"Connexion..." } ok={!!wp?.ok}/><Connection name="Search Console" state={gsc?"Connecté":"À connecter"} ok={gsc}/><Connection name="Google Analytics 4" state="À connecter"/><Connection name="API SEO" state="À connecter"/><button className="full" onClick={()=>{if(!gsc) location.href="/api/google/login"}}>{gsc?"Search Console connecté":"Connecter Search Console"}</button></div></div><div className="panel roadmap"><div className="panelHead"><div><b>Vue d'ensemble</b><p>Le cockpit part volontairement de données réelles, jamais de chiffres simulés.</p></div></div><div className="empty"><div>⌁</div><h2>{wp?.ok?"WordPress est connecté":"Connexion WordPress en cours"}</h2><p>{wp?.ok?"Les contenus du site sont maintenant synchronisés. Ouvrez « Pages & Articles » pour les consulter.":"Les données apparaîtront dès que la connexion sera disponible."}</p></div></div></>}

function Content({wp}:{wp:WpData|null}){
 const [kind,setKind]=useState<"pages"|"posts">("pages");
 const items=kind==="pages"?(wp?.pages||[]):(wp?.posts||[]);
 return <><header><div><p className="eyebrow">CONTENU WORDPRESS</p><h1>Pages & Articles</h1><p className="sub">Contenus récupérés directement depuis rivieranuisibles.fr.</p></div><button onClick={()=>location.reload()}>↻ Actualiser</button></header>
 <div className="stats"><Card k="Connexion" v={wp?.ok?"Active":"—"} s={wp?.ok?"WordPress synchronisé":"Vérification..."}/><Card k="Pages chargées" v={wp?.ok?String(wp.pages?.length||0):"—"} s="Derniers contenus récupérés"/><Card k="Articles chargés" v={wp?.ok?String(wp.posts?.length||0):"—"} s="Derniers contenus récupérés"/><Card k="Compte" v={wp?.user?.name||"—"} s="Utilisateur WordPress"/></div>
 <div className="panel contentPanel"><div className="contentToolbar"><div><b>Contenus du site</b><p>Données réelles de l'API WordPress</p></div><div className="tabs"><button className={kind==="pages"?"tab activeTab":"tab"} onClick={()=>setKind("pages")}>Pages</button><button className={kind==="posts"?"tab activeTab":"tab"} onClick={()=>setKind("posts")}>Articles</button></div></div>
 {!wp?<div className="loading">Chargement de WordPress…</div>:!wp.ok?<div className="errorBox">Connexion WordPress impossible : {wp.error}</div>:<div className="contentTable"><div className="tableRow tableHead"><span>Titre</span><span>Statut</span><span>Dernière modification</span><span></span></div>{items.map(item=><div className="tableRow" key={item.id}><div><b dangerouslySetInnerHTML={{__html:item.title.rendered||item.title.raw||item.slug}}/><small>/{item.slug}</small></div><span className={"state "+item.status}>{item.status==="publish"?"Publié":item.status}</span><span>{new Date(item.modified).toLocaleDateString("fr-FR")}</span><a href={item.link} target="_blank" rel="noreferrer">Voir ↗</a></div>)}</div>}</div></>
}
function Card({k,v,s}:{k:string,v:string,s:string}){return <div className="card"><p>{k}</p><strong>{v}</strong><small>{s}</small></div>}
function Connection({name,state,ok=false}:{name:string,state:string,ok?:boolean}){return <div className="connection"><span className={"status "+(ok?"connected":"")}></span><b>{name}</b><small className={ok?"okText":""}>{state}</small></div>}

function GoogleData({data}:{data:GData|null}){
 if(!data)return <><header><div><p className="eyebrow">GOOGLE SEARCH CONSOLE</p><h1>Google Data</h1><p className="sub">Chargement des données réelles…</p></div></header></>;
 if(!data.ok)return <><header><div><p className="eyebrow">GOOGLE SEARCH CONSOLE</p><h1>Google Data</h1><p className="sub">{data.error||"Données indisponibles"}</p></div></header></>;
 const t=data.totals!;
 return <><header><div><p className="eyebrow">GOOGLE SEARCH CONSOLE · {data.period?.days} JOURS</p><h1>Google Data</h1><p className="sub">Performances organiques réelles de rivieranuisibles.fr.</p></div><button onClick={()=>location.reload()}>↻ Actualiser</button></header>
 <div className="stats"><Card k="Clics" v={Math.round(t.clicks).toLocaleString("fr-FR")} s="Depuis Google"/><Card k="Impressions" v={Math.round(t.impressions).toLocaleString("fr-FR")} s="Visibilité Google"/><Card k="CTR moyen" v={(t.ctr*100).toFixed(2)+" %"} s="Clics ÷ impressions"/><Card k="Position moyenne" v={t.position.toFixed(1)} s="Toutes requêtes"/></div>
 <DataTable title="Requêtes Google" rows={data.queries||[]} label="Mot-clé"/><DataTable title="Pages dans Google" rows={data.pages||[]} label="URL"/>
 <div className="panel contentPanel"><div className="contentToolbar"><div><b>Cannibalisation SEO à examiner</b><p>Les faux positifs faibles sont filtrés. Le niveau indique la force du signal, pas une consigne de suppression.</p></div></div><div className="contentTable"><div className="tableRow tableHead"><span>Requête / diagnostic</span><span>Niveau</span><span>Impressions</span><span>Pages</span></div>{(data.cannibalization||[]).slice(0,30).map(x=><div className="tableRow" key={x.cluster}><div><b>{x.cluster}</b><small>{x.reason}</small><small>{x.queries.slice(0,4).join(" · ")}</small><small>{x.pages.slice(0,3).map(p=>new URL(p.url).pathname+" ("+Math.round(p.share*100)+" %, pos. "+p.position.toFixed(1)+")").join(" · ")}</small></div><span className={"state "+(x.severity==="Élevée"?"draft":"publish")}>{x.severity}</span><span>{Math.round(x.impressions)}</span><span>{x.pageCount}</span></div>)}</div></div></>
}
function Keywords({data}:{data:GData|null}){return <><header><div><p className="eyebrow">SEARCH CONSOLE</p><h1>Mots-clés</h1><p className="sub">Les requêtes qui affichent réellement Riviera Nuisibles dans Google.</p></div></header>{data?.ok?<DataTable title="Mots-clés organiques" rows={data.queries||[]} label="Requête"/>:<div className="panel"><p>Chargement des données Search Console…</p></div>}</>}
function DataTable({title,rows,label}:{title:string,rows:GRow[],label:string}){return <div className="panel contentPanel"><div className="contentToolbar"><div><b>{title}</b><p>Données Search Console</p></div></div><div className="contentTable"><div className="tableRow tableHead"><span>{label}</span><span>Clics</span><span>Impressions</span><span>Position</span></div>{rows.slice(0,50).map((r,i)=><div className="tableRow" key={(r.keys?.[0]||"")+i}><div><b>{label==="URL"?(new URL(r.keys[0])).pathname:r.keys[0]}</b></div><span>{Math.round(r.clicks)}</span><span>{Math.round(r.impressions)}</span><span>{r.position.toFixed(1)}</span></div>)}</div></div>}

function AgentSEO({data}:{data:GData|null}){
 const [selected,setSelected]=useState<Cannibal|null>(null); const [wpAnalysis,setWpAnalysis]=useState<any>(null); const [loading,setLoading]=useState(false); const [approved,setApproved]=useState<Record<string,boolean>>({}); const [precheck,setPrecheck]=useState<any>(null); const [finalConfirm,setFinalConfirm]=useState(false); const [dryRun,setDryRun]=useState<any>(null); const [applyResult,setApplyResult]=useState<any>(null); const [elementorTest,setElementorTest]=useState<any>(null); const [elementorPrepared,setElementorPrepared]=useState<any>(null); const [elementorLive,setElementorLive]=useState<any>(null); const [elementorInspect,setElementorInspect]=useState<any>(null); const [bridgeTest,setBridgeTest]=useState<any>(null); const cases=data?.cannibalization||[];
 const analyze=async(x:Cannibal)=>{if(selected?.cluster===x.cluster){setSelected(null);setWpAnalysis(null);return}setSelected(x);setWpAnalysis(null);setApproved({});setPrecheck(null);setFinalConfirm(false);setDryRun(null);setApplyResult(null);setElementorTest(null);setElementorPrepared(null);setElementorLive(null);setElementorInspect(null);setLoading(true);try{const q=x.pages.slice(0,4).map(p=>"analyze="+encodeURIComponent(p.url)).join("&")+"&queries="+encodeURIComponent(x.queries.join("|"))+"&cluster="+encodeURIComponent(x.cluster);const r=await fetch("/api/wordpress?"+q);setWpAnalysis(await r.json())}catch{setWpAnalysis({ok:false,error:"Analyse WordPress impossible"})}finally{setLoading(false)}};
 return <><header><div><p className="eyebrow">AGENT SEO · MODE APPROBATION</p><h1>Agent SEO</h1><p className="sub">Analyse les signaux réels avant toute modification de WordPress.</p></div></header>
 <div className="stats"><Card k="Cas détectés" v={data?.ok?String(cases.length):"—"} s="Cannibalisations qualifiées"/><Card k="Priorité élevée" v={data?.ok?String(cases.filter(x=>x.severity==="Élevée").length):"—"} s="À examiner en premier"/><Card k="Source" v="GSC" s="Données Search Console"/><Card k="Mode" v="Manuel" s="Aucune modification automatique"/></div>
 <div className="panel contentPanel"><div className="contentToolbar"><div><b>File d'analyse</b><p>Cliquez sur Analyser pour déplier le diagnostic directement sous le cas.</p></div></div>
 <div className="contentTable"><div className="tableRow tableHead"><span>Cluster</span><span>Niveau</span><span>Impressions</span><span></span></div>
 {cases.slice(0,20).map(x=><div key={x.cluster}><div className="tableRow"><div><b>{x.cluster}</b><small>{x.queries.length} requête(s) · {x.pageCount} pages concernées</small></div><span className={"state "+(x.severity==="Élevée"?"draft":"publish")}>{x.severity}</span><span>{Math.round(x.impressions)}</span><button className="ghost" onClick={()=>analyze(x)}>{selected?.cluster===x.cluster?"Refermer ↑":"Analyser ↓"}</button></div>
 {selected?.cluster===x.cluster&&<div style={{padding:"18px 22px",borderTop:"1px solid #e7ece9",background:"#f8fbf9"}}><div className="action"><span className="badge danger">Signal {x.severity}</span><div><b>{x.pages.length} pages se chevauchent</b><p>{x.reason}</p><small>{x.queries.slice(0,6).join(" · ")}</small></div></div>{x.pages.slice(0,4).map(p=><div className="action" key={p.url}><span className="badge info">{Math.round(p.share*100)} %</span><div><b>{new URL(p.url).pathname}</b><p>{Math.round(p.impressions)} impressions · position {p.position.toFixed(1)} · {Math.round(p.clicks)} clic(s)</p></div><a href={p.url} target="_blank" rel="noreferrer">Voir ↗</a></div>)}<div className="empty"><h2>Analyse du contenu WordPress</h2>{loading?<p>Lecture des pages en cours…</p>:wpAnalysis?.ok?<div>{wpAnalysis.pages.map((p:any)=><div className="action" key={p.url}><span className="badge info">{p.found?p.words+" mots":"Introuvable"}</span><div><b>{p.title||p.slug}</b><p>{p.found?(p.type==="pages"?"Page WordPress":"Article WordPress")+" · "+(p.builder==="elementor"?"Elementor détecté":"WordPress classique")+" · modifié le "+new Date(p.modified).toLocaleDateString("fr-FR"):"Contenu non retrouvé dans WordPress"}</p>{p.elementor?.detected&&<div style={{marginTop:8,textAlign:"left"}}><small><b>{p.elementor.widgetCount||0} widgets texte Elementor détectés</b></small>{p.elementor.widgets?.slice(0,12).map((w:any)=><div key={w.id+"-"+w.field} style={{marginTop:6,padding:"8px",border:"1px solid #e3e9e5",borderRadius:8}}><small>{w.widgetType||"widget"} · {w.field} · ID {w.id}</small><p style={{margin:"4px 0 0"}}>{w.text}</p></div>)}</div>}</div></div>)}{wpAnalysis.comparison&&<div><div className="action"><span className="badge info">{wpAnalysis.comparison.overlap}%</span><div><b>Chevauchement lexical estimé</b><p>{wpAnalysis.comparison.intent}</p></div></div><div className="action"><span className="badge publish">Proposition</span><div><b>Action recommandée avant validation</b><p>{wpAnalysis.comparison.recommendation}</p><small>Termes communs : {wpAnalysis.comparison.sharedTerms?.slice(0,10).join(" · ")}</small></div></div><div style={{marginTop:18,padding:"12px",border:"1px solid #dfe7e2",borderRadius:10}}><b>Test Elementor sécurisé</b><p>Simulation ciblée du premier widget texte de la page de service. Aucune écriture.</p><button className="ghost" disabled={elementorTest?.loading} onClick={async()=>{
  setElementorTest({loading:true});
  try{
    const service=(wpAnalysis.pages||[]).find((p:any)=>p.type==="pages"&&p.elementor?.detected);
    const widget=service?.elementor?.widgets?.find((w:any)=>w.widgetType==="text-editor"&&w.field==="editor");
    const serviceFocus=wpAnalysis.comparison?.focus?.find((p:any)=>p.type==="pages");
    const proposed=serviceFocus?.changes?.find((x:any)=>x.field==="Introduction / premier bloc")?.proposed;
    if(!service||!widget||!proposed)throw new Error("Cible Elementor introuvable.");
    const r=await fetch("/api/wordpress/elementor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      id:service.id,type:service.type,widgetId:widget.id,field:widget.field,proposedValue:"<p>"+proposed+"</p>",
      expectedModified:service.modified,dryRun:true
    })});
    const x=await r.json(); setElementorTest({...x,loading:false,target:widget.id});
  }catch(e){setElementorTest({ok:false,loading:false,error:e instanceof Error?e.message:"Simulation Elementor impossible"});}
}}>{elementorTest?.loading?"Simulation Elementor…":"Simuler la modification Elementor"}</button>{elementorTest&&!elementorTest.loading&&<p>{elementorTest.ok&&elementorTest.dryRun?"✓ Simulation Elementor réussie — widget "+elementorTest.target+" ciblé, aucune écriture.":"⚠ Simulation Elementor refusée : "+(elementorTest.error||"vérification impossible")}</p>}{elementorTest?.ok&&elementorTest?.dryRun&&<div style={{marginTop:10}}><button className="ghost" disabled={elementorPrepared?.loading} onClick={async()=>{
  setElementorPrepared({loading:true});
  try{
    const service=(wpAnalysis.pages||[]).find((p:any)=>p.type==="pages"&&p.elementor?.detected);
    const widget=service?.elementor?.widgets?.find((w:any)=>w.id===elementorTest.target);
    const focus=wpAnalysis.comparison?.focus?.find((p:any)=>p.type==="pages");
    const proposed=focus?.changes?.find((x:any)=>x.field==="Introduction / premier bloc")?.proposed;
    if(!service||!widget||!proposed)throw new Error("Cible Elementor introuvable.");
    const r=await fetch("/api/wordpress/elementor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      id:service.id,type:service.type,widgetId:widget.id,field:widget.field,
      proposedValue:"<p>"+proposed+"</p>",expectedModified:service.modified,
      dryRun:false,prepareOnly:true
    })});
    const x=await r.json();setElementorPrepared({...x,loading:false});
  }catch(e){setElementorPrepared({ok:false,loading:false,error:e instanceof Error?e.message:"Préparation impossible"});}
}}>{elementorPrepared?.loading?"Préparation…":"Préparer la modification Elementor"}</button>
{elementorPrepared&&!elementorPrepared.loading&&<p>{elementorPrepared.ok&&elementorPrepared.prepared?"✓ Modification Elementor prête — écriture toujours verrouillée.":"⚠ Préparation refusée : "+(elementorPrepared.error||"vérification impossible")}</p>}{elementorPrepared?.ok&&elementorPrepared?.prepared&&<div style={{marginTop:12,padding:"10px",border:"1px solid #dfe7e2",borderRadius:8}}><b>Écriture Elementor réelle</b><p>Le prochain bouton modifiera uniquement le widget {elementorTest?.target}. Une confirmation supplémentaire sera exigée.</p><div style={{marginBottom:10}}><button className="ghost" disabled={bridgeTest?.loading} onClick={async()=>{
  setBridgeTest({loading:true});
  try{
    const r=await fetch("/api/wordpress/elementor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"bridge-test"})});
    const x=await r.json();setBridgeTest({...x,loading:false});
  }catch(e){setBridgeTest({ok:false,loading:false,error:e instanceof Error?e.message:"Test du bridge impossible"});}
}}>{bridgeTest?.loading?"Test du bridge…":"Tester Riviera SEO Bridge"}</button>{bridgeTest&&!bridgeTest.loading&&<p>{bridgeTest.ok?"✓ Riviera SEO Bridge connecté — purge Elementor disponible.":"⚠ Bridge non confirmé : "+(bridgeTest.error||bridgeTest.message||"erreur inconnue")}</p>}</div><div style={{marginBottom:10}}><button className="ghost" disabled={elementorInspect?.loading} onClick={async()=>{
  setElementorInspect({loading:true});
  try{
    const service=(wpAnalysis.pages||[]).find((p:any)=>p.type==="pages"&&p.elementor?.detected);
    const widget=service?.elementor?.widgets?.find((w:any)=>w.id===elementorTest?.target);
    if(!service||!widget)throw new Error("Cible Elementor introuvable.");
    const r=await fetch("/api/wordpress/elementor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      id:service.id,type:service.type,widgetId:widget.id,field:widget.field,proposedValue:"",
      expectedModified:service.modified,dryRun:true,mode:"inspect"
    })});
    const x=await r.json();setElementorInspect({...x,loading:false});
  }catch(e){setElementorInspect({ok:false,loading:false,error:e instanceof Error?e.message:"Inspection impossible"});}
}}>{elementorInspect?.loading?"Lecture du widget…":"Inspecter le widget actuel (lecture seule)"}</button>
{elementorInspect&&!elementorInspect.loading&&<div style={{marginTop:8}}>{elementorInspect.ok?<><p>✓ Valeur actuelle lue directement dans Elementor — aucune écriture.</p><div style={{padding:"8px",border:"1px solid #e3e9e5",borderRadius:8,textAlign:"left"}} dangerouslySetInnerHTML={{__html:elementorInspect.value||"<em>Valeur vide</em>"}} /></>:<p>⚠ Inspection impossible : {elementorInspect.error||"erreur inconnue"}</p>}</div>}</div><button className="ghost" disabled={elementorLive?.loading} onClick={async()=>{
  if(!window.confirm("Confirmer l’écriture réelle sur le widget Elementor "+elementorTest?.target+" ?"))return;
  setElementorLive({loading:true});
  try{
    const service=(wpAnalysis.pages||[]).find((p:any)=>p.type==="pages"&&p.elementor?.detected);
    const widget=service?.elementor?.widgets?.find((w:any)=>w.id===elementorTest?.target);
    const focus=wpAnalysis.comparison?.focus?.find((p:any)=>p.type==="pages");
    const proposed=focus?.changes?.find((x:any)=>x.field==="Introduction / premier bloc")?.proposed;
    if(!service||!widget||!proposed)throw new Error("Cible Elementor introuvable.");
    const r=await fetch("/api/wordpress/elementor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      id:service.id,type:service.type,widgetId:widget.id,field:widget.field,proposedValue:"<p>"+proposed+"</p>",
      expectedModified:service.modified,dryRun:false,confirmation:"APPLY_ELEMENTOR_WIDGET_CHANGE"
    })});
    const x=await r.json();setElementorLive({...x,loading:false,type:service.type,currentData:x.ok?true:false});
  }catch(e){setElementorLive({ok:false,loading:false,error:e instanceof Error?e.message:"Écriture impossible"});}
}}>{elementorLive?.loading?"Écriture Elementor…":"Appliquer 1 modification Elementor réelle"}</button>
{elementorLive&&!elementorLive.loading&&<div style={{marginTop:8}}><p>{elementorLive.ok&&elementorLive.verified?"✓ Widget Elementor modifié et vérifié.":"⚠ Écriture non appliquée : "+(elementorLive.error||"vérification impossible")}</p>{elementorLive.ok&&elementorLive.verified&&<><a href={elementorLive.link} target="_blank" rel="noreferrer">Vérifier la page ↗</a><div><button className="ghost" onClick={async()=>{
  if(!window.confirm("Restaurer le snapshot Elementor précédent ?"))return;
  const r=await fetch("/api/wordpress/elementor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    id:elementorLive.id,type:elementorLive.type,widgetId:elementorTest?.target,field:"editor",proposedValue:"",
    expectedModified:elementorLive.modified,dryRun:false,mode:"rollback-widget",confirmation:"ROLLBACK_ELEMENTOR_WIDGET",rollbackData:elementorLive.previousWidgetValue
  })});
  const x=await r.json();setElementorLive((old:any)=>({...old,rollback:x}));
}}>Annuler la modification</button></div></>}{elementorLive.rollback&&<p>{elementorLive.rollback.ok&&elementorLive.rollback.rolledBack?"✓ Modification annulée : widget restauré et vérifié.":"⚠ Restauration Elementor non effectuée."}</p>}</div>}</div>}</div>}</div><div style={{marginTop:18}}><b>Prévisualisation avant / après</b>{wpAnalysis.comparison.focus?.map((p:any,i:number)=><div className="action" key={"preview"+i}><span className="badge info">{p.role}</span><div><small>ACTUEL</small><p>{p.currentTitle}</p><small>PROPOSÉ</small><b>{p.proposedTitle}</b><p>{p.titleChanged?"Modification de titre proposée.":"Titre déjà cohérent : aucune modification de titre nécessaire."}</p><small>OBJECTIF SEO</small><p>{p.objective}</p><p>Aperçu uniquement — aucune écriture WordPress.</p></div></div>)}</div><div style={{marginTop:18}}><b>Modifications préparées</b>{wpAnalysis.comparison.focus?.map((p:any)=>p.changes?.map((ch:any,i:number)=><div className="action" key={p.url+i}><span className="badge info">{ch.field}</span><div><small>ACTUEL</small><p>{ch.current}</p><small>PROPOSÉ</small><b>{ch.proposed}</b><p>{ch.reason}</p>{ch.readyText&&<div><small>✓ Texte prêt à relire — non appliqué</small><div style={{marginTop:10}}><button className="ghost" onClick={()=>setApproved(a=>({...a,[p.url+"-"+i]:!a[p.url+"-"+i]}))}>{approved[p.url+"-"+i]?"✓ Approuvé":"Approuver cette action"}</button></div></div>}{!ch.needed&&<small>✓ Conserver tel quel — aucun changement nécessaire</small>}</div></div>))}{wpAnalysis.comparison.internalLink&&<div className="action"><span className="badge publish">Lien interne</span><div><b>Ancre : {wpAnalysis.comparison.internalLink.anchor}</b><p>Source : {new URL(wpAnalysis.comparison.internalLink.source).pathname}</p><p>Cible : {new URL(wpAnalysis.comparison.internalLink.target).pathname}</p><p>Emplacement : {wpAnalysis.comparison.internalLink.placement}</p><small>{wpAnalysis.comparison.internalLink.reason}</small><div style={{marginTop:10}}><button className="ghost" onClick={()=>setApproved(a=>({...a,internalLink:!a.internalLink}))}>{approved.internalLink?"✓ Approuvé":"Approuver ce lien"}</button></div></div></div>}</div><div style={{marginTop:18}}><b>Validation avant application</b><div className="action"><span className="badge publish">{Object.values(approved).filter(Boolean).length}</span><div><b>action(s) approuvée(s)</b><p>Ces validations sont locales à cette analyse. Rien n'est encore envoyé à WordPress.</p>{Object.values(approved).filter(Boolean).length===3&&<div style={{marginTop:12}}><b>Récapitulatif final</b><p>✓ Passage informationnel de l’article</p><p>✓ Introduction commerciale de la page de service</p><p>✓ Lien interne article → page de service</p><div style={{marginTop:10,padding:"12px",border:"1px solid #dfe7e2",borderRadius:10}}><b>Confirmation requise</b><p>La prochaine étape pourra modifier WordPress. Une confirmation explicite sera exigée au moment de l’exécution.</p><button className="ghost" onClick={async()=>{setPrecheck({loading:true});try{const items=wpAnalysis.comparison.focus||[];const results=[];for(const p of items){const r=await fetch("/api/wordpress/apply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:p.id,type:p.type,expectedModified:p.modified,expectedContent:p.rawContent,proposedContent:p.rawContent})});results.push(await r.json())}setPrecheck({loading:false,ok:results.every((x:any)=>x.ok&&x.ready&&x.locked),results});}catch(e){setPrecheck({loading:false,ok:false});}}}>{precheck?.loading?"Précontrôle en cours…":"Vérifier WordPress avant application"}</button>{precheck&&!precheck.loading&&<div><p>{precheck.ok?"✓ Précontrôle réussi — versions WordPress inchangées.":"⚠ Précontrôle refusé — relancez l’analyse avant toute application."}</p>{precheck.ok&&<div style={{marginTop:12,padding:"12px",border:"1px solid #dfe7e2",borderRadius:10}}><b>Dernière confirmation</b><p>Cochez uniquement si vous confirmez vouloir appliquer les 3 actions approuvées à WordPress.</p><label style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center"}}><input type="checkbox" checked={finalConfirm} onChange={e=>setFinalConfirm(e.target.checked)}/> Je confirme les modifications WordPress</label><button className="ghost" disabled={!finalConfirm||dryRun?.loading} onClick={async()=>{
  if(!finalConfirm)return;
  setDryRun({loading:true});
  try{
    const focus=wpAnalysis.comparison.focus||[];
    const article=focus.find((p:any)=>p.type==="posts");
    const service=focus.find((p:any)=>p.type==="pages");
    if(!article||!service)throw new Error("Article ou page de service introuvable.");

    const articleText=article.changes?.find((x:any)=>x.field==="Passage informationnel")?.proposed;
    const serviceText=service.changes?.find((x:any)=>x.field==="Introduction / premier bloc")?.proposed;
    const link=wpAnalysis.comparison.internalLink;
    if(!articleText||!serviceText||!link)throw new Error("Modifications préparées incomplètes.");

    const linkedArticleText=articleText.replace(
      "un diagnostic professionnel",
      '<a href="'+link.target+'">'+link.anchor+'</a>'
    );
    const articleBlock='<!-- rn-seo-agent:informational -->\\n<p>'+linkedArticleText+'</p>\\n<!-- /rn-seo-agent:informational -->';
    const serviceBlock='<!-- rn-seo-agent:service-intro -->\\n<p>'+serviceText+'</p>\\n<!-- /rn-seo-agent:service-intro -->';
    const payloads=[
      {...article,proposedContent:article.rawContent+"\\n"+articleBlock},
      {...service,proposedContent:serviceBlock+"\\n"+service.rawContent}
    ];
    const results=[];
    for(const p of payloads){
      const r=await fetch("/api/wordpress/apply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        id:p.id,type:p.type,expectedModified:p.modified,expectedContent:p.rawContent,
        proposedContent:p.proposedContent,mode:"apply",dryRun:true,
        confirmation:"APPLY_APPROVED_SEO_CHANGES"
      })});
      results.push(await r.json());
    }
    setDryRun({loading:false,ok:results.every((x:any)=>x.ok&&x.dryRun&&x.locked),results});
  }catch(e){
    setDryRun({loading:false,ok:false,error:e instanceof Error?e.message:"Simulation impossible"});
  }
}}>{dryRun?.loading?"Simulation complète en cours…":finalConfirm?"Simuler l’application des 3 modifications 🔒":"Confirmez pour continuer"}</button>
<small>Simulation complète : le serveur reçoit les futurs contenus, mais aucune écriture WordPress n’est autorisée.</small>
{dryRun&&!dryRun.loading&&<p>{dryRun.ok?"✓ Simulation réussie — les 3 actions sont prêtes, WordPress n’a pas été modifié.":"⚠ Simulation refusée — aucune modification WordPress effectuée."}</p>}{dryRun?.ok&&!applyResult&&<div style={{marginTop:12,padding:"12px",border:"1px solid #dfe7e2",borderRadius:10}}>
<b>Premier test réel contrôlé</b>
<p>Une seule modification sera appliquée : l’introduction commerciale de la page de service. L’article et le lien interne resteront inchangés.</p>
<button className="ghost" onClick={async()=>{
  if(!window.confirm("Confirmer l’application réelle de l’introduction sur UNE seule page WordPress ?"))return;
  setApplyResult({loading:true});
  try{
    const service=(wpAnalysis.comparison.focus||[]).find((p:any)=>p.type==="pages");
    const serviceText=service?.changes?.find((x:any)=>x.field==="Introduction / premier bloc")?.proposed;
    if(!service||!serviceText)throw new Error("Page de service ou texte préparé introuvable.");
    const serviceBlock='<!-- rn-seo-agent:service-intro -->\\n<p>'+serviceText+'</p>\\n<!-- /rn-seo-agent:service-intro -->';
    const proposedContent=serviceBlock+"\\n"+service.rawContent;
    const r=await fetch("/api/wordpress/apply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      id:service.id,type:service.type,expectedModified:service.modified,expectedContent:service.rawContent,
      proposedContent,mode:"apply",confirmation:"APPLY_APPROVED_SEO_CHANGES"
    })});
    const x=await r.json();
    setApplyResult({...x,type:service.type,currentContent:proposedContent});
  }catch(e){setApplyResult({ok:false,error:e instanceof Error?e.message:"Application impossible"});}
}}>Appliquer 1 modification réelle</button>
<small>Une confirmation navigateur supplémentaire sera demandée avant l’écriture.</small>
</div>}{applyResult?.ok&&<div style={{marginTop:12,padding:"12px",border:"1px solid #dfe7e2",borderRadius:10}}>
<b>Modification WordPress appliquée</b>
<p>✓ Écriture vérifiée sur WordPress.</p>
<p>✓ Version précédente conservée pour restauration.</p>
{applyResult.link&&<a href={applyResult.link} target="_blank" rel="noreferrer">Vérifier la page ↗</a>}
<div style={{marginTop:10}}><button className="ghost" disabled={applyResult.rollbackLoading} onClick={async()=>{
  if(!window.confirm("Restaurer la version WordPress précédente ?"))return;
  setApplyResult((x:any)=>({...x,rollbackLoading:true}));
  try{
    const r=await fetch("/api/wordpress/apply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      id:applyResult.id,type:applyResult.type,expectedModified:applyResult.modified,
      expectedContent:applyResult.currentContent||"",proposedContent:applyResult.currentContent||"",
      mode:"rollback",confirmation:"ROLLBACK_WORDPRESS_CONTENT",
      rollbackContent:applyResult.previousContent
    })});
    const x=await r.json();
    setApplyResult((old:any)=>({...old,rollbackLoading:false,rollback:x}));
  }catch{setApplyResult((old:any)=>({...old,rollbackLoading:false,rollback:{ok:false}}));}
}}>{applyResult.rollbackLoading?"Restauration en cours…":"Annuler / Restaurer la version précédente"}</button></div>
{applyResult.rollback&&<p>{applyResult.rollback.ok&&applyResult.rollback.rolledBack?"✓ Version précédente restaurée et vérifiée.":"⚠ Restauration non effectuée."}</p>}
</div>}</div>}</div>}</div></div>}{Object.values(approved).some(Boolean)&&Object.values(approved).filter(Boolean).length!==3&&<button className="ghost" disabled>Application WordPress verrouillée 🔒</button>}</div></div></div><div style={{marginTop:18}}><b>Plan de correction proposé</b>{wpAnalysis.comparison.plan?.map((step:any,i:number)=><div className="action" key={i}><span className="badge info">{i+1}</span><div><b>{step.label} · {step.action}</b><p>{step.details}</p><small>{new URL(step.target).pathname}</small></div></div>)}</div><p><b>Aucune modification n'a été appliquée à WordPress.</b> Le plan doit être approuvé avant toute écriture.</p></div>}</div>:<p>{wpAnalysis?.error||"Préparation de l'analyse…"}</p>}</div></div>}</div>)}</div></div></>
}

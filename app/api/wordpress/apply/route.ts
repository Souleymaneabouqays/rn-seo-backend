import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function cfg(){
  const url=process.env.WORDPRESS_URL?.replace(/\/$/,"");
  const username=process.env.WORDPRESS_USERNAME;
  const password=process.env.WORDPRESS_APP_PASSWORD?.replace(/\s+/g,"");
  return url&&username&&password?{url,username,password}:null;
}
function auth(c:any){return "Basic "+Buffer.from(c.username+":"+c.password).toString("base64");}

function sameOrigin(req:Request){
  const origin=req.headers.get("origin");
  const host=req.headers.get("host");
  if(!origin||!host)return false;
  try{return new URL(origin).host===host;}catch{return false;}
}

export async function POST(req:Request){
  const c=cfg();
  if(!c)return NextResponse.json({ok:false,error:"Configuration WordPress incomplète."},{status:500});
  if(!sameOrigin(req))return NextResponse.json({ok:false,error:"Origine de la requête refusée."},{status:403});

  try{
    const body=await req.json();
    const {id,type,expectedModified,expectedContent,proposedContent,mode="precheck",confirmation,dryRun=false}=body||{};

    if(!id||!["pages","posts"].includes(type)||!expectedModified||typeof expectedContent!=="string"||typeof proposedContent!=="string"){
      return NextResponse.json({ok:false,error:"Données de validation incomplètes."},{status:400});
    }
    if(!["precheck","apply"].includes(mode)){
      return NextResponse.json({ok:false,error:"Mode d'exécution invalide."},{status:400});
    }

    const headers={Authorization:auth(c)};
    const endpoint=`${c.url}/wp-json/wp/v2/${type}/${id}`;
    const currentRes=await fetch(endpoint+"?context=edit&_fields=id,modified,content,title,link",{headers,cache:"no-store"});
    if(!currentRes.ok)return NextResponse.json({ok:false,error:"Impossible de relire la version actuelle dans WordPress.",status:currentRes.status},{status:502});

    const current=await currentRes.json();
    const raw=String(current.content?.raw??current.content?.rendered??"");
    if(current.modified!==expectedModified||raw!==expectedContent){
      return NextResponse.json({ok:false,conflict:true,error:"Le contenu WordPress a changé depuis l’analyse. Nouvelle analyse obligatoire.",currentModified:current.modified},{status:409});
    }

    if(mode==="precheck"){
      return NextResponse.json({ok:true,ready:true,locked:true,id:current.id,link:current.link,modified:current.modified,message:"Précontrôle réussi. Écriture WordPress toujours verrouillée."});
    }

    // Dry-run validates the complete apply payload without ever writing.
    if(dryRun===true){
      return NextResponse.json({ok:true,ready:true,locked:true,dryRun:true,writeEnabled:process.env.WORDPRESS_WRITE_ENABLED==="true",id:current.id,link:current.link,modified:current.modified,changed:proposedContent!==expectedContent,message:"Payload d’application validé en mode simulation. Aucune écriture WordPress."});
    }

    // Triple safety gate. Even a confirmed UI click cannot write until the
    // Production environment explicitly enables WORDPRESS_WRITE_ENABLED=true.
    if(process.env.WORDPRESS_WRITE_ENABLED!=="true"){
      return NextResponse.json({ok:true,ready:true,locked:true,writeEnabled:false,id:current.id,link:current.link,modified:current.modified,message:"Application validée mais écriture désactivée par l’environnement serveur."});
    }
    if(confirmation!=="APPLY_APPROVED_SEO_CHANGES"){
      return NextResponse.json({ok:false,error:"Confirmation explicite manquante."},{status:400});
    }
    if(proposedContent===expectedContent){
      return NextResponse.json({ok:false,error:"Aucune modification de contenu à appliquer."},{status:400});
    }

    // WordPress normally creates a revision when a published post/page is updated.
    // Capture the latest revision id before writing so the response can expose
    // a concrete rollback point in addition to the previous raw content.
    let previousRevisionId:number|null=null;
    try{
      const revRes=await fetch(endpoint+"/revisions?context=edit&per_page=1&_fields=id,parent,modified",{headers,cache:"no-store"});
      if(revRes.ok){
        const revisions=await revRes.json();
        previousRevisionId=Array.isArray(revisions)&&revisions[0]?.id?Number(revisions[0].id):null;
      }
    }catch{}

    const writeRes=await fetch(endpoint,{
      method:"POST",
      headers:{...headers,"Content-Type":"application/json"},
      body:JSON.stringify({content:proposedContent}),
      cache:"no-store"
    });
    if(!writeRes.ok){
      const detail=await writeRes.text();
      return NextResponse.json({ok:false,error:"Écriture WordPress refusée.",status:writeRes.status,detail:detail.slice(0,300)},{status:502});
    }

    const written=await writeRes.json();
    const verifyRes=await fetch(endpoint+"?context=edit&_fields=id,modified,content,link",{headers,cache:"no-store"});
    if(!verifyRes.ok)return NextResponse.json({ok:false,written:true,verified:false,error:"Contenu écrit mais relecture de vérification impossible.",previousContent:expectedContent,previousRevisionId},{status:502});
    const verified=await verifyRes.json();
    const verifiedRaw=String(verified.content?.raw??verified.content?.rendered??"");
    if(verifiedRaw!==proposedContent){
      return NextResponse.json({ok:false,written:true,verified:false,error:"WordPress a enregistré un contenu différent de celui attendu.",previousContent:expectedContent,previousRevisionId,currentContent:verifiedRaw},{status:409});
    }

    return NextResponse.json({
      ok:true,written:true,verified:true,locked:false,
      id:verified.id,link:verified.link,modified:verified.modified,
      previousContent:expectedContent,previousRevisionId,
      rollbackAvailable:true,
      message:"Modification WordPress appliquée et vérifiée. Snapshot précédent conservé pour rollback."
    });
  }catch(e){
    return NextResponse.json({ok:false,error:"Opération WordPress impossible.",detail:e instanceof Error?e.message:"Erreur inconnue"},{status:500});
  }
}

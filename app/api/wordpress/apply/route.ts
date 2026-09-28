import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function cfg(){
  const url=process.env.WORDPRESS_URL?.replace(/\/$/,"");
  const username=process.env.WORDPRESS_USERNAME;
  const password=process.env.WORDPRESS_APP_PASSWORD?.replace(/\s+/g,"");
  return url&&username&&password?{url,username,password}:null;
}
function auth(c:any){return "Basic "+Buffer.from(c.username+":"+c.password).toString("base64");}

export async function POST(req:Request){
  const c=cfg();
  if(!c)return NextResponse.json({ok:false,error:"Configuration WordPress incomplète."},{status:500});
  try{
    const body=await req.json();
    const {id,type,expectedModified,expectedContent,proposedContent}=body||{};
    if(!id||!["pages","posts"].includes(type)||!expectedModified||typeof expectedContent!=="string"||typeof proposedContent!=="string"){
      return NextResponse.json({ok:false,error:"Données de validation incomplètes."},{status:400});
    }
    const headers={Authorization:auth(c)};
    const currentRes=await fetch(`${c.url}/wp-json/wp/v2/${type}/${id}?context=edit&_fields=id,modified,content,title,link`,{headers,cache:"no-store"});
    if(!currentRes.ok)return NextResponse.json({ok:false,error:"Impossible de relire la version actuelle dans WordPress.",status:currentRes.status},{status:502});
    const current=await currentRes.json();
    const raw=String(current.content?.raw??current.content?.rendered??"");
    if(current.modified!==expectedModified||raw!==expectedContent){
      return NextResponse.json({ok:false,conflict:true,error:"Le contenu WordPress a changé depuis l’analyse. Nouvelle analyse obligatoire.",currentModified:current.modified},{status:409});
    }
    // Safety gate: write deliberately disabled until UI confirmation flow is validated.
    return NextResponse.json({ok:true,ready:true,locked:true,id:current.id,link:current.link,modified:current.modified,message:"Précontrôle réussi. Écriture WordPress toujours verrouillée."});
  }catch(e){
    return NextResponse.json({ok:false,error:"Précontrôle WordPress impossible.",detail:e instanceof Error?e.message:"Erreur inconnue"},{status:500});
  }
}

import { NextResponse } from "next/server";

export const dynamic="force-dynamic";

function cfg(){
  const url=process.env.WORDPRESS_URL?.replace(/\/$/,"");
  const username=process.env.WORDPRESS_USERNAME;
  const password=process.env.WORDPRESS_APP_PASSWORD?.replace(/\s+/g,"");
  return url&&username&&password?{url,username,password}:null;
}
function auth(c:any){return "Basic "+Buffer.from(c.username+":"+c.password).toString("base64");}
function sameOrigin(req:Request){
  const origin=req.headers.get("origin"),host=req.headers.get("host");
  if(!origin||!host)return false;
  try{return new URL(origin).host===host}catch{return false}
}
function replaceWidget(nodes:any[],widgetId:string,field:string,value:string):boolean{
  for(const node of Array.isArray(nodes)?nodes:[]){
    if(String(node?.id||"")===widgetId&&node?.settings&&typeof node.settings[field]==="string"){
      node.settings[field]=value;
      return true;
    }
    if(Array.isArray(node?.elements)&&replaceWidget(node.elements,widgetId,field,value))return true;
  }
  return false;
}

export async function POST(req:Request){
  const c=cfg();
  if(!c)return NextResponse.json({ok:false,error:"Configuration WordPress incomplète."},{status:500});
  if(!sameOrigin(req))return NextResponse.json({ok:false,error:"Origine refusée."},{status:403});
  try{
    const b=await req.json();
    const {id,type,widgetId,field="editor",proposedValue,expectedModified,dryRun=true,confirmation,prepareOnly=false}=b||{};
    if(!id||!["pages","posts"].includes(type)||!widgetId||typeof proposedValue!=="string"||!expectedModified)
      return NextResponse.json({ok:false,error:"Données Elementor incomplètes."},{status:400});

    const headers={Authorization:auth(c)};
    const endpoint=`${c.url}/wp-json/wp/v2/${type}/${id}`;
    const r=await fetch(endpoint+"?context=edit&_fields=id,modified,meta,link",{headers,cache:"no-store"});
    if(!r.ok)return NextResponse.json({ok:false,error:"Lecture Elementor impossible.",status:r.status},{status:502});
    const current=await r.json();
    if(current.modified!==expectedModified)return NextResponse.json({ok:false,conflict:true,error:"La page a changé depuis l’analyse."},{status:409});

    const raw=typeof current.meta?._elementor_data==="string"?current.meta._elementor_data:JSON.stringify(current.meta?._elementor_data||"");
    if(!raw)return NextResponse.json({ok:false,error:"Données Elementor indisponibles via l’API REST."},{status:409});
    let tree:any;
    try{tree=JSON.parse(raw)}catch{return NextResponse.json({ok:false,error:"Données Elementor illisibles."},{status:409})}
    const previousData=raw;
    if(!replaceWidget(tree,String(widgetId),String(field),proposedValue))
      return NextResponse.json({ok:false,error:"Widget Elementor ciblé introuvable."},{status:404});
    const proposedData=JSON.stringify(tree);

    if(dryRun===true||prepareOnly===true)return NextResponse.json({ok:true,dryRun:true,prepared:true,locked:true,widgetId,field,changed:proposedData!==previousData,writeEnabled:process.env.WORDPRESS_WRITE_ENABLED==="true",message:"Modification Elementor préparée et validée. Aucune écriture."});
    if(process.env.WORDPRESS_WRITE_ENABLED!=="true")return NextResponse.json({ok:true,ready:true,locked:true,writeEnabled:false,message:"Écriture Elementor désactivée côté serveur."});
    if(confirmation!=="APPLY_ELEMENTOR_WIDGET_CHANGE")return NextResponse.json({ok:false,error:"Confirmation Elementor manquante."},{status:400});

    const w=await fetch(endpoint,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({meta:{_elementor_data:proposedData}}),cache:"no-store"});
    if(!w.ok)return NextResponse.json({ok:false,error:"Écriture Elementor refusée.",status:w.status,detail:(await w.text()).slice(0,300)},{status:502});

    const v=await fetch(endpoint+"?context=edit&_fields=id,modified,meta,link",{headers,cache:"no-store"});
    if(!v.ok)return NextResponse.json({ok:false,written:true,verified:false,error:"Écriture effectuée mais vérification impossible.",previousData},{status:502});
    const after=await v.json();
    const afterRaw=typeof after.meta?._elementor_data==="string"?after.meta._elementor_data:JSON.stringify(after.meta?._elementor_data||"");
    if(afterRaw!==proposedData)return NextResponse.json({ok:false,written:true,verified:false,error:"Les données Elementor enregistrées diffèrent du résultat attendu.",previousData},{status:409});

    return NextResponse.json({ok:true,written:true,verified:true,widgetId,field,id:after.id,link:after.link,modified:after.modified,previousData,message:"Widget Elementor modifié et vérifié."});
  }catch(e){
    return NextResponse.json({ok:false,error:"Opération Elementor impossible.",detail:e instanceof Error?e.message:"Erreur inconnue"},{status:500});
  }
}

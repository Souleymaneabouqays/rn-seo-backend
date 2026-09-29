import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function config() {
  const url = process.env.WORDPRESS_URL?.replace(/\/$/, "");
  const username = process.env.WORDPRESS_USERNAME;
  const password = process.env.WORDPRESS_APP_PASSWORD?.replace(/\s+/g, "");
  if (!url || !username || !password) return null;
  return { url, username, password };
}

export async function GET(request: Request) {
  const c = config();
  if (!c) {
    return NextResponse.json(
      { ok: false, error: "Configuration WordPress incomplète dans Vercel." },
      { status: 500 }
    );
  }

  const auth = Buffer.from(`${c.username}:${c.password}`).toString("base64");
  try {
    const reqUrl = new URL(request.url);
    const analyzeUrls = reqUrl.searchParams.getAll("analyze");
    if (analyzeUrls.length) {
      const docs = [];
      for (const raw of analyzeUrls.slice(0, 4)) {
        const slug = new URL(raw).pathname.replace(/\/$/, "").split("/").filter(Boolean).pop() || "";
        let found = null;
        for (const type of ["pages", "posts"]) {
          const res = await fetch(c.url + "/wp-json/wp/v2/" + type + "?slug=" + encodeURIComponent(slug) + "&context=edit&_fields=id,slug,link,title,content,excerpt,modified", {
            headers: { Authorization: "Basic " + auth }, cache: "no-store"
          });
          if (res.ok) {
            const items = await res.json();
            if (items[0]) {
              const x = items[0];
              const html = x.content?.raw || x.content?.rendered || "";
              const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
              let builder="wordpress";
              let elementorEditMode="";
              let elementorData="";
              try{
                const metaRes=await fetch(c.url+"/wp-json/wp/v2/"+type+"/"+x.id+"?context=edit&_fields=meta",{
                  headers:{Authorization:"Basic "+auth},cache:"no-store"
                });
                if(metaRes.ok){
                  const meta=(await metaRes.json())?.meta||{};
                  elementorEditMode=String(meta._elementor_edit_mode||"");
                  elementorData=typeof meta._elementor_data==="string"?meta._elementor_data:JSON.stringify(meta._elementor_data||"");
                  if(elementorEditMode==="builder"||elementorData.length>10)builder="elementor";
                }
              }catch{}
              found = { found:true, type, id:x.id, url:x.link, slug:x.slug, title:(x.title?.raw || x.title?.rendered || "").replace(/<[^>]+>/g,""), words:text ? text.split(/\s+/).length : 0, content:text.slice(0,10000), rawContent:String(x.content?.raw || x.content?.rendered || ""), modified:x.modified, builder, elementor:{detected:builder==="elementor",editMode:elementorEditMode,dataAvailable:elementorData.length>10} };
              break;
            }
          }
        }
        docs.push(found || {found:false,url:raw,slug});
      }
      const good:any[] = docs.filter((d:any)=>d.found);
      let comparison:any = null;
      if (good.length >= 2) {
        const norm=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ");
        const stop=new Set(["avec","dans","pour","plus","vous","votre","cette","comme","mais","nous","des","les","une","sur","par","est","sont","aux","qui","que"]);
        const terms=(s:string)=>new Set(norm(s).split(/\s+/).filter(w=>w.length>3&&!stop.has(w)));
        const a=terms(good[0].content),b=terms(good[1].content);
        const shared=[...a].filter(x=>b.has(x));
        const overlap=Math.round(100*shared.length/Math.max(1,Math.min(a.size,b.size)));
        const article=good.find(x=>x.type==="posts"),landing=good.find(x=>x.type==="pages");
        const gscQueries=(reqUrl.searchParams.get("queries")||"").split("|").filter(Boolean);
        const cluster=reqUrl.searchParams.get("cluster")||gscQueries[0]||"";
        const evidence=norm([cluster,...gscQueries,...good.map((x:any)=>x.slug+" "+x.title)].join(" "));
        const city=(evidence.match(/marseille|toulon|sanary|brignoles?|seyne|six fours?|valette/i)||[])[0]||"";
        const entity=evidence.includes("punaise")?"punaises de lit":evidence.includes("cafard")?"cafards":evidence.includes("frelon")?"frelons":evidence.includes("guepe")?"guêpes":evidence.includes("deratisation")?"dératisation":"nuisibles";
        const cap=(s:string)=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
        const focus = good.map((x:any)=>{
          const role=x.type==="pages"?"Page de service locale":"Article informationnel";
          let proposedTitle=x.title;
          let objective="";
          if(x.type==="pages"){proposedTitle=entity==="punaises de lit"?"Traitement des punaises de lit"+(city?" à "+cap(city):""):cap(entity)+(city?" à "+cap(city):"");objective="Capter les requêtes transactionnelles et locales : traitement, intervention, entreprise, devis."}
          else{proposedTitle=entity==="punaises de lit"?"Punaises de lit"+(city?" à "+cap(city):"")+" : que faire en cas d’infestation ?":x.title;objective="Répondre aux recherches informationnelles : signes, causes, risques, gestes à faire et moment où contacter un professionnel."}
          const entityTokens=norm(entity).split(" ").filter(Boolean);
          if(!entityTokens.every((t:string)=>norm(proposedTitle).includes(t))) proposedTitle=x.title;
          const primary=gscQueries[0]||cluster;
          const sameTitle=proposedTitle.trim()===x.title.trim();
          const changes:any[]=[{field:"Titre",current:x.title,proposed:proposedTitle,reason:x.type==="pages"?"Aligner la page sur l’intention locale et transactionnelle observée dans Search Console.":"Séparer clairement l’intention informationnelle de la page de service.",needed:!sameTitle}];
          if(x.type==="pages")changes.push({field:"Introduction / premier bloc",current:"Contenu existant",proposed:"Vous avez repéré des punaises de lit"+(city?" à "+cap(city):"")+" ? Riviera Nuisibles intervient pour identifier l’infestation et mettre en place un traitement adapté à votre logement ou à votre établissement. Contactez-nous pour une intervention et un devis adaptés à votre situation.",reason:"Renforcer la pertinence commerciale locale avec un texte réellement prêt à être relu avant insertion.",needed:true,readyText:true});
          else changes.push({field:"Passage informationnel",current:"Article actuel",proposed:"En cas de suspicion de punaises de lit, commencez par vérifier les signes caractéristiques : piqûres regroupées, petites taches noires, traces sur la literie ou insectes visibles. Évitez de déplacer meubles et textiles d’une pièce à l’autre afin de limiter la dispersion. Si les signes persistent ou si l’infestation est confirmée, un diagnostic professionnel permet de choisir un traitement adapté.",reason:"Renforcer l’utilité informationnelle de l’article sans lui donner le même rôle commercial que la page de service.",needed:true,readyText:true});
          return {id:x.id,type:x.type,url:x.url,modified:x.modified,rawContent:x.rawContent,currentTitle:x.title,proposedTitle,role,objective,titleChanged:!sameTitle,primaryQuery:primary,changes};
        });
        const internalLink=article&&landing?{source:article.url,target:landing.url,anchor:city?"traitement des punaises de lit à "+cap(city):"traitement professionnel des punaises de lit",placement:"Dans le passage où l’article recommande de faire appel à un professionnel.",reason:"Transmettre le contexte commercial à la page de service et clarifier la hiérarchie entre les deux URL."}:null;
        comparison={internalLink,focus,overlap,sharedTerms:shared.slice(0,20),intent:article&&landing?"Les deux URL ont des rôles différents : un article informationnel et une page de service. Elles peuvent coexister si leurs intentions, titres et maillage sont clairement séparés.":"Les deux URL appartiennent au même type de contenu ; leur intention doit être différenciée avant toute modification.",recommendation:article&&landing?"Conserver les deux URL pour l\'instant. Renforcer la page de service sur l\'intention commerciale locale et l\'article sur l\'intention informationnelle, puis créer un lien interne clair de l\'article vers la page de service.":"Ne rien fusionner automatiquement. Vérifier quelle URL doit porter l\'intention principale puis différencier ou consolider les contenus après validation.",plan:article&&landing?[{target:landing.url,label:"Page de service",action:"Renforcer l’intention commerciale locale",details:"Conserver cette URL comme page principale pour la requête de service locale. Clarifier le titre et les premiers blocs autour du traitement, de l’intervention et de Marseille."},{target:article.url,label:"Article",action:"Renforcer l’intention informationnelle",details:"Conserver l’article pour répondre aux questions et symptômes. Éviter qu’il reprenne le même angle commercial que la page de service."},{target:article.url,label:"Maillage interne",action:"Créer un lien vers la page de service",details:"Ajouter dans l’article un lien contextuel clair vers la page de service afin d’indiquer la hiérarchie SEO."}]:[{target:good[0].url,label:"À valider",action:"Définir l’URL principale",details:"Comparer l’intention des deux contenus avant toute fusion, redirection ou réécriture."}]};
      }
      return NextResponse.json({ok:true,analysis:true,pages:docs,comparison});
    }
    const [meRes, pagesRes, postsRes] = await Promise.all([
      fetch(`${c.url}/wp-json/wp/v2/users/me?context=edit`, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      }),
      fetch(`${c.url}/wp-json/wp/v2/pages?per_page=10&status=publish,draft&context=edit&_fields=id,slug,status,link,title,modified`, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      }),
      fetch(`${c.url}/wp-json/wp/v2/posts?per_page=10&status=publish,draft&context=edit&_fields=id,slug,status,link,title,modified`, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      }),
    ]);

    if (!meRes.ok) {
      const detail = await meRes.text();
      return NextResponse.json(
        { ok: false, error: "Authentification WordPress refusée.", status: meRes.status, detail: detail.slice(0, 300) },
        { status: 502 }
      );
    }

    if (!pagesRes.ok || !postsRes.ok) {
      return NextResponse.json(
        { ok: false, error: "WordPress est connecté mais la lecture du contenu a échoué.", pagesStatus: pagesRes.status, postsStatus: postsRes.status },
        { status: 502 }
      );
    }

    const me = await meRes.json();
    const pages = await pagesRes.json();
    const posts = await postsRes.json();

    return NextResponse.json({
      ok: true,
      site: c.url,
      user: { id: me.id, name: me.name, roles: me.roles ?? [] },
      counts: { pagesReturned: pages.length, postsReturned: posts.length },
      pages,
      posts,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Impossible de joindre WordPress.", detail: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 502 }
    );
  }
}

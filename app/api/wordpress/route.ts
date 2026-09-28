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
              found = { found:true, type, id:x.id, url:x.link, slug:x.slug, title:(x.title?.raw || x.title?.rendered || "").replace(/<[^>]+>/g,""), words:text ? text.split(/\s+/).length : 0, content:text.slice(0,10000), modified:x.modified };
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
        const city=(cluster.match(/marseille|toulon|sanary|brignoles?|seyne|six fours?|valette/i)||[])[0]||"";
        const service=(cluster.match(/punaise|cafard|guepe|frelon|deratisation|desinfection/i)||[])[0]||"nuisibles";
        const cap=(s:string)=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
        const focus = good.map((x:any)=>{
          const role=x.type==="pages"?"Page de service locale":"Article informationnel";
          let proposedTitle=x.title;
          let objective="";
          if(x.type==="pages"){proposedTitle=service==="punaise"?"Traitement des punaises de lit"+(city?" à "+cap(city):""):cap(service)+(city?" à "+cap(city):"");objective="Capter les requêtes transactionnelles et locales : traitement, intervention, entreprise, devis."}
          else{proposedTitle=service==="punaise"?"Punaises de lit"+(city?" à "+cap(city):"")+" : que faire en cas d’infestation ?":x.title;objective="Répondre aux recherches informationnelles : signes, causes, risques, gestes à faire et moment où contacter un professionnel."}
          return {url:x.url,currentTitle:x.title,proposedTitle,role,objective,titleChanged:proposedTitle.trim()!==x.title.trim()};
        });
        comparison={focus,overlap,sharedTerms:shared.slice(0,20),intent:article&&landing?"Les deux URL ont des rôles différents : un article informationnel et une page de service. Elles peuvent coexister si leurs intentions, titres et maillage sont clairement séparés.":"Les deux URL appartiennent au même type de contenu ; leur intention doit être différenciée avant toute modification.",recommendation:article&&landing?"Conserver les deux URL pour l\'instant. Renforcer la page de service sur l\'intention commerciale locale et l\'article sur l\'intention informationnelle, puis créer un lien interne clair de l\'article vers la page de service.":"Ne rien fusionner automatiquement. Vérifier quelle URL doit porter l\'intention principale puis différencier ou consolider les contenus après validation.",plan:article&&landing?[{target:landing.url,label:"Page de service",action:"Renforcer l’intention commerciale locale",details:"Conserver cette URL comme page principale pour la requête de service locale. Clarifier le titre et les premiers blocs autour du traitement, de l’intervention et de Marseille."},{target:article.url,label:"Article",action:"Renforcer l’intention informationnelle",details:"Conserver l’article pour répondre aux questions et symptômes. Éviter qu’il reprenne le même angle commercial que la page de service."},{target:article.url,label:"Maillage interne",action:"Créer un lien vers la page de service",details:"Ajouter dans l’article un lien contextuel clair vers la page de service afin d’indiquer la hiérarchie SEO."}]:[{target:good[0].url,label:"À valider",action:"Définir l’URL principale",details:"Comparer l’intention des deux contenus avant toute fusion, redirection ou réécriture."}]};
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

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function config() {
  const url = process.env.WORDPRESS_URL?.replace(/\/$/, "");
  const username = process.env.WORDPRESS_USERNAME;
  const password = process.env.WORDPRESS_APP_PASSWORD?.replace(/\s+/g, "");
  if (!url || !username || !password) return null;
  return { url, username, password };
}

export async function GET() {
  const c = config();
  if (!c) {
    return NextResponse.json(
      { ok: false, error: "Configuration WordPress incomplète dans Vercel." },
      { status: 500 }
    );
  }

  const auth = Buffer.from(`${c.username}:${c.password}`).toString("base64");
  try {
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

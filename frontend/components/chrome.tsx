import Link from "next/link";
import Script from "next/script";
import { assetHref } from "@/lib/api";
import { snippetMatches } from "@/lib/html";
import type { Runtime, Snippet } from "@/lib/types";

export function SiteChrome({
  runtime,
  path,
  children,
}: {
  runtime: Runtime;
  path: string;
  children: React.ReactNode;
}) {
  const snippets = (runtime.snippets || []).filter((s) => snippetMatches(s.scope, s.slugs, path));
  const name = runtime.settings.site_name || "نگار";
  const menu = runtime.settings.menu || [];
  const assets = (runtime.plugins || []).flatMap((p) => p.assets || []);
  return (
    <>
      {assets.filter((a) => a.endsWith(".css")).map((href) => (
        <link key={href} rel="stylesheet" href={assetHref(href)} />
      ))}
      {runtime.settings.favicon ? <link rel="icon" href={runtime.settings.favicon} /> : null}
      <SnippetBlock snippets={snippets} location="head" />
      <SnippetBlock snippets={snippets} location="body_open" />
      <header className="site-header">
        <div className="wrap bar">
          <Link href="/" className="brand">
            {runtime.settings.logo ? <img src={runtime.settings.logo} alt="" style={{ height: 36, width: "auto" }} /> : <strong>{name}</strong>}
            {runtime.settings.tagline ? <span>{runtime.settings.tagline}</span> : null}
          </Link>
          <nav className="nav">
            {menu.map((item) => (
              <Link key={item.href + item.label} href={item.href || "/"}>{item.label}</Link>
            ))}
            <Link className="master-link" href="/master">مدیریت</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <SnippetBlock snippets={snippets} location="footer" />
      <footer className="site-footer">
        <div className="wrap">
          <strong>{name}</strong>
          <p>{runtime.settings.footer || runtime.settings.description}</p>
        </div>
      </footer>
      <SnippetBlock snippets={snippets} location="body_close" />
    </>
  );
}

function SnippetBlock({ snippets, location }: { snippets: Snippet[]; location: string }) {
  return snippets
    .filter((s) => s.location === location)
    .map((s) => {
      if (s.kind === "css") return <style key={s.id} dangerouslySetInnerHTML={{ __html: s.code }} />;
      if (s.kind === "js") return <Script key={s.id} id={`sn-${s.id}`} strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: s.code }} />;
      if (s.kind === "jsonld") return <script key={s.id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: s.code }} />;
      return <div key={s.id} dangerouslySetInnerHTML={{ __html: s.code }} />;
    });
}

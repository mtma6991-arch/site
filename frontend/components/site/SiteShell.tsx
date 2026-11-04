import type { ReactNode } from "react";
import type { SiteSettings, SnippetBundle } from "@/lib/types";

export function SiteShell({
  site,
  snippets,
  children,
}: {
  site: SiteSettings;
  snippets?: SnippetBundle;
  children: ReactNode;
}) {
  const dir = site.dir === "ltr" ? "ltr" : "rtl";
  const sn = snippets;
  return (
    <div dir={dir} lang={site.locale || "fa"} className="min-h-screen bg-paper text-ink">
      {sn?.css ? <style dangerouslySetInnerHTML={{ __html: sn.css }} /> : null}
      {sn?.jsHeader ? <script dangerouslySetInnerHTML={{ __html: sn.jsHeader }} /> : null}
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <a href="/" className="flex items-center gap-3">
            {site.logoUrl ? <img src={site.logoUrl} alt="" className="h-9 w-auto" /> : null}
            <span>
              <span className="block text-lg font-semibold">{site.siteTitle || "نگار"}</span>
              {site.tagline ? <span className="block text-xs text-muted">{site.tagline}</span> : null}
            </span>
          </a>
          <nav className="flex flex-wrap gap-4 text-sm">
            {(site.headerMenu || []).map((item) => (
              <a key={item.href + item.label} href={item.href} className="min-h-11 inline-flex items-center">{item.label}</a>
            ))}
          </nav>
        </div>
      </header>
      {sn?.bodyOpen?.length ? <div dangerouslySetInnerHTML={{ __html: sn.bodyOpen.map((s) => s.code).join("\n") }} /> : null}
      {sn?.header?.length ? <div dangerouslySetInnerHTML={{ __html: sn.header.map((s) => s.code).join("\n") }} /> : null}
      <main>{children}</main>
      {sn?.footer?.length ? <div dangerouslySetInnerHTML={{ __html: sn.footer.map((s) => s.code).join("\n") }} /> : null}
      <footer className="mt-10 border-t border-line bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm">
          <p>{site.footerText}</p>
          <nav className="flex gap-4">
            {(site.footerMenu || []).map((item) => (
              <a key={item.href + item.label} href={item.href}>{item.label}</a>
            ))}
          </nav>
        </div>
      </footer>
      {sn?.jsFooter ? <script dangerouslySetInnerHTML={{ __html: sn.jsFooter }} /> : null}
    </div>
  );
}

export const fallbackSite: SiteSettings = {
  siteTitle: "نگار",
  tagline: "",
  footerText: "",
  homepageSlug: "home",
  logoUrl: "",
  headerMenu: [],
  footerMenu: [],
  postsPerPage: 10,
  locale: "fa",
  dir: "rtl",
  domain: "",
};

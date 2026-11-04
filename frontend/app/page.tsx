import { BlockList } from "@/components/blocks/BlockView";
import { SiteShell, fallbackSite } from "@/components/site/SiteShell";
import { getPage, getSite } from "@/lib/public";

export const dynamic = "force-dynamic";

export default async function Home() {
  const boot = await getSite();
  const site = boot?.site || fallbackSite;
  const page = site.homepageSlug ? await getPage(site.homepageSlug) : null;
  return (
    <SiteShell site={page?.site || site} snippets={page?.snippets || boot?.snippets}>
      {page?.page ? (
        <BlockList nodes={page.page.tree || []} snippets={page.snippets} elements={page.elements} />
      ) : (
        <section className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="text-3xl font-semibold">سایت هنوز صفحهٔ خانه ندارد</h1>
          <p className="mt-3 text-muted">از پنل مدیریت یک صفحه بسازید و در تنظیمات به‌عنوان خانه انتخاب کنید.</p>
          <a href="/master" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-teal px-4 text-paper">ورود به پنل</a>
        </section>
      )}
    </SiteShell>
  );
}

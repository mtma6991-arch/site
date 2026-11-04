import { SiteShell, fallbackSite } from "@/components/site/SiteShell";
import { getPosts, getSite } from "@/lib/public";

export const dynamic = "force-dynamic";

export default async function Blog({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || 1));
  const boot = await getSite();
  const data = await getPosts(page);
  const site = boot?.site || fallbackSite;
  const items = data?.items || [];
  const total = data?.total || 0;
  const per = data?.perPage || 10;
  const pages = Math.max(1, Math.ceil(total / per));
  return (
    <SiteShell site={site} snippets={boot?.snippets}>
      <section className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-4xl font-semibold">وبلاگ</h1>
        <div className="mt-8 space-y-6">
          {items.length === 0 ? <p className="text-muted">هنوز مقاله‌ای منتشر نشده.</p> : null}
          {items.map((post) => (
            <article key={post.id} className="rounded-xl border border-line bg-card p-5">
              <h2 className="text-2xl font-semibold"><a href={"/blog/" + post.slug}>{post.title}</a></h2>
              {post.excerpt ? <p className="mt-2 leading-relaxed text-muted">{post.excerpt}</p> : null}
              <a href={"/blog/" + post.slug} className="mt-3 inline-flex min-h-11 items-center text-sm text-teal">خواندن</a>
            </article>
          ))}
        </div>
        {pages > 1 ? (
          <nav className="mt-8 flex gap-3 text-sm">
            {page > 1 ? <a className="min-h-11 inline-flex items-center" href={"/blog?page=" + (page - 1)}>قبلی</a> : null}
            {page < pages ? <a className="min-h-11 inline-flex items-center" href={"/blog?page=" + (page + 1)}>بعدی</a> : null}
          </nav>
        ) : null}
      </section>
    </SiteShell>
  );
}

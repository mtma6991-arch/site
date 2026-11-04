import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell, fallbackSite } from "@/components/site/SiteShell";
import { getPost, getSite } from "@/lib/public";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPost(slug);
  if (!data) return { title: "مقاله" };
  return { title: data.post.seoTitle || data.post.title, description: data.post.seoDescription || data.post.excerpt };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, boot] = await Promise.all([getPost(slug), getSite()]);
  if (!data) notFound();
  const post = data.post;
  return (
    <SiteShell site={boot?.site || fallbackSite} snippets={data.snippets}>
      <article className="mx-auto max-w-3xl px-6 py-14">
        {post.coverUrl ? <img src={post.coverUrl} alt="" className="mb-6 max-h-96 w-full rounded-xl object-cover" /> : null}
        <h1 className="text-4xl font-semibold leading-tight">{post.title}</h1>
        {post.excerpt ? <p className="mt-3 text-lg text-muted">{post.excerpt}</p> : null}
        {post.tags?.length ? <p className="mt-3 text-sm text-teal">{post.tags.join(" · ")}</p> : null}
        <div className="ng-prose mt-8" dangerouslySetInnerHTML={{ __html: post.content || "" }} />
      </article>
    </SiteShell>
  );
}

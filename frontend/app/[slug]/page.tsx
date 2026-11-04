import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlockList } from "@/components/blocks/BlockView";
import { SiteShell, fallbackSite } from "@/components/site/SiteShell";
import { getPage } from "@/lib/public";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPage(slug);
  if (!data) return { title: "نگار" };
  return {
    title: data.page.seoTitle || data.page.title,
    description: data.page.seoDescription || data.site.tagline,
  };
}

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPage(slug);
  if (!data) notFound();
  return (
    <SiteShell site={data.site || fallbackSite} snippets={data.snippets}>
      <BlockList nodes={data.page.tree || []} snippets={data.snippets} elements={data.elements} />
    </SiteShell>
  );
}

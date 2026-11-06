import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageView, pluginBlocksOf } from "@/components/render";
import { getPublishedPage, getRuntime, listPosts } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) return { title: "پیدا نشد" };
  return { title: page.seo_title || page.title, description: page.seo_description || "" };
}

export default async function SlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) notFound();
  const [runtime, posts] = await Promise.all([getRuntime(), listPosts(6)]);
  return <PageView doc={page.document} posts={posts} pluginBlocks={pluginBlocksOf(runtime.plugins)} snippets={runtime.snippets} />;
}

import type { Metadata } from "next";
import { PageView, pluginBlocksOf } from "@/components/render";
import { getPublishedPage, getRuntime, listPosts } from "@/lib/api";
import { emptyDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const runtime = await getRuntime();
  const page = await getPublishedPage("home");
  return {
    title: page?.seo_title || runtime.settings.seo_title || runtime.settings.site_name || "نگار",
    description: page?.seo_description || runtime.settings.seo_description || runtime.settings.description || "",
  };
}

export default async function HomePage() {
  const [runtime, page, posts] = await Promise.all([getRuntime(), getPublishedPage("home"), listPosts(6)]);
  return (
    <PageView
      doc={page?.document || emptyDoc()}
      posts={posts}
      pluginBlocks={pluginBlocksOf(runtime.plugins)}
      snippets={runtime.snippets}
    />
  );
}

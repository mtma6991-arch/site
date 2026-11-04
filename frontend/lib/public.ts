import type { ElementDef, PageRecord, PostRecord, SiteSettings, SnippetBundle } from "./types";

const base = () => process.env.INTERNAL_API_URL || "http://127.0.0.1:8090";

export async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(base() + "/api/v1" + path, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type PublicSite = { site: SiteSettings; snippets: SnippetBundle; elements: ElementDef[] };
export type PublicPage = PublicSite & { page: PageRecord };
export type PublicPost = { post: PostRecord; snippets: SnippetBundle };
export type PublicPosts = { items: PostRecord[]; page: number; perPage: number; total: number };

export function getSite() {
  return apiGet<PublicSite>("/public/site");
}
export function getPage(slug: string) {
  return apiGet<PublicPage>("/public/pages/" + encodeURIComponent(slug));
}
export function getPosts(page = 1) {
  return apiGet<PublicPosts>("/public/posts?page=" + page);
}
export function getPost(slug: string) {
  return apiGet<PublicPost>("/public/posts/" + encodeURIComponent(slug));
}

import type { PageDoc, PostCard, Runtime, Settings } from "./types";
import { asDoc } from "./types";

function internalBase(): string {
  return (process.env.PB_INTERNAL_URL || "http://127.0.0.1:8090").replace(/\/$/, "");
}

export async function getRuntime(): Promise<Runtime> {
  const fallback: Runtime = {
    settings: { site_name: "نگار", tagline: "", menu: [], footer: "" },
    snippets: [],
    plugins: [],
  };
  try {
    const res = await fetch(`${internalBase()}/api/negar/runtime`, { cache: "no-store" });
    if (!res.ok) return fallback;
    const data = (await res.json()) as Runtime;
    if (!data.settings) data.settings = fallback.settings;
    if (!Array.isArray(data.settings.menu)) data.settings.menu = [];
    data.snippets = data.snippets || [];
    data.plugins = data.plugins || [];
    return data;
  } catch {
    return fallback;
  }
}

type List<T> = { items?: T[] };

async function pbGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${internalBase()}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getPublishedPage(slug: string): Promise<{
  title: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  document: PageDoc;
} | null> {
  const safe = slug.replace(/'/g, "");
  const filter = encodeURIComponent(`slug='${safe}' && status='published'`);
  const data = await pbGet<List<Record<string, unknown>>>(
    `/api/collections/pages/records?perPage=1&filter=${filter}`,
  );
  const item = data?.items?.[0];
  if (!item) return null;
  return {
    title: String(item.title || ""),
    slug: String(item.slug || ""),
    seo_title: String(item.seo_title || ""),
    seo_description: String(item.seo_description || ""),
    document: asDoc(item.document),
  };
}

function mapPost(item: Record<string, unknown>): PostCard {
  return {
    id: String(item.id || ""),
    title: String(item.title || ""),
    slug: String(item.slug || ""),
    excerpt: String(item.excerpt || ""),
    cover: String(item.cover || ""),
    category: String(item.category || ""),
    author_name: String(item.author_name || ""),
    published_at: String(item.published_at || ""),
    content: String(item.content || ""),
    tags: String(item.tags || ""),
    status: String(item.status || ""),
  };
}

export async function listPosts(perPage = 9): Promise<PostCard[]> {
  const filter = encodeURIComponent(`status='published'`);
  const data = await pbGet<List<Record<string, unknown>>>(
    `/api/collections/posts/records?perPage=${perPage}&sort=-published_at&filter=${filter}`,
  );
  return (data?.items || []).map(mapPost);
}

export async function getPost(slug: string): Promise<PostCard | null> {
  const safe = slug.replace(/'/g, "");
  const filter = encodeURIComponent(`slug='${safe}' && status='published'`);
  const data = await pbGet<List<Record<string, unknown>>>(
    `/api/collections/posts/records?perPage=1&filter=${filter}`,
  );
  const item = data?.items?.[0];
  return item ? mapPost(item) : null;
}

export function assetHref(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const env = process.env.NEXT_PUBLIC_PB_URL?.replace(/\/$/, "");
  if (env) return env + path;
  return "/pb" + path;
}

export function siteName(settings: Settings | undefined): string {
  return settings?.site_name || "نگار";
}

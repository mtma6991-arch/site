export type MenuItem = { label: string; href: string };

export type Settings = {
  site_name: string;
  tagline?: string;
  description?: string;
  logo?: string;
  favicon?: string;
  footer?: string;
  menu?: MenuItem[];
  posts_per_page?: number;
  seo_title?: string;
  seo_description?: string;
};

export type Snippet = {
  id: string;
  name: string;
  description?: string;
  code: string;
  kind: "html" | "css" | "js" | "jsonld" | string;
  location: "head" | "body_open" | "body_close" | "footer" | string;
  scope: "all" | "pages" | string;
  slugs?: string;
  priority?: number;
};

export type PluginField = {
  key: string;
  label: string;
  type: string;
  options?: { value: string; label: string }[];
  itemFields?: PluginField[];
};

export type PluginBlock = {
  type: string;
  label: string;
  group?: string;
  icon?: string;
  defaults?: Record<string, unknown>;
  fields?: PluginField[];
  template?: string;
};

export type PluginInfo = {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  enabled: boolean;
  admin?: { menu?: string; route?: string } | null;
  assets?: string[];
  blocks?: PluginBlock[] | null;
  settingsForm?: {
    title?: string;
    intro?: string;
    fields?: PluginField[];
  } | null;
};

export type Runtime = {
  settings: Settings;
  snippets: Snippet[];
  plugins: PluginInfo[];
};

export type Block = {
  id: string;
  type: string;
  props: Record<string, any>;
};

export type Column = { id: string; blocks: Block[] };

export type Row = {
  id: string;
  props: { bg?: string; pad?: string; full?: boolean };
  columns: Column[];
};

export type PageDoc = { version: 1; rows: Row[] };

export type PostCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover: string;
  category: string;
  author_name: string;
  published_at: string;
  content?: string;
  tags?: string;
  status?: string;
};

export const RESERVED_SLUGS = new Set([
  "blog",
  "master",
  "developers",
  "pb",
  "api",
  "login",
  "_next",
]);

export function emptyDoc(): PageDoc {
  return { version: 1, rows: [] };
}

export function asDoc(v: unknown): PageDoc {
  let value = v;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return emptyDoc();
    }
  }
  if (value && typeof value === "object" && Array.isArray((value as PageDoc).rows)) {
    return value as PageDoc;
  }
  return emptyDoc();
}

export function uid(prefix = "b"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

export function publicPath(slug: string): string {
  if (!slug || slug === "home") return "/";
  return `/${slug}`;
}

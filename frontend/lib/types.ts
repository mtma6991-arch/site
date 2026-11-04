export type MenuItem = { label: string; href: string };

export type SiteSettings = {
  siteTitle: string;
  tagline: string;
  footerText: string;
  homepageSlug: string;
  logoUrl: string;
  headerMenu: MenuItem[];
  footerMenu: MenuItem[];
  postsPerPage: number;
  locale: string;
  dir: "rtl" | "ltr";
  domain: string;
};

export type User = { id: string; email: string; name: string; role: "admin" | "editor" };

export type BlockNode = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: BlockNode[];
};

export type PageRecord = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  tree: BlockNode[];
  seoTitle: string;
  seoDescription: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PostRecord = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  status: "draft" | "published";
  coverUrl: string;
  coverId: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type MediaItem = {
  id: string;
  url: string;
  alt: string;
  title: string;
  mime: string;
  size: number;
  filename: string;
  createdAt: string;
};

export type PropOption = { value: string; label: string };

export type PropDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "switch" | "color" | "align" | "url" | "image" | "repeater";
  default?: unknown;
  options?: PropOption[];
  itemFields?: PropDef[];
};

export type ElementDef = {
  type: string;
  label: string;
  category: string;
  plugin?: string;
  props: PropDef[];
  hidden?: boolean;
};

export type PluginInfo = {
  name: string;
  slug: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  needsRebuild?: boolean;
  hasElements?: boolean;
  admin?: { menu: string; path: string };
  capabilities?: string[];
};

export type Snippet = {
  id: string;
  title: string;
  slug: string;
  description: string;
  code: string;
  kind: "html" | "css" | "js" | "shortcode";
  location: "header" | "footer" | "body_open" | "shortcode";
  active: boolean;
  priority: number;
  pages: string[];
  updatedAt: string;
};

export type SnippetBundle = {
  header: { id: string; kind: string; code: string; slug: string }[];
  footer: { id: string; kind: string; code: string; slug: string }[];
  bodyOpen: { id: string; kind: string; code: string; slug: string }[];
  css: string;
  jsHeader: string;
  jsFooter: string;
  shortcodes: Record<string, string>;
};

export type FormSubmission = {
  id: string;
  form: string;
  pageSlug: string;
  data: Record<string, string>;
  createdAt: string;
};

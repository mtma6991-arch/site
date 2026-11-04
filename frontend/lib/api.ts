"use client";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const TOKEN = "negar_token";

export function token() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN);
}

export function setToken(value: string | null) {
  if (value) localStorage.setItem(TOKEN, value);
  else localStorage.removeItem(TOKEN);
}

async function req<T>(path: string, opt: RequestInit = {}): Promise<T> {
  const headers = new Headers(opt.headers);
  const auth = token();
  if (auth) headers.set("Authorization", "Bearer " + auth);
  if (opt.body && !(opt.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch("/api/v1" + path, { ...opt, headers });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.message === "string" ? data.message : "خطا در ارتباط با سرور";
    if (res.status === 401 && typeof window !== "undefined" && !location.pathname.startsWith("/master/login")) {
      setToken(null);
      location.href = "/master/login";
    }
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    req<{ token: string; user: import("./types").User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => req<{ user: import("./types").User }>("/auth/me"),
  password: (current: string, next: string) =>
    req("/auth/password", { method: "POST", body: JSON.stringify({ current, next }) }),
  stats: () =>
    req<{ pages: number; publishedPages: number; posts: number; publishedPosts: number; media: number; submissions: number }>(
      "/stats",
    ),
  pages: {
    list: (q = "") => req<{ items: import("./types").PageRecord[] }>("/pages?q=" + encodeURIComponent(q)),
    get: (id: string) => req<import("./types").PageRecord>("/pages/" + id),
    create: (title: string) =>
      req<import("./types").PageRecord>("/pages", { method: "POST", body: JSON.stringify({ title }) }),
    update: (id: string, body: Partial<import("./types").PageRecord>) =>
      req<import("./types").PageRecord>("/pages/" + id, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string) => req("/pages/" + id, { method: "DELETE" }),
    publish: (id: string) => req<import("./types").PageRecord>("/pages/" + id + "/publish", { method: "POST" }),
    unpublish: (id: string) => req<import("./types").PageRecord>("/pages/" + id + "/unpublish", { method: "POST" }),
    duplicate: (id: string) => req<import("./types").PageRecord>("/pages/" + id + "/duplicate", { method: "POST" }),
  },
  posts: {
    list: (q = "") => req<{ items: import("./types").PostRecord[] }>("/posts?q=" + encodeURIComponent(q)),
    get: (id: string) => req<import("./types").PostRecord>("/posts/" + id),
    create: (title: string) =>
      req<import("./types").PostRecord>("/posts", { method: "POST", body: JSON.stringify({ title }) }),
    update: (id: string, body: Partial<import("./types").PostRecord>) =>
      req<import("./types").PostRecord>("/posts/" + id, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string) => req("/posts/" + id, { method: "DELETE" }),
    publish: (id: string) => req<import("./types").PostRecord>("/posts/" + id + "/publish", { method: "POST" }),
    unpublish: (id: string) => req<import("./types").PostRecord>("/posts/" + id + "/unpublish", { method: "POST" }),
  },
  media: {
    list: () => req<{ items: import("./types").MediaItem[] }>("/media"),
    upload: (file: File, alt = "") => {
      const body = new FormData();
      body.set("file", file);
      body.set("alt", alt);
      body.set("title", file.name);
      return req<import("./types").MediaItem>("/media", { method: "POST", body });
    },
    update: (id: string, data: { alt?: string; title?: string }) =>
      req<import("./types").MediaItem>("/media/" + id, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: string) => req("/media/" + id, { method: "DELETE" }),
  },
  settings: {
    get: () => req<import("./types").SiteSettings>("/settings"),
    save: (body: Partial<import("./types").SiteSettings> & { removeLogo?: boolean }) =>
      req<import("./types").SiteSettings>("/settings", { method: "PUT", body: JSON.stringify(body) }),
    logo: (file: File) => {
      const body = new FormData();
      body.set("file", file);
      return req<import("./types").SiteSettings>("/settings/logo", { method: "POST", body });
    },
  },
  plugins: {
    list: () => req<{ items: import("./types").PluginInfo[] }>("/plugins"),
    elements: () => req<{ items: import("./types").ElementDef[] }>("/plugins/elements"),
    enable: (slug: string) => req("/plugins/" + slug + "/enable", { method: "POST" }),
    disable: (slug: string) => req("/plugins/" + slug + "/disable", { method: "POST" }),
    upload: (file: File) => {
      const body = new FormData();
      body.set("file", file);
      return req<{ plugin: import("./types").PluginInfo; needsRebuild: boolean }>("/plugins/upload", {
        method: "POST",
        body,
      });
    },
  },
  snippets: {
    list: () => req<{ items: import("./types").Snippet[] }>("/snippets"),
    create: (body: Partial<import("./types").Snippet>) =>
      req<import("./types").Snippet>("/snippets", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<import("./types").Snippet>) =>
      req<import("./types").Snippet>("/snippets/" + id, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string) => req("/snippets/" + id, { method: "DELETE" }),
  },
  users: {
    list: () => req<{ items: import("./types").User[] }>("/users"),
    create: (body: { email: string; password: string; name: string; role: string }) =>
      req<{ user: import("./types").User }>("/users", { method: "POST", body: JSON.stringify(body) }),
    remove: (id: string) => req("/users/" + id, { method: "DELETE" }),
  },
  forms: {
    list: () => req<{ items: import("./types").FormSubmission[] }>("/forms"),
    remove: (id: string) => req("/forms/" + id, { method: "DELETE" }),
  },
};

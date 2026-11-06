const ALLOWED = new Set([
  "p", "br", "h2", "h3", "h4", "ul", "ol", "li", "a", "strong", "em", "u", "s",
  "blockquote", "img", "code", "pre", "span", "div", "hr", "figure", "figcaption", "b", "i",
]);

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function safeUrl(input: string): string {
  const v = (input || "").trim();
  if (!v) return "#";
  if (v.startsWith("/") || v.startsWith("#") || v.startsWith("mailto:") || v.startsWith("tel:")) return v;
  if (/^https?:\/\//i.test(v)) return v;
  return "#";
}

export function sanitizeHtml(input: string): string {
  const stripped = (input || "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*\/?\s*>/gi, "");
  return stripped.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, tag: string, attrs: string) => {
    const t = tag.toLowerCase();
    if (!ALLOWED.has(t)) return "";
    if (full.startsWith("</")) return `</${t}>`;
    const safe = sanitizeAttrs(t, attrs || "");
    if (t === "br" || t === "hr" || t === "img") return `<${t}${safe}>`;
    return `<${t}${safe}>`;
  });
}

function sanitizeAttrs(tag: string, attrs: string): string {
  const out: string[] = [];
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrs))) {
    const name = m[1].toLowerCase();
    const value = m[3] ?? m[4] ?? m[5] ?? "";
    if (name.startsWith("on")) continue;
    if (tag === "a" && name === "href") {
      const href = safeUrl(value);
      out.push(` href="${escapeHtml(href)}"`);
      if (href.startsWith("http")) out.push(` rel="noopener noreferrer" target="_blank"`);
    } else if (tag === "img" && name === "src") {
      const src = safeUrl(value);
      if (src !== "#") out.push(` src="${escapeHtml(src)}"`);
    } else if (tag === "img" && (name === "alt" || name === "title")) {
      out.push(` ${name}="${escapeHtml(value)}"`);
    } else if (name === "class") {
      const cls = value.replace(/[^a-zA-Z0-9_\- ]/g, "").slice(0, 80);
      if (cls) out.push(` class="${cls}"`);
    }
  }
  return out.join("");
}

export function renderTemplate(tpl: string, props: Record<string, any>): string {
  const withSections = tpl.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_all, key: string, inner: string) => {
    const val = props[key];
    if (Array.isArray(val)) {
      return val
        .map((item) => {
          if (item && typeof item === "object") return renderTemplate(inner, item as Record<string, any>);
          return escapeHtml(String(item ?? ""));
        })
        .join("");
    }
    if (val) return renderTemplate(inner, props);
    return "";
  });
  return withSections
    .replace(/\{\{\{(\w+)\}\}\}/g, (_a, key: string) => String(props[key] ?? ""))
    .replace(/\{\{(\w+)\}\}/g, (_a, key: string) => escapeHtml(String(props[key] ?? "")));
}

export function applySnippets(html: string, snippets: { id: string; code: string; enabled?: boolean }[]): string {
  if (!html) return "";
  return html.replace(/\[snippet\s+id="([^"]+)"\]/g, (all, id: string) => {
    const found = snippets.find((s) => s.id === id);
    return found ? found.code : all;
  });
}

export function snippetMatches(scope: string, slugs: string | undefined, path: string): boolean {
  if (scope !== "pages") return true;
  const wanted = (slugs || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (wanted.length === 0) return false;
  const slug = path === "/" ? "home" : path.replace(/^\//, "").split("/")[0];
  return wanted.includes(slug) || wanted.includes(path);
}

export function renderMarkdown(src: string): string {
  const escaped = escapeHtml(src.replace(/\r\n/g, "\n"));
  const fences: string[] = [];
  let text = escaped.replace(/```([\s\S]*?)```/g, (_a, code: string) => {
    const i = fences.push(`<pre><code>${code.replace(/^\n/, "").replace(/\n$/, "")}</code></pre>`);
    return `\n@@FENCE${i - 1}@@\n`;
  });
  text = text
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>")
    .replace(/^(?:\|.+\|\n)+/gm, (table) => {
      const rows = table.trim().split("\n").filter((r) => !/^\|\s*-+/.test(r));
      const body = rows
        .map((row, idx) => {
          const cells = row.split("|").slice(1, -1).map((c) => c.trim());
          const tag = idx === 0 ? "th" : "td";
          return `<tr>${cells.map((c) => `<${tag}>${inline(c)}</${tag}>`).join("")}</tr>`;
        })
        .join("");
      return `<table>${body}</table>`;
    });
  const lines = text.split("\n");
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  const close = () => {
    if (list) {
      out.push(list === "ul" ? "</ul>" : "</ol>");
      list = null;
    }
  };
  for (const line of lines) {
    const ul = line.match(/^[-*] (.+)/);
    const ol = line.match(/^\d+\. (.+)/);
    if (ul) {
      if (list !== "ul") {
        close();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }
    if (ol) {
      if (list !== "ol") {
        close();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }
    close();
    if (!line.trim()) continue;
    if (/^<(h\d|blockquote|table|pre)/.test(line) || line.startsWith("@@FENCE")) {
      out.push(line);
    } else {
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  close();
  return out
    .join("\n")
    .replace(/@@FENCE(\d+)@@/g, (_a, i: string) => fences[Number(i)] || "");
}

function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_a, label: string, href: string) => {
      const url = safeUrl(href);
      return `<a href="${escapeHtml(url)}">${label}</a>`;
    });
}

export function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(d);
  } catch {
    return d.toLocaleDateString("fa-IR");
  }
}

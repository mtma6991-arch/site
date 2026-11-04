"use client";

import { useEffect, useState } from "react";
import type { BlockNode, ElementDef, SnippetBundle } from "@/lib/types";
import { Glyph } from "./icons";

type Ctx = {
  editing?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  snippets?: SnippetBundle;
  elements?: ElementDef[];
};

function str(p: Record<string, unknown>, k: string, fb = "") {
  const v = p[k];
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : fb;
}
function on(p: Record<string, unknown>, k: string) {
  return p[k] === true;
}
function list(p: Record<string, unknown>, k: string) {
  return Array.isArray(p[k]) ? (p[k] as Record<string, unknown>[]) : [];
}
function lines(v: string) {
  return v.split("\n").map((s) => s.trim()).filter(Boolean);
}
function align(v: string) {
  if (v === "center") return "text-center";
  if (v === "end") return "text-end";
  return "text-start";
}
function applyShort(html: string, sn?: SnippetBundle) {
  if (!sn) return html;
  return html.replace(/\[\[snippet:([a-z0-9-]+)\]\]/gi, (_, slug: string) => sn.shortcodes?.[slug] || "");
}
function videoSrc(url: string) {
  const yt = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}
function tone(t: string) {
  if (t === "paper") return "bg-card text-ink";
  if (t === "teal") return "bg-teal text-paper";
  return "bg-ink text-paper";
}
function alertTone(t: string) {
  if (t === "warn") return "border-clay bg-card text-ink";
  if (t === "success") return "border-ok bg-card text-ink";
  if (t === "danger") return "border-danger bg-card text-ink";
  return "border-teal bg-card text-ink";
}

function stop(editing: boolean | undefined, e: React.MouseEvent) {
  if (editing) e.preventDefault();
}

export function BlockList({ nodes, ...ctx }: { nodes: BlockNode[] } & Ctx) {
  if (!nodes?.length) {
    return ctx.editing ? <p className="px-4 py-8 text-center text-sm text-muted">اینجا هنوز چیزی نیست.</p> : null;
  }
  return (
    <div className="flex flex-col">
      {nodes.map((n) => (
        <Block key={n.id} node={n} {...ctx} />
      ))}
    </div>
  );
}

function Block({ node, ...ctx }: { node: BlockNode } & Ctx) {
  const selected = ctx.editing && ctx.selectedId === node.id;
  return (
    <div
      data-block={node.type}
      onClick={(e) => {
        if (!ctx.editing) return;
        e.stopPropagation();
        ctx.onSelect?.(node.id);
      }}
      className={selected ? "ring-2 ring-teal ring-offset-2 ring-offset-paper" : undefined}
    >
      <Render node={node} {...ctx} />
    </div>
  );
}

function Render({ node, ...ctx }: { node: BlockNode } & Ctx) {
  const p = node.props || {};
  const kids = node.children || [];
  switch (node.type) {
    case "section": {
      const pad = str(p, "padding", "md");
      const py = pad === "sm" ? "py-8" : pad === "lg" ? "py-24" : "py-14";
      const w = str(p, "width", "default");
      const max = w === "narrow" ? "max-w-2xl" : w === "wide" ? "max-w-6xl" : w === "full" ? "max-w-none" : "max-w-5xl";
      return (
        <section style={{ background: str(p, "background", "#f3efe6") }} className={py}>
          <div className={`mx-auto px-5 ${max}`}>
            <BlockList nodes={kids} {...ctx} />
          </div>
        </section>
      );
    }
    case "columns": {
      const n = Math.min(4, Math.max(1, kids.length || 1));
      const gap = str(p, "gap", "md") === "sm" ? "gap-3" : str(p, "gap") === "lg" ? "gap-10" : "gap-6";
      const cols = n === 4 ? "md:grid-cols-4" : n === 3 ? "md:grid-cols-3" : n === 2 ? "md:grid-cols-2" : "grid-cols-1";
      return (
        <div className={`grid grid-cols-1 ${cols} ${gap}`}>
          {kids.map((c) => (
            <Block key={c.id} node={c} {...ctx} />
          ))}
        </div>
      );
    }
    case "column":
      return (
        <div className="min-h-8">
          <BlockList nodes={kids} {...ctx} />
        </div>
      );
    case "heading": {
      const level = str(p, "level", "2");
      const Tag = (level === "1" ? "h1" : level === "3" ? "h3" : level === "4" ? "h4" : "h2") as "h1";
      const size = level === "1" ? "text-4xl md:text-5xl" : level === "3" ? "text-2xl" : level === "4" ? "text-xl" : "text-3xl";
      return <Tag className={`${size} font-semibold leading-tight ${align(str(p, "align"))}`} style={{ color: str(p, "color", "#1c1915") }}>{str(p, "text")}</Tag>;
    }
    case "text": {
      const size = str(p, "size") === "sm" ? "text-sm" : str(p, "size") === "lg" ? "text-lg" : "text-base";
      return <p className={`${size} leading-relaxed whitespace-pre-wrap ${align(str(p, "align"))} ${on(p, "muted") ? "text-muted" : ""}`}>{str(p, "text")}</p>;
    }
    case "richtext":
    case "html":
      return <div className="ng-prose" dangerouslySetInnerHTML={{ __html: applyShort(str(p, "html"), ctx.snippets) }} />;
    case "button": {
      const v = str(p, "variant", "primary");
      const cls = v === "ghost" ? "border border-line bg-transparent text-ink" : v === "dark" ? "bg-ink text-paper" : "bg-teal text-paper";
      return (
        <div className={align(str(p, "align"))}>
          <a href={str(p, "href", "#")} target={on(p, "newTab") ? "_blank" : undefined} rel="noreferrer" onClick={(e) => stop(ctx.editing, e)} className={`inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-medium ${cls}`}>{str(p, "label", "ادامه")}</a>
        </div>
      );
    }
    case "image": {
      const url = str(p, "url");
      if (!url) return ctx.editing ? <div className="border border-dashed border-line bg-mist px-4 py-10 text-center text-sm text-muted">تصویر را از رسانه انتخاب کنید</div> : null;
      const radius = str(p, "radius") === "none" ? "rounded-none" : str(p, "radius") === "full" ? "rounded-full" : "rounded-xl";
      return (
        <figure className={align(str(p, "align"))}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={str(p, "alt")} className={`inline-block max-w-full ${radius}`} />
          {str(p, "caption") ? <figcaption className="mt-2 text-sm text-muted">{str(p, "caption")}</figcaption> : null}
        </figure>
      );
    }
    case "video": {
      const url = str(p, "url");
      if (!url) return null;
      const src = videoSrc(url);
      if (src.endsWith(".mp4") || src.endsWith(".webm")) return <video className="w-full rounded-xl" controls src={src} />;
      return <div className="aspect-video overflow-hidden rounded-xl"><iframe title={str(p, "title", "ویدیو")} src={src} className="h-full w-full" allowFullScreen /></div>;
    }
    case "spacer": {
      const h = str(p, "size") === "sm" ? "h-4" : str(p, "size") === "lg" ? "h-16" : str(p, "size") === "xl" ? "h-28" : "h-8";
      return <div className={h} />;
    }
    case "divider":
      return <hr className="my-4 border-0 border-t" style={{ borderColor: str(p, "color", "#ddd4c4") }} />;
    case "list": {
      const items = lines(str(p, "items"));
      const Tag = on(p, "ordered") ? "ol" : "ul";
      return <Tag className={`space-y-1 ps-5 leading-relaxed ${on(p, "ordered") ? "list-decimal" : "list-disc"}`}>{items.map((it) => <li key={it}>{it}</li>)}</Tag>;
    }
    case "quote":
      return <blockquote className="border-s-4 border-teal ps-4"><p className="text-lg leading-relaxed">{str(p, "text")}</p>{str(p, "cite") ? <cite className="mt-2 block text-sm text-muted not-italic">{str(p, "cite")}</cite> : null}</blockquote>;
    case "hero":
      return (
        <section className={tone(str(p, "tone", "ink"))}>
          <div className={`mx-auto max-w-5xl px-6 py-20 ${align(str(p, "align"))}`}>
            {str(p, "eyebrow") ? <p className="mb-3 text-sm tracking-wide opacity-80">{str(p, "eyebrow")}</p> : null}
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">{str(p, "title")}</h1>
            {str(p, "subtitle") ? <p className="mt-5 max-w-2xl text-lg leading-relaxed opacity-90">{str(p, "subtitle")}</p> : null}
            <div className="mt-8 flex flex-wrap gap-3">
              {str(p, "buttonLabel") ? <a href={str(p, "buttonHref", "/")} onClick={(e) => stop(ctx.editing, e)} className="inline-flex min-h-11 items-center rounded-lg bg-teal px-4 py-2 text-sm font-medium text-paper">{str(p, "buttonLabel")}</a> : null}
              {str(p, "secondaryLabel") ? <a href={str(p, "secondaryHref", "/")} onClick={(e) => stop(ctx.editing, e)} className="inline-flex min-h-11 items-center rounded-lg border border-current px-4 py-2 text-sm">{str(p, "secondaryLabel")}</a> : null}
            </div>
          </div>
        </section>
      );
    case "cta":
      return (
        <section className={tone(str(p, "tone", "teal"))}>
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-6 py-14 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{str(p, "title")}</h2>
              {str(p, "text") ? <p className="mt-2 max-w-xl leading-relaxed opacity-90">{str(p, "text")}</p> : null}
            </div>
            {str(p, "buttonLabel") ? <a href={str(p, "buttonHref", "/")} onClick={(e) => stop(ctx.editing, e)} className="inline-flex min-h-11 items-center rounded-lg bg-paper px-4 py-2 text-sm font-medium text-ink">{str(p, "buttonLabel")}</a> : null}
          </div>
        </section>
      );
    case "features":
      return (
        <section className="mx-auto max-w-6xl px-6 py-16">
          {str(p, "title") ? <h2 className="text-3xl font-semibold">{str(p, "title")}</h2> : null}
          {str(p, "subtitle") ? <p className="mt-2 max-w-2xl text-muted">{str(p, "subtitle")}</p> : null}
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {list(p, "items").map((it, i) => (
              <article key={i} className="rounded-xl border border-line bg-card p-5">
                <div className="text-teal"><Glyph name={str(it, "icon", "layout")} /></div>
                <h3 className="mt-3 text-lg font-semibold">{str(it, "title")}</h3>
                <p className="mt-1 leading-relaxed text-muted">{str(it, "text")}</p>
              </article>
            ))}
          </div>
        </section>
      );
    case "stats":
      return (
        <section className="bg-ink text-paper">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-12 md:grid-cols-4">
            {list(p, "items").map((it, i) => (
              <div key={i}>
                <div className="text-3xl font-semibold text-teal">{str(it, "value")}</div>
                <div className="mt-1 text-sm opacity-80">{str(it, "label")}</div>
              </div>
            ))}
          </div>
        </section>
      );
    case "cards":
      return (
        <section className="mx-auto max-w-6xl px-6 py-16">
          {str(p, "title") ? <h2 className="mb-6 text-3xl font-semibold">{str(p, "title")}</h2> : null}
          <div className="grid gap-4 md:grid-cols-3">
            {list(p, "items").map((it, i) => (
              <a key={i} href={str(it, "href", "#")} onClick={(e) => stop(ctx.editing, e)} className="overflow-hidden rounded-xl border border-line bg-card">
                {str(it, "imageUrl") ? <img src={str(it, "imageUrl")} alt="" className="h-40 w-full object-cover" /> : null}
                <div className="p-4">
                  <h3 className="font-semibold">{str(it, "title")}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{str(it, "text")}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      );
    case "testimonials":
      return (
        <section className="mx-auto max-w-5xl px-6 py-16">
          {str(p, "title") ? <h2 className="mb-6 text-3xl font-semibold">{str(p, "title")}</h2> : null}
          <div className="grid gap-4">
            {list(p, "items").map((it, i) => (
              <blockquote key={i} className="rounded-xl border border-line bg-card p-6">
                <p className="text-lg leading-relaxed">{str(it, "quote")}</p>
                <footer className="mt-3 text-sm text-muted">{str(it, "name")}{str(it, "role") ? ` — ${str(it, "role")}` : ""}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      );
    case "pricing":
      return (
        <section className="mx-auto max-w-6xl px-6 py-16">
          {str(p, "title") ? <h2 className="mb-6 text-3xl font-semibold">{str(p, "title")}</h2> : null}
          <div className="grid gap-4 md:grid-cols-3">
            {list(p, "items").map((it, i) => (
              <article key={i} className={`rounded-xl border p-6 ${on(it, "highlighted") ? "border-teal bg-ink text-paper" : "border-line bg-card"}`}>
                <h3 className="text-lg font-semibold">{str(it, "name")}</h3>
                <p className="mt-3 text-3xl font-semibold">{str(it, "price")}<span className="ms-2 text-sm font-normal opacity-70">{str(it, "period")}</span></p>
                <ul className="mt-4 space-y-1 text-sm leading-relaxed">{lines(str(it, "features")).map((f) => <li key={f}>{f}</li>)}</ul>
                {str(it, "buttonLabel") ? <a href={str(it, "buttonHref", "/")} onClick={(e) => stop(ctx.editing, e)} className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-teal px-4 py-2 text-sm text-paper">{str(it, "buttonLabel")}</a> : null}
              </article>
            ))}
          </div>
        </section>
      );
    case "faq":
      return (
        <section className="mx-auto max-w-3xl px-6 py-16">
          {str(p, "title") ? <h2 className="mb-4 text-3xl font-semibold">{str(p, "title")}</h2> : null}
          <div className="divide-y divide-line rounded-xl border border-line bg-card">
            {list(p, "items").map((it, i) => (
              <details key={i} className="px-4 py-3">
                <summary className="cursor-pointer font-medium">{str(it, "q")}</summary>
                <p className="mt-2 leading-relaxed text-muted">{str(it, "a")}</p>
              </details>
            ))}
          </div>
        </section>
      );
    case "tabs":
      return <Tabs items={list(p, "items")} />;
    case "gallery":
      return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {list(p, "images").filter((im) => str(im, "url")).map((im, i) => (
            <img key={i} src={str(im, "url")} alt={str(im, "alt")} className="h-40 w-full rounded-lg object-cover" />
          ))}
        </div>
      );
    case "logos":
      return (
        <section className="mx-auto max-w-5xl px-6 py-10 text-center">
          {str(p, "title") ? <p className="mb-4 text-sm text-muted">{str(p, "title")}</p> : null}
          <div className="flex flex-wrap items-center justify-center gap-6">
            {list(p, "items").map((it, i) => str(it, "url") ? <img key={i} src={str(it, "url")} alt={str(it, "alt")} className="h-10 w-auto" /> : <span key={i} className="text-sm text-muted">{str(it, "alt")}</span>)}
          </div>
        </section>
      );
    case "form":
      return <FormBlock props={p} />;
    case "newsletter":
      return <FormBlock props={{ ...p, fields: [{ name: "email", label: "ایمیل", type: "email", required: true }], submitLabel: "عضویت", successText: "ثبت شد." }} />;
    case "map": {
      const q = encodeURIComponent(str(p, "query", "Tehran"));
      const z = Number(p.zoom || 12);
      const h = str(p, "height") === "sm" ? "h-52" : str(p, "height") === "lg" ? "h-96" : "h-72";
      return <iframe title="نقشه" className={`w-full rounded-xl border border-line ${h}`} src={`https://maps.google.com/maps?q=${q}&z=${z}&output=embed`} />;
    }
    case "social":
      return (
        <div className="flex flex-wrap gap-3">
          {list(p, "items").map((it, i) => (
            <a key={i} href={str(it, "url")} onClick={(e) => stop(ctx.editing, e)} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm">{str(it, "network")}</a>
          ))}
        </div>
      );
    case "alert":
      return (
        <div className={`rounded-xl border-s-4 px-4 py-3 ${alertTone(str(p, "tone", "info"))}`}>
          {str(p, "title") ? <strong className="block">{str(p, "title")}</strong> : null}
          <p className="leading-relaxed">{str(p, "text")}</p>
        </div>
      );
    case "table": {
      const heads = str(p, "headers").split(",").map((s) => s.trim()).filter(Boolean);
      const rows = lines(str(p, "rows")).map((r) => r.split("|").map((c) => c.trim()));
      return (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-mist"><tr>{heads.map((h) => <th key={h} className="px-3 py-2 text-start font-medium">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    }
    case "code":
      return (
        <figure className="overflow-hidden rounded-xl bg-ink text-paper">
          {(str(p, "title") || str(p, "language")) ? <figcaption className="border-b border-white/10 px-4 py-2 text-xs opacity-70">{str(p, "title")} {str(p, "language")}</figcaption> : null}
          <pre className="overflow-x-auto px-4 py-3 text-sm leading-relaxed"><code>{str(p, "code")}</code></pre>
        </figure>
      );
    case "embed": {
      const url = str(p, "url");
      if (!url || url.startsWith("javascript:")) return null;
      const h = Math.min(800, Math.max(120, Number(p.height) || 360));
      return <iframe title="embed" src={url} className="w-full rounded-xl border border-line" style={{ height: h }} />;
    }
    case "shortcode": {
      const slug = str(p, "slug");
      const html = ctx.snippets?.shortcodes?.[slug] || "";
      if (!html) return ctx.editing ? <p className="text-sm text-muted">شورت‌کد «{slug || "…"}» خالی است.</p> : null;
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    }
    case "countdown":
      return <Countdown title={str(p, "title")} date={str(p, "date")} />;
    case "iconbox":
      return (
        <div className={align(str(p, "align"))}>
          <div className="text-teal"><Glyph name={str(p, "icon", "layout")} /></div>
          <h3 className="mt-2 text-lg font-semibold">{str(p, "title")}</h3>
          <p className="mt-1 leading-relaxed text-muted">{str(p, "text")}</p>
        </div>
      );
    default: {
      const def = ctx.elements?.find((e) => e.type === node.type);
      return (
        <div className={`rounded-xl border-s-4 px-4 py-3 ${alertTone(str(p, "tone", "info"))}`}>
          <strong className="block">{str(p, "title") || def?.label || node.type}</strong>
          {str(p, "text") ? <p className="leading-relaxed">{str(p, "text")}</p> : null}
        </div>
      );
    }
  }
}

function Tabs({ items }: { items: Record<string, unknown>[] }) {
  const [i, setI] = useState(0);
  const cur = items[i] || items[0];
  if (!cur) return null;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {items.map((it, idx) => (
          <button key={idx} type="button" onClick={() => setI(idx)} className={`min-h-11 rounded-full px-4 text-sm ${idx === i ? "bg-ink text-paper" : "bg-mist text-ink"}`}>{str(it, "label", String(idx + 1))}</button>
        ))}
      </div>
      <div className="ng-prose mt-4" dangerouslySetInnerHTML={{ __html: str(cur, "html") }} />
    </div>
  );
}

function FormBlock({ props }: { props: Record<string, unknown> }) {
  const fields = list(props, "fields");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    fd.forEach((v, k) => { if (typeof v === "string") data[k] = v; });
    const company = data.company || "";
    delete data.company;
    try {
      const res = await fetch("/api/v1/public/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: str(props, "formName", "contact"), data, company }),
      });
      if (!res.ok) throw new Error("fail");
      setDone(true);
    } catch {
      setErr("ارسال نشد. دوباره تلاش کنید.");
    }
  }
  if (done) return <p className="rounded-xl bg-card px-4 py-6 text-ok">{str(props, "successText", "پیام رسید.")}</p>;
  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-3 rounded-xl border border-line bg-card p-5">
      {str(props, "title") ? <h2 className="text-2xl font-semibold">{str(props, "title")}</h2> : null}
      {str(props, "text") ? <p className="text-muted">{str(props, "text")}</p> : null}
      <input name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {fields.map((f, i) => {
        const name = str(f, "name", "f" + i);
        const label = str(f, "label", name);
        const req = on(f, "required");
        const common = "mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2";
        return (
          <label key={name} className="block text-sm">
            {label}
            {str(f, "type") === "textarea"
              ? <textarea name={name} required={req} rows={4} className={common} />
              : <input name={name} type={str(f, "type") === "email" ? "email" : "text"} required={req} className={common} />}
          </label>
        );
      })}
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      <button type="submit" className="inline-flex min-h-11 items-center rounded-lg bg-teal px-4 text-sm font-medium text-paper">{str(props, "submitLabel", "ارسال")}</button>
    </form>
  );
}

function Countdown({ title, date }: { title: string; date: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const target = date ? new Date(date).getTime() : NaN;
    if (!target || Number.isNaN(target)) {
      setText("تاریخ را تنظیم کنید");
      return;
    }
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setText(`${d} روز، ${h} ساعت، ${m} دقیقه`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [date]);
  return (
    <div className="rounded-xl bg-ink px-6 py-8 text-paper">
      {title ? <p className="text-sm opacity-80">{title}</p> : null}
      <p className="mt-2 text-2xl font-semibold">{text}</p>
    </div>
  );
}

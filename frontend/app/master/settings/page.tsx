"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MenuItem, SiteSettings } from "@/lib/types";

export default function SettingsPage() {
  const [s, setS] = useState<SiteSettings | null>(null);
  const [msg, setMsg] = useState("");
  const [pages, setPages] = useState<{ slug: string; title: string }[]>([]);
  useEffect(() => {
    api.settings.get().then(setS).catch((e) => setMsg(e.message));
    api.pages.list().then((r) => setPages(r.items.map((p) => ({ slug: p.slug, title: p.title })))).catch(() => {});
  }, []);
  if (!s) return <p className="text-muted">{msg || "…"}</p>;
  function menu(key: "headerMenu" | "footerMenu", items: MenuItem[]) {
    setS({ ...s!, [key]: items });
  }
  return (
    <form className="max-w-2xl space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      try { setS(await api.settings.save(s)); setMsg("ذخیره شد"); } catch (err) { setMsg(err instanceof Error ? err.message : "خطا"); }
    }}>
      <h1 className="text-2xl font-semibold">تنظیمات</h1>
      <Field label="نام سایت" value={s.siteTitle} onChange={(v) => setS({ ...s, siteTitle: v })} />
      <Field label="شعار" value={s.tagline} onChange={(v) => setS({ ...s, tagline: v })} />
      <Field label="متن پاورقی" value={s.footerText} onChange={(v) => setS({ ...s, footerText: v })} />
      <label className="block text-sm">صفحهٔ خانه
        <select value={s.homepageSlug} onChange={(e) => setS({ ...s, homepageSlug: e.target.value })} className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2">
          {pages.map((p) => <option key={p.slug} value={p.slug}>{p.title} /{p.slug}</option>)}
        </select>
      </label>
      <label className="block text-sm">تعداد مقاله در هر صفحه
        <input type="number" min={1} max={50} value={s.postsPerPage} onChange={(e) => setS({ ...s, postsPerPage: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Field label="زبان" value={s.locale} onChange={(v) => setS({ ...s, locale: v })} />
        <label className="block text-sm">جهت
          <select value={s.dir} onChange={(e) => setS({ ...s, dir: e.target.value as "rtl" | "ltr" })} className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2">
            <option value="rtl">راست به چپ</option>
            <option value="ltr">چپ به راست</option>
          </select>
        </label>
      </div>
      <Field label="دامنه" value={s.domain} onChange={(v) => setS({ ...s, domain: v })} />
      <div className="flex items-center gap-3">
        {s.logoUrl ? <img src={s.logoUrl} alt="" className="h-12" /> : null}
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-line px-3 text-sm">نشان
          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setS(await api.settings.logo(f));
          }} />
        </label>
      </div>
      <MenuEditor title="منوی بالا" items={s.headerMenu || []} onChange={(items) => menu("headerMenu", items)} />
      <MenuEditor title="منوی پایین" items={s.footerMenu || []} onChange={(items) => menu("footerMenu", items)} />
      <button className="min-h-11 rounded-lg bg-teal px-4 text-sm text-paper">ذخیره</button>
      {msg ? <p className="text-sm text-muted">{msg}</p> : null}
    </form>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block text-sm">{label}<input value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2" /></label>;
}

function MenuEditor({ title, items, onChange }: { title: string; items: MenuItem[]; onChange: (items: MenuItem[]) => void }) {
  return (
    <fieldset className="rounded-xl border border-line p-3">
      <legend className="px-1 text-sm">{title}</legend>
      {items.map((it, i) => (
        <div key={i} className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
          <input value={it.label} onChange={(e) => onChange(items.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} className="rounded border border-line px-2 py-2" placeholder="برچسب" />
          <input value={it.href} onChange={(e) => onChange(items.map((x, idx) => idx === i ? { ...x, href: e.target.value } : x))} className="rounded border border-line px-2 py-2" placeholder="/path" dir="ltr" />
          <button type="button" className="text-danger" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>حذف</button>
        </div>
      ))}
      <button type="button" className="mt-2 text-sm text-teal" onClick={() => onChange([...items, { label: "", href: "/" }])}>پیوند تازه</button>
    </fieldset>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Snippet } from "@/lib/types";

const empty: Partial<Snippet> = {
  title: "", slug: "", description: "", code: "", kind: "html", location: "header", active: true, priority: 10, pages: [],
};

export default function WpCode() {
  const [items, setItems] = useState<Snippet[]>([]);
  const [cur, setCur] = useState<Partial<Snippet> | null>(null);
  const [err, setErr] = useState("");
  function load() {
    api.snippets.list().then((r) => setItems(r.items)).catch((e) => setErr(e.message));
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!cur) return;
    setErr("");
    try {
      if (cur.id) await api.snippets.update(cur.id, cur);
      else await api.snippets.create(cur);
      setCur(null);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطا");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">کد سفارشی</h1>
          <p className="text-sm text-muted">مثل WPCode: HTML، CSS و JavaScript را بدون دست‌زدن به هسته تزریق کنید.</p>
        </div>
        <button type="button" className="min-h-11 rounded-lg bg-teal px-4 text-sm text-paper" onClick={() => setCur({ ...empty })}>اسنیپت تازه</button>
      </div>
      {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <ul className="divide-y divide-line rounded-xl border border-line bg-card">
          {items.map((s) => (
            <li key={s.id}>
              <button type="button" className="w-full px-4 py-3 text-start" onClick={() => setCur(s)}>
                <span className="font-medium">{s.title}</span>
                <span className="mt-1 block text-xs text-muted">{s.kind} · {s.location} · {s.active ? "فعال" : "خاموش"}</span>
              </button>
            </li>
          ))}
          {items.length === 0 ? <li className="px-4 py-8 text-center text-sm text-muted">اسنیپتی نیست.</li> : null}
        </ul>
        {cur ? (
          <form className="space-y-2 rounded-xl border border-line bg-card p-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <input value={cur.title || ""} onChange={(e) => setCur({ ...cur, title: e.target.value })} placeholder="عنوان" className="w-full rounded-lg border border-line px-3 py-2" required />
            <input value={cur.slug || ""} onChange={(e) => setCur({ ...cur, slug: e.target.value })} placeholder="شناسه شورت‌کد" className="w-full rounded-lg border border-line px-3 py-2" dir="ltr" />
            <div className="grid grid-cols-2 gap-2">
              <select value={cur.kind} onChange={(e) => setCur({ ...cur, kind: e.target.value as Snippet["kind"] })} className="rounded-lg border border-line px-2 py-2">
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="js">JavaScript</option>
                <option value="shortcode">شورت‌کد</option>
              </select>
              <select value={cur.location} onChange={(e) => setCur({ ...cur, location: e.target.value as Snippet["location"] })} className="rounded-lg border border-line px-2 py-2">
                <option value="header">هدر</option>
                <option value="body_open">ابتدای بدنه</option>
                <option value="footer">فوتر</option>
                <option value="shortcode">فقط شورت‌کد</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!cur.active} onChange={(e) => setCur({ ...cur, active: e.target.checked })} /> فعال</label>
            <label className="block text-sm">اولویت
              <input type="number" value={cur.priority ?? 10} onChange={(e) => setCur({ ...cur, priority: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-line px-3 py-2" />
            </label>
            <label className="block text-sm">فقط این نامک‌ها (خالی = همه‌جا، با ویرگول)
              <input value={(cur.pages || []).join(", ")} onChange={(e) => setCur({ ...cur, pages: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} className="mt-1 w-full rounded-lg border border-line px-3 py-2" dir="ltr" />
            </label>
            <textarea value={cur.code || ""} onChange={(e) => setCur({ ...cur, code: e.target.value })} rows={12} className="w-full rounded-lg border border-line bg-ink p-3 font-mono text-sm text-paper" dir="ltr" spellCheck={false} />
            <p className="text-xs text-muted">در متن صفحه از <span dir="ltr">[[snippet:شناسه]]</span> استفاده کنید. کد را فقط آدم مطمئن می‌نویسد؛ مثل وردپرس اجرا می‌شود.</p>
            <div className="flex gap-2">
              <button className="min-h-11 rounded-lg bg-teal px-4 text-sm text-paper">ذخیره</button>
              {cur.id ? <button type="button" className="min-h-11 text-sm text-danger" onClick={async () => { await api.snippets.remove(cur.id!); setCur(null); load(); }}>حذف</button> : null}
            </div>
          </form>
        ) : <p className="text-sm text-muted">یک اسنیپت را انتخاب کنید یا تازه بسازید.</p>}
      </div>
    </div>
  );
}

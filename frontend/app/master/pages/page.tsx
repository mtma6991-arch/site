"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { PageRecord } from "@/lib/types";

export default function Pages() {
  const router = useRouter();
  const [items, setItems] = useState<PageRecord[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  function load(query = q) {
    api.pages.list(query).then((r) => setItems(r.items)).catch((e) => setErr(e.message));
  }
  useEffect(() => { load(""); }, []);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">صفحات</h1>
        <button type="button" className="min-h-11 rounded-lg bg-teal px-4 text-sm text-paper" onClick={async () => {
          const p = await api.pages.create("صفحه تازه");
          router.push("/master/pages/" + p.id);
        }}>صفحه تازه</button>
      </div>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); load(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو" className="flex-1 rounded-lg border border-line bg-card px-3 py-2" />
        <button className="min-h-11 rounded-lg border border-line px-4 text-sm">بگرد</button>
      </form>
      {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-card">
        {items.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div>
              <a href={"/master/pages/" + p.id} className="font-medium">{p.title}</a>
              <p className="text-xs text-muted" dir="ltr">/{p.slug}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted">{p.status === "published" ? "منتشر" : "پیش‌نویس"}</span>
              <button type="button" className="min-h-10 text-danger" onClick={async () => { if (confirm("حذف شود؟")) { await api.pages.remove(p.id); load(); } }}>حذف</button>
            </div>
          </li>
        ))}
        {items.length === 0 ? <li className="px-4 py-8 text-center text-sm text-muted">صفحه‌ای نیست.</li> : null}
      </ul>
    </div>
  );
}

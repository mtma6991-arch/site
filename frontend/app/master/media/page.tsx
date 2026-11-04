"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MediaItem } from "@/lib/types";

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [err, setErr] = useState("");
  const [alt, setAlt] = useState("");
  function load() { api.media.list().then((r) => setItems(r.items)).catch((e) => setErr(e.message)); }
  useEffect(() => { load(); }, []);
  async function upload(files: FileList | null) {
    if (!files) return;
    setErr("");
    for (const file of Array.from(files)) {
      try { await api.media.upload(file, alt); } catch (e) { setErr(e instanceof Error ? e.message : "خطا"); }
    }
    setAlt("");
    load();
  }
  return (
    <div>
      <h1 className="text-2xl font-semibold">مرکز رسانه</h1>
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-line bg-card p-4">
        <label className="text-sm">متن جایگزین
          <input value={alt} onChange={(e) => setAlt(e.target.value)} className="mt-1 block rounded-lg border border-line bg-paper px-3 py-2" />
        </label>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-teal px-4 text-sm text-paper">
          بارگذاری
          <input type="file" multiple accept="image/*,video/mp4,video/webm,application/pdf" className="hidden" onChange={(e) => void upload(e.target.files)} />
        </label>
      </div>
      {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((it) => (
          <article key={it.id} className="overflow-hidden rounded-xl border border-line bg-card">
            {it.mime.startsWith("image/") ? <img src={it.url} alt={it.alt} className="h-32 w-full object-cover" /> : <div className="grid h-32 place-items-center text-xs text-muted">{it.mime || "فایل"}</div>}
            <div className="space-y-2 p-2">
              <input defaultValue={it.alt} onBlur={(e) => { if (e.target.value !== it.alt) void api.media.update(it.id, { alt: e.target.value }).then(load); }} className="w-full rounded border border-line px-2 py-1 text-xs" placeholder="متن جایگزین" />
              <div className="flex justify-between text-xs">
                <button type="button" onClick={() => navigator.clipboard.writeText(location.origin + it.url)}>کپی نشانی</button>
                <button type="button" className="text-danger" onClick={async () => { await api.media.remove(it.id); load(); }}>حذف</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

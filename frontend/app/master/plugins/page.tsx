"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PluginInfo } from "@/lib/types";

export default function PluginsPage() {
  const [items, setItems] = useState<PluginInfo[]>([]);
  const [msg, setMsg] = useState("");
  function load() { api.plugins.list().then((r) => setItems(r.items)).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); }, []);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">افزونه‌ها</h1>
          <p className="text-sm text-muted">پوشهٔ <span dir="ltr">plugins</span> یا زیپ با plugin.json. راهنما در بخش ساخت افزونه است.</p>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-teal px-4 text-sm text-paper">
          نصب زیپ
          <input type="file" accept=".zip" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const res = await api.plugins.upload(file);
              setMsg(res.needsRebuild ? "نصب شد. این افزونه فایل Go دارد و باید روی سرور site rebuild اجرا شود." : "نصب شد. از دکمه روشن استفاده کنید.");
              load();
            } catch (err) {
              setMsg(err instanceof Error ? err.message : "خطا");
            }
          }} />
        </label>
      </div>
      {msg ? <p className="mt-3 text-sm">{msg}</p> : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((p) => (
          <article key={p.slug} className="rounded-xl border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{p.name}</h2>
                <p className="text-xs text-muted" dir="ltr">{p.slug} · {p.version}</p>
              </div>
              <button type="button" className={`min-h-10 rounded-full px-3 text-xs ${p.enabled ? "bg-teal text-paper" : "bg-mist"}`} onClick={async () => {
                if (p.enabled) await api.plugins.disable(p.slug); else await api.plugins.enable(p.slug);
                load();
              }}>{p.enabled ? "روشن" : "خاموش"}</button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{p.description}</p>
            <p className="mt-1 text-xs text-muted">{p.author}</p>
            {p.admin?.path && p.enabled ? <a href={p.admin.path} className="mt-3 inline-flex min-h-10 items-center text-sm text-teal">{p.admin.menu || "باز کردن"}</a> : null}
          </article>
        ))}
      </div>
    </div>
  );
}

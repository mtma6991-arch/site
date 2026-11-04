"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FormSubmission } from "@/lib/types";

export default function FormsPage() {
  const [items, setItems] = useState<FormSubmission[]>([]);
  function load() { api.forms.list().then((r) => setItems(r.items)).catch(() => {}); }
  useEffect(() => { load(); }, []);
  return (
    <div>
      <h1 className="text-2xl font-semibold">صندوق فرم‌ها</h1>
      <ul className="mt-4 space-y-3">
        {items.map((f) => (
          <li key={f.id} className="rounded-xl border border-line bg-card p-4">
            <div className="flex items-center justify-between text-sm">
              <strong>{f.form}</strong>
              <span className="text-muted">{f.createdAt?.slice(0, 16).replace("T", " ")} {f.pageSlug ? "· " + f.pageSlug : ""}</span>
            </div>
            <dl className="mt-2 space-y-1 text-sm">
              {Object.entries(f.data || {}).map(([k, v]) => <div key={k}><dt className="inline text-muted">{k}: </dt><dd className="inline">{v}</dd></div>)}
            </dl>
            <button type="button" className="mt-2 text-xs text-danger" onClick={async () => { await api.forms.remove(f.id); load(); }}>حذف</button>
          </li>
        ))}
        {items.length === 0 ? <li className="text-sm text-muted">هنوز پیامی نرسیده.</li> : null}
      </ul>
    </div>
  );
}

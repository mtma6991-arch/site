"use client";

import { useEffect, useState } from "react";
import { pbClient } from "@/lib/pb";
import { formatDate } from "@/lib/html";

type Row = { id: string; form: string; page: string; payload: Record<string, string>; read: boolean; created: string };

export default function InboxPage() {
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    const res = await pbClient().collection("submissions").getList<Row>(1, 50, { sort: "-created" });
    setRows(res.items);
  }
  useEffect(() => { load().catch(() => undefined); }, []);

  async function mark(row: Row) {
    await pbClient().collection("submissions").update(row.id, { read: !row.read });
    await load();
  }
  async function remove(id: string) {
    if (!confirm("پیام حذف شود؟")) return;
    await pbClient().collection("submissions").delete(id);
    await load();
  }

  return (
    <div>
      <div className="topbar"><h1>صندوق پیام</h1></div>
      {!rows.length ? <p className="muted">هنوز پیامی نرسیده. فرم تماس صفحه‌ساز این‌جا جمع می‌شود.</p> : null}
      <div className="stack" style={{ display: "grid", gap: 10 }}>
        {rows.map((row) => (
          <article key={row.id} className="panel">
            <header className="topbar">
              <strong>{row.form || "فرم"} {row.read ? "" : "· تازه"}</strong>
              <span className="muted">{formatDate(row.created)} · {row.page}</span>
            </header>
            <ul>
              {Object.entries(row.payload || {}).map(([k, v]) => <li key={k}><strong>{k}: </strong>{String(v)}</li>)}
            </ul>
            <div className="row-actions">
              <button type="button" className="tiny" onClick={() => mark(row)}>{row.read ? "علامت نخوانده" : "خواندم"}</button>
              <button type="button" className="tiny" onClick={() => remove(row.id)}>حذف</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

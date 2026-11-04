"use client";

import { useEffect, useState } from "react";
import { pbClient } from "@/lib/pb";

type Snip = {
  id: string;
  name: string;
  description: string;
  code: string;
  kind: string;
  location: string;
  scope: string;
  slugs: string;
  priority: number;
  enabled: boolean;
};

const empty: Omit<Snip, "id"> = {
  name: "",
  description: "",
  code: "",
  kind: "js",
  location: "head",
  scope: "all",
  slugs: "",
  priority: 10,
  enabled: true,
};

export default function WpCodePage() {
  const [rows, setRows] = useState<Snip[]>([]);
  const [form, setForm] = useState<Omit<Snip, "id"> & { id?: string }>(empty);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await pbClient().collection("snippets").getList<Snip>(1, 100, { sort: "-priority" });
    setRows(res.items);
  }
  useEffect(() => { load().catch(() => setMsg("قطعه‌ها خوانده نشدند.")); }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setMsg("");
    const pb = pbClient();
    const data = {
      name: form.name.trim(),
      description: form.description,
      code: form.code,
      kind: form.kind,
      location: form.location,
      scope: form.scope,
      slugs: form.slugs,
      priority: Number(form.priority) || 0,
      enabled: !!form.enabled,
    };
    try {
      if (form.id) await pb.collection("snippets").update(form.id, data);
      else await pb.collection("snippets").create(data);
      setForm(empty);
      setMsg("ذخیره شد.");
      await load();
    } catch {
      setMsg("ذخیره نشد. نام و کد لازم است.");
    }
  }

  async function remove(id: string) {
    if (!confirm("قطعه حذف شود؟")) return;
    await pbClient().collection("snippets").delete(id);
    await load();
  }

  return (
    <div>
      <div className="topbar"><h1>کد سفارشی</h1></div>
      <p className="muted">معادل WPCode. HTML، CSS، JavaScript یا JSON-LD را در سر صفحه، بدنه یا پاورقی بگذارید. در متن مقاله از <code>[snippet id="…"]</code> هم می‌شود استفاده کرد.</p>
      {msg ? <p>{msg}</p> : null}
      <div className="panel stack" style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="نام قطعه" />
        <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="توضیح کوتاه" />
        <div className="cols" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
          <select value={form.kind} onChange={(e) => set("kind", e.target.value)}>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="js">JavaScript</option>
            <option value="jsonld">JSON-LD</option>
          </select>
          <select value={form.location} onChange={(e) => set("location", e.target.value)}>
            <option value="head">سر صفحه</option>
            <option value="body_open">ابتدای بدنه</option>
            <option value="body_close">انتهای بدنه</option>
            <option value="footer">پاورقی</option>
          </select>
          <select value={form.scope} onChange={(e) => set("scope", e.target.value)}>
            <option value="all">همهٔ صفحه‌ها</option>
            <option value="pages">نامک‌های خاص</option>
          </select>
          <input type="number" value={form.priority} onChange={(e) => set("priority", Number(e.target.value))} placeholder="اولویت" />
        </div>
        {form.scope === "pages" ? <input value={form.slugs} onChange={(e) => set("slugs", e.target.value)} placeholder="about, contact" dir="ltr" /> : null}
        <textarea value={form.code} onChange={(e) => set("code", e.target.value)} rows={10} dir="ltr" spellCheck={false} placeholder="کد" style={{ fontFamily: "ui-monospace, monospace" }} />
        <label><input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} /> فعال</label>
        <div className="row-actions">
          <button className="btn btn-solid" type="button" onClick={save}>{form.id ? "به‌روزرسانی" : "افزودن قطعه"}</button>
          {form.id ? <button className="tiny" type="button" onClick={() => setForm(empty)}>انصراف</button> : null}
        </div>
      </div>
      <table>
        <thead><tr><th>نام</th><th>نوع</th><th>جا</th><th>اولویت</th><th>وضعیت</th><th></th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}<div className="muted" dir="ltr">{row.id}</div></td>
              <td>{row.kind}</td>
              <td>{row.location}{row.scope === "pages" ? ` · ${row.slugs}` : ""}</td>
              <td>{row.priority}</td>
              <td>{row.enabled ? "فعال" : "خاموش"}</td>
              <td className="row-actions">
                <button type="button" onClick={() => setForm(row)}>ویرایش</button>
                <button type="button" onClick={() => remove(row.id)}>حذف</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

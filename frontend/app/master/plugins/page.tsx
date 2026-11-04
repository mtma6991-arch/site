"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pbClient } from "@/lib/pb";
import type { PluginInfo } from "@/lib/types";

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const pb = pbClient();
    const res = await fetch(`${pb.baseUrl}/api/negar/plugins`, { headers: { Authorization: pb.authStore.token } });
    const data = await res.json();
    setPlugins(data.plugins || []);
  }
  useEffect(() => { load().catch(() => setMsg("فهرست پلاگین خوانده نشد.")); }, []);

  async function toggle(id: string) {
    const pb = pbClient();
    await fetch(`${pb.baseUrl}/api/negar/plugins/${id}/toggle`, { method: "POST", headers: { Authorization: pb.authStore.token } });
    await load();
  }
  async function install(file: File | undefined) {
    if (!file) return;
    const pb = pbClient();
    const body = new FormData();
    body.set("file", file);
    const res = await fetch(`${pb.baseUrl}/api/negar/plugins/install`, { method: "POST", headers: { Authorization: pb.authStore.token }, body });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? `نصب شد: ${data.id}` : data.message || "نصب نشد");
    if (res.ok) await load();
  }
  async function remove(id: string) {
    if (!confirm("پوشهٔ پلاگین از سرور حذف شود؟")) return;
    const pb = pbClient();
    const res = await fetch(`${pb.baseUrl}/api/negar/plugins/${id}`, { method: "DELETE", headers: { Authorization: pb.authStore.token } });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? "حذف شد." : data.message || "حذف نشد");
    await load();
  }

  return (
    <div>
      <div className="topbar">
        <h1>پلاگین‌ها</h1>
        <label className="btn btn-solid">نصب زیپ<input hidden type="file" accept=".zip" onChange={(e) => install(e.target.files?.[0])} /></label>
      </div>
      <p className="muted">پوشه را در <code>plugins/</code> بگذارید و سرویس را ری‌استارت کنید، یا همین‌جا زیپ بدهید. راهنما: <Link href="/developers">ساخت پلاگین</Link></p>
      {msg ? <p>{msg}</p> : null}
      <div className="cards">
        {plugins.map((plugin) => (
          <article key={plugin.id} className="panel">
            <h2>{plugin.name}</h2>
            <p className="muted">{plugin.version} · {plugin.author}</p>
            <p>{plugin.description}</p>
            <div className="row-actions">
              <button className="tiny" type="button" onClick={() => toggle(plugin.id)}>{plugin.enabled ? "غیرفعال" : "فعال"}</button>
              {plugin.id === "wpcode" ? <Link href="/master/plugins/wpcode">باز کردن</Link> : null}
              {plugin.settingsForm ? <Link href={`/master/plugins/view/${plugin.id}`}>تنظیمات</Link> : null}
              {plugin.id !== "wpcode" ? <button className="tiny" type="button" onClick={() => remove(plugin.id)}>حذف</button> : null}
            </div>
            <p>{plugin.enabled ? "روشن" : "خاموش"}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { pbClient } from "@/lib/pb";
import type { PluginField, PluginInfo } from "@/lib/types";

export default function PluginSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [plugin, setPlugin] = useState<PluginInfo | null>(null);
  const [data, setData] = useState<Record<string, string>>({});
  const [recordId, setRecordId] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const pb = pbClient();
    fetch(`${pb.baseUrl}/api/negar/plugins`, { headers: { Authorization: pb.authStore.token } })
      .then((r) => r.json())
      .then(async (body) => {
        const found = (body.plugins || []).find((p: PluginInfo) => p.id === id) || null;
        setPlugin(found);
        try {
          const rec = await pb.collection("plugin_settings").getFirstListItem(`plugin_id="${id}"`);
          setRecordId(rec.id);
          setData((rec.data as Record<string, string>) || {});
        } catch {
          setRecordId("");
        }
      })
      .catch(() => setMsg("پلاگین پیدا نشد."));
  }, [id]);

  async function save() {
    const pb = pbClient();
    if (recordId) await pb.collection("plugin_settings").update(recordId, { data });
    else {
      const rec = await pb.collection("plugin_settings").create({ plugin_id: id, data });
      setRecordId(rec.id);
    }
    setMsg("ذخیره شد.");
  }

  const fields: PluginField[] = plugin?.settingsForm?.fields || [];
  return (
    <div>
      <h1>{plugin?.settingsForm?.title || plugin?.name || "تنظیمات"}</h1>
      {plugin?.settingsForm?.intro ? <p className="muted">{plugin.settingsForm.intro}</p> : null}
      {msg ? <p>{msg}</p> : null}
      <div className="panel stack" style={{ display: "grid", gap: 10, maxWidth: 640 }}>
        {fields.map((field) => (
          <label key={field.key} className="field">
            {field.label}
            {field.type === "textarea" ? (
              <textarea value={data[field.key] || ""} onChange={(e) => setData({ ...data, [field.key]: e.target.value })} />
            ) : field.type === "select" ? (
              <select value={data[field.key] || ""} onChange={(e) => setData({ ...data, [field.key]: e.target.value })}>
                {(field.options || []).map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
            ) : (
              <input value={data[field.key] || ""} onChange={(e) => setData({ ...data, [field.key]: e.target.value })} />
            )}
          </label>
        ))}
        {!fields.length ? <p>این پلاگین فرم تنظیمات ندارد.</p> : <button className="btn btn-solid" type="button" onClick={save}>ذخیره</button>}
      </div>
    </div>
  );
}

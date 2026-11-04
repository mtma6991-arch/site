"use client";

import { useEffect, useState } from "react";
import { MediaPicker } from "@/components/media";
import { pbClient } from "@/lib/pb";
import type { MenuItem } from "@/lib/types";

export default function SettingsPage() {
  const [id, setId] = useState("");
  const [siteName, setSiteName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [footer, setFooter] = useState("");
  const [logo, setLogo] = useState("");
  const [favicon, setFavicon] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [perPage, setPerPage] = useState(9);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [msg, setMsg] = useState("");
  const [pick, setPick] = useState<"logo" | "favicon" | null>(null);
  const [name, setName] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    const pb = pbClient();
    setName(String(pb.authStore.record?.name || ""));
    pb.collection("settings").getFirstListItem('key="site"').then((rec) => {
      setId(rec.id);
      setSiteName(rec.site_name || "");
      setTagline(rec.tagline || "");
      setDescription(rec.description || "");
      setFooter(rec.footer || "");
      setLogo(rec.logo || "");
      setFavicon(rec.favicon || "");
      setSeoTitle(rec.seo_title || "");
      setSeoDescription(rec.seo_description || "");
      setPerPage(Number(rec.posts_per_page || 9));
      setMenu(Array.isArray(rec.menu) ? rec.menu : []);
    }).catch(() => setMsg("تنظیمات خوانده نشد."));
  }, []);

  async function save() {
    await pbClient().collection("settings").update(id, {
      site_name: siteName,
      tagline,
      description,
      footer,
      logo,
      favicon,
      seo_title: seoTitle,
      seo_description: seoDescription,
      posts_per_page: perPage,
      menu,
    });
    setMsg("ذخیره شد.");
  }

  async function saveMe() {
    const pb = pbClient();
    const res = await fetch(`${pb.baseUrl}/api/negar/me`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: pb.authStore.token },
      body: JSON.stringify({ name, oldPassword, password, passwordConfirm }),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? "حساب به‌روز شد." : data.message || "حساب ذخیره نشد.");
    if (res.ok) {
      setOldPassword("");
      setPassword("");
      setPasswordConfirm("");
    }
  }

  return (
    <div>
      <div className="topbar"><h1>تنظیمات</h1><button className="btn btn-solid" type="button" onClick={save}>ذخیره سایت</button></div>
      {msg ? <p>{msg}</p> : null}
      <div className="panel stack" style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <label className="field">نام سایت<input value={siteName} onChange={(e) => setSiteName(e.target.value)} /></label>
        <label className="field">شعار<input value={tagline} onChange={(e) => setTagline(e.target.value)} /></label>
        <label className="field">توضیح<textarea value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <label className="field">پاورقی<textarea value={footer} onChange={(e) => setFooter(e.target.value)} /></label>
        <label className="field">عنوان سئو<input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} /></label>
        <label className="field">توضیح سئو<textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} /></label>
        <label className="field">تعداد مقاله در مجله<input type="number" value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} /></label>
        <div className="row-actions">
          <button className="tiny" type="button" onClick={() => setPick("logo")}>لوگو</button>
          <button className="tiny" type="button" onClick={() => setPick("favicon")}>فاوآیکن</button>
        </div>
        <h2>منو</h2>
        {menu.map((item, i) => (
          <div key={i} className="cols" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
            <input value={item.label} onChange={(e) => setMenu(menu.map((m, j) => j === i ? { ...m, label: e.target.value } : m))} placeholder="برچسب" />
            <input value={item.href} onChange={(e) => setMenu(menu.map((m, j) => j === i ? { ...m, href: e.target.value } : m))} placeholder="/about" dir="ltr" />
            <button className="tiny" type="button" onClick={() => setMenu(menu.filter((_, j) => j !== i))}>حذف</button>
          </div>
        ))}
        <button className="tiny" type="button" onClick={() => setMenu([...menu, { label: "پیوند", href: "/" }])}>افزودن پیوند</button>
      </div>
      <div className="panel stack" style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <h2>حساب شما</h2>
        <label className="field">نام<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field">رمز فعلی<input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} /></label>
        <label className="field">رمز تازه<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <label className="field">تکرار رمز<input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} /></label>
        <button className="tiny" type="button" onClick={saveMe}>ذخیره حساب</button>
      </div>
      <MediaPicker
        open={pick !== null}
        onClose={() => setPick(null)}
        onPick={(url) => {
          if (pick === "logo") setLogo(url);
          if (pick === "favicon") setFavicon(url);
        }}
      />
    </div>
  );
}

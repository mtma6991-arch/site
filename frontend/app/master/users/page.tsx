"use client";

import { useEffect, useState } from "react";
import { pbClient } from "@/lib/pb";

type User = { id: string; email: string; name?: string; role?: string };

export default function UsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("editor");
  const [msg, setMsg] = useState("");
  const [me, setMe] = useState("");

  async function load() {
    const res = await pbClient().collection("users").getList<User>(1, 50);
    setRows(res.items);
  }
  useEffect(() => {
    const pb = pbClient();
    setMe(String(pb.authStore.record?.role || ""));
    load().catch(() => undefined);
  }, []);

  async function create() {
    setMsg("");
    try {
      await pbClient().collection("users").create({
        email: email.trim(),
        name,
        password,
        passwordConfirm: password,
        role,
        emailVisibility: false,
      });
      setEmail("");
      setName("");
      setPassword("");
      setMsg("کاربر ساخته شد.");
      await load();
    } catch {
      setMsg("ساخته نشد. فقط مدیر می‌تواند کاربر بسازد و رمز حداقل ۸ نویسه است.");
    }
  }

  return (
    <div>
      <div className="topbar"><h1>کاربران</h1></div>
      {me !== "admin" ? <p className="muted">ساخت کاربر فقط برای نقش مدیر باز است.</p> : null}
      {msg ? <p>{msg}</p> : null}
      <div className="panel stack" style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ایمیل" dir="ltr" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز" type="password" />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="admin">مدیر</option>
          <option value="editor">ویرایشگر</option>
          <option value="author">نویسنده</option>
        </select>
        <button className="btn btn-solid" type="button" onClick={create}>افزودن</button>
      </div>
      <table>
        <thead><tr><th>نام</th><th>ایمیل</th><th>نقش</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}><td>{row.name}</td><td dir="ltr">{row.email}</td><td>{row.role}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

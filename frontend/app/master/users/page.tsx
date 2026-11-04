"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export default function UsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("editor");
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  function load() { api.users.list().then((r) => setItems(r.items)).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); }, []);
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">کاربران</h1>
      <ul className="divide-y divide-line rounded-xl border border-line bg-card">
        {items.map((u) => (
          <li key={u.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{u.name || u.email}<span className="ms-2 text-muted">{u.role}</span></span>
            <button type="button" className="text-danger" onClick={async () => { await api.users.remove(u.id); load(); }}>حذف</button>
          </li>
        ))}
      </ul>
      <form className="space-y-2 rounded-xl border border-line bg-card p-4" onSubmit={async (e) => {
        e.preventDefault();
        try { await api.users.create({ email, password, name, role }); setEmail(""); setPassword(""); setName(""); load(); setMsg("ساخته شد"); }
        catch (err) { setMsg(err instanceof Error ? err.message : "خطا"); }
      }}>
        <h2 className="font-medium">کاربر تازه</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام" className="w-full rounded border border-line px-3 py-2" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="ایمیل" className="w-full rounded border border-line px-3 py-2" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={10} placeholder="رمز، حداقل ۱۰ نویسه" className="w-full rounded border border-line px-3 py-2" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded border border-line px-3 py-2">
          <option value="editor">ویرایشگر</option>
          <option value="admin">مدیر</option>
        </select>
        <button className="min-h-11 rounded-lg bg-teal px-4 text-sm text-paper">ساختن</button>
      </form>
      <form className="space-y-2 rounded-xl border border-line bg-card p-4" onSubmit={async (e) => {
        e.preventDefault();
        try { await api.password(cur, next); setCur(""); setNext(""); setMsg("رمز عوض شد"); }
        catch (err) { setMsg(err instanceof Error ? err.message : "خطا"); }
      }}>
        <h2 className="font-medium">تغییر رمز خودم</h2>
        <input value={cur} onChange={(e) => setCur(e.target.value)} type="password" required placeholder="رمز فعلی" className="w-full rounded border border-line px-3 py-2" />
        <input value={next} onChange={(e) => setNext(e.target.value)} type="password" required minLength={10} placeholder="رمز تازه" className="w-full rounded border border-line px-3 py-2" />
        <button className="min-h-11 rounded-lg border border-line px-4 text-sm">تغییر رمز</button>
      </form>
      {msg ? <p className="text-sm">{msg}</p> : null}
    </div>
  );
}

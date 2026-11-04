"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await api.login(email, password);
      setToken(res.token);
      router.replace("/master");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "ورود ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line bg-card p-6">
        <p className="text-sm text-teal">نگار</p>
        <h1 className="mt-1 text-2xl font-semibold">ورود به پنل</h1>
        <label className="mt-5 block text-sm">ایمیل
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2" />
        </label>
        <label className="mt-3 block text-sm">رمز
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2" />
        </label>
        {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
        <button disabled={busy} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-teal text-paper disabled:opacity-60">{busy ? "…" : "ورود"}</button>
      </form>
    </main>
  );
}

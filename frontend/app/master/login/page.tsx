"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isStaff, pbClient } from "@/lib/pb";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const pb = pbClient();
    if (pb.authStore.isValid && isStaff(pb.authStore.record)) router.replace("/master");
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const pb = pbClient();
      const auth = await pb.collection("users").authWithPassword(email.trim(), password);
      if (!isStaff(auth.record)) {
        pb.authStore.clear();
        throw new Error("این حساب به پنل دسترسی ندارد.");
      }
      router.replace("/master");
    } catch (err) {
      setError(err instanceof Error && err.message.includes("دسترسی") ? err.message : "ایمیل یا رمز نادرست است.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>ورود به مدیریت</h1>
        <p className="muted">همان ایمیلی که هنگام نصب وارد کردید.</p>
        <label>ایمیل<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></label>
        <label>رمز<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        {error ? <p className="form-bad">{error}</p> : null}
        <button className="btn btn-solid" type="submit" disabled={busy}>{busy ? "…" : "ورود"}</button>
      </form>
    </main>
  );
}

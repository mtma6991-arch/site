"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, setToken, token } from "@/lib/api";
import type { User } from "@/lib/types";

const links = [
  { href: "/master", label: "میز کار" },
  { href: "/master/pages", label: "صفحات" },
  { href: "/master/posts", label: "مقاله‌ها" },
  { href: "/master/media", label: "رسانه" },
  { href: "/master/forms", label: "فرم‌ها" },
  { href: "/master/plugins", label: "افزونه‌ها" },
  { href: "/master/settings", label: "تنظیمات" },
  { href: "/master/users", label: "کاربران" },
  { href: "/master/guide", label: "راهنمای افزونه" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!token()) {
      router.replace("/master/login");
      return;
    }
    api.me().then((r) => setUser(r.user)).catch(() => router.replace("/master/login"));
  }, [router]);

  if (!user) {
    return <div className="grid min-h-screen place-items-center text-muted">در حال ورود…</div>;
  }

  return (
    <div className="min-h-screen bg-paper text-ink md:grid md:grid-cols-[240px_1fr]">
      <aside className={`${open ? "block" : "hidden"} border-b border-line bg-ink text-paper md:block md:min-h-screen md:border-b-0`}>
        <div className="flex items-center justify-between px-5 py-5">
          <a href="/master" className="text-lg font-semibold">نگار</a>
          <button type="button" className="min-h-11 px-2 md:hidden" onClick={() => setOpen(false)}>بستن</button>
        </div>
        <nav className="flex flex-col px-3 pb-6">
          {links.map((l) => {
            const active = path === l.href || (l.href !== "/master" && path.startsWith(l.href));
            if ((l.href === "/master/users" || l.href === "/master/settings") && user.role !== "admin") return null;
            return (
              <a key={l.href} href={l.href} className={`rounded-lg px-3 py-2 text-sm ${active ? "bg-teal text-paper" : "text-paper/80"}`}>{l.label}</a>
            );
          })}
        </nav>
        <div className="px-5 pb-6 text-xs text-paper/70">
          <p>{user.name || user.email}</p>
          <button type="button" className="mt-2 underline" onClick={() => { setToken(null); router.replace("/master/login"); }}>خروج</button>
          <a href="/" className="mt-2 block underline">دیدن سایت</a>
        </div>
      </aside>
      <div>
        <div className="flex items-center justify-between border-b border-line bg-card px-4 py-3 md:hidden">
          <strong>نگار</strong>
          <button type="button" className="min-h-11 rounded-lg border border-line px-3" onClick={() => setOpen(true)}>منو</button>
        </div>
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}

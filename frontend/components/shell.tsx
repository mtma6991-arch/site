"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isStaff, pbClient } from "@/lib/pb";
import type { PluginInfo } from "@/lib/types";

const LINKS = [
  ["/master", "پیشخوان"],
  ["/master/pages", "صفحه‌ها"],
  ["/master/posts", "مقاله‌ها"],
  ["/master/media", "رسانه"],
  ["/master/inbox", "صندوق"],
  ["/master/plugins", "پلاگین‌ها"],
  ["/master/users", "کاربران"],
  ["/master/settings", "تنظیمات"],
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);

  useEffect(() => {
    const pb = pbClient();
    if (!pb.authStore.isValid || !isStaff(pb.authStore.record)) {
      router.replace("/master/login");
      return;
    }
    setEmail(pb.authStore.record?.email || "");
    setReady(true);
    fetch(`${pb.baseUrl}/api/negar/plugins`, { headers: { Authorization: pb.authStore.token } })
      .then((r) => r.json())
      .then((data) => setPlugins((data.plugins || []).filter((p: PluginInfo) => p.enabled && (p.admin?.menu || p.settingsForm))))
      .catch(() => undefined);
  }, [router, path]);

  if (!ready) return <main className="auth-screen"><p>در حال بررسی ورود…</p></main>;

  return (
    <div className={`shell ${open ? "open-side" : ""}`}>
      <aside className={`side ${open ? "open" : ""}`}>
        <Link href="/master" className="brand"><strong>نگار</strong><span>مدیریت</span></Link>
        <button className="menu-toggle" type="button" onClick={() => setOpen((v) => !v)}>منو</button>
        <nav>
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? "active" : ""} onClick={() => setOpen(false)}>{label}</Link>
          ))}
          {plugins.map((plugin) => {
            const href = plugin.admin?.route || `/master/plugins/view/${plugin.id}`;
            return <Link key={plugin.id} href={href} className={path === href ? "active" : ""}>{plugin.admin?.menu || plugin.name}</Link>;
          })}
        </nav>
        <div className="grow">
          <span>{email}</span>
          <button
            type="button"
            onClick={() => {
              pbClient().authStore.clear();
              router.replace("/master/login");
            }}
          >
            خروج
          </button>
          <Link href="/">دیدن سایت</Link>
        </div>
      </aside>
      <div className="work">{children}</div>
    </div>
  );
}

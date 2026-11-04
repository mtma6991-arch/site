"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Dashboard() {
  const [s, setS] = useState<{ pages: number; publishedPages: number; posts: number; publishedPosts: number; media: number; submissions: number } | null>(null);
  useEffect(() => { api.stats().then(setS).catch(() => {}); }, []);
  const cards = s ? [
    ["صفحات", s.pages, s.publishedPages + " منتشر"],
    ["مقاله‌ها", s.posts, s.publishedPosts + " منتشر"],
    ["رسانه", s.media, "فایل"],
    ["فرم‌ها", s.submissions, "پیام"],
  ] : [];
  return (
    <div>
      <h1 className="text-2xl font-semibold">میز کار</h1>
      <p className="mt-1 text-sm text-muted">صفحه بسازید، مقاله بنویسید، یا از افزونه کد سفارشی یک اسنیپت اضافه کنید.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([l, n, h]) => (
          <div key={String(l)} className="rounded-xl border border-line bg-card p-4">
            <p className="text-sm text-muted">{l}</p>
            <p className="mt-1 text-3xl font-semibold">{n}</p>
            <p className="text-xs text-muted">{h}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="/master/pages" className="inline-flex min-h-11 items-center rounded-lg bg-teal px-4 text-sm text-paper">صفحات</a>
        <a href="/master/posts" className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm">مقاله‌ها</a>
        <a href="/master/plugins/wpcode" className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm">کد سفارشی</a>
      </div>
    </div>
  );
}

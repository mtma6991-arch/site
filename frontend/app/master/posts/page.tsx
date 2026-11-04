"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { PostRecord } from "@/lib/types";

export default function Posts() {
  const router = useRouter();
  const [items, setItems] = useState<PostRecord[]>([]);
  useEffect(() => { api.posts.list().then((r) => setItems(r.items)).catch(() => {}); }, []);
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">مقاله‌ها</h1>
        <button type="button" className="min-h-11 rounded-lg bg-teal px-4 text-sm text-paper" onClick={async () => {
          const p = await api.posts.create("مقاله تازه");
          router.push("/master/posts/" + p.id);
        }}>مقاله تازه</button>
      </div>
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-card">
        {items.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-3">
            <a href={"/master/posts/" + p.id} className="font-medium">{p.title}</a>
            <span className="text-sm text-muted">{p.status === "published" ? "منتشر" : "پیش‌نویس"}</span>
          </li>
        ))}
        {items.length === 0 ? <li className="px-4 py-8 text-center text-sm text-muted">مقاله‌ای نیست.</li> : null}
      </ul>
    </div>
  );
}

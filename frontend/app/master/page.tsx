"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pbClient } from "@/lib/pb";

export default function Dashboard() {
  const [counts, setCounts] = useState({ pages: 0, posts: 0, media: 0, inbox: 0 });

  useEffect(() => {
    const pb = pbClient();
    Promise.all([
      pb.collection("pages").getList(1, 1),
      pb.collection("posts").getList(1, 1),
      pb.collection("media").getList(1, 1),
      pb.collection("submissions").getList(1, 1, { filter: "read = false" }),
    ]).then(([pages, posts, media, inbox]) => {
      setCounts({ pages: pages.totalItems, posts: posts.totalItems, media: media.totalItems, inbox: inbox.totalItems });
    }).catch(() => undefined);
  }, []);

  const cards = [
    ["/master/pages", "صفحه‌ها", counts.pages],
    ["/master/posts", "مقاله‌ها", counts.posts],
    ["/master/media", "رسانه", counts.media],
    ["/master/inbox", "پیام نخوانده", counts.inbox],
  ] as const;

  return (
    <div>
      <div className="topbar"><h1>پیشخوان</h1></div>
      <div className="cards">
        {cards.map(([href, label, n]) => (
          <Link key={href} href={href} className="panel metric"><span>{label}</span><strong>{n.toLocaleString("fa-IR")}</strong></Link>
        ))}
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>شروع سریع</h2>
        <p>صفحهٔ خانه را از «صفحه‌ها» باز کنید. نامک <code>home</code> روی آدرس اصلی سایت است.</p>
        <p>آنالیتیکس و کد دلخواه را در «کد سفارشی» بگذارید. راهنمای ساخت پلاگین روی <Link href="/developers">/developers</Link> است.</p>
      </div>
    </div>
  );
}

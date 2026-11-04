"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pbClient } from "@/lib/pb";

type Row = { id: string; title: string; slug: string; status: string };

export default function PostsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    const res = await pbClient().collection("posts").getList<Row>(1, 50, { sort: "-updated" });
    setRows(res.items);
  }
  useEffect(() => { load().catch(() => undefined); }, []);

  async function create() {
    const rec = await pbClient().collection("posts").create({
      title: "مقاله تازه",
      slug: `post-${Date.now().toString(36)}`,
      excerpt: "",
      content: "<p></p>",
      cover: "",
      status: "draft",
      category: "",
      tags: "",
      author_name: pbClient().authStore.record?.name || "",
    });
    router.push(`/master/posts/${rec.id}`);
  }

  async function remove(id: string) {
    if (!confirm("مقاله حذف شود؟")) return;
    await pbClient().collection("posts").delete(id);
    await load();
  }

  return (
    <div>
      <div className="topbar"><h1>مقاله‌ها</h1><button className="btn btn-solid" type="button" onClick={create}>مقاله تازه</button></div>
      <table>
        <thead><tr><th>عنوان</th><th>نامک</th><th>وضعیت</th><th></th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.title}</td>
              <td dir="ltr">{row.slug}</td>
              <td>{row.status === "published" ? "منتشرشده" : "پیش‌نویس"}</td>
              <td className="row-actions">
                <Link href={`/master/posts/${row.id}`}>ویرایش</Link>
                <button type="button" onClick={() => remove(row.id)}>حذف</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

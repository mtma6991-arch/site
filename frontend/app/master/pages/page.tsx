"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pbClient } from "@/lib/pb";
import { emptyDoc, publicPath } from "@/lib/types";

type Row = { id: string; title: string; slug: string; status: string };

export default function PagesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await pbClient().collection("pages").getList<Row>(1, 50, { sort: "-updated" });
    setRows(res.items);
  }
  useEffect(() => { load().catch(() => setError("فهرست خوانده نشد.")); }, []);

  async function create() {
    const rec = await pbClient().collection("pages").create({
      title: "صفحه تازه",
      slug: `page-${Date.now().toString(36)}`,
      status: "draft",
      document: emptyDoc(),
      seo_title: "",
      seo_description: "",
    });
    router.push(`/master/pages/${rec.id}`);
  }

  async function remove(id: string) {
    if (!confirm("صفحه حذف شود؟")) return;
    await pbClient().collection("pages").delete(id);
    await load();
  }

  return (
    <div>
      <div className="topbar">
        <h1>صفحه‌ها</h1>
        <button className="btn btn-solid" type="button" onClick={create}>صفحه تازه</button>
      </div>
      {error ? <p className="form-bad">{error}</p> : null}
      <table>
        <thead><tr><th>عنوان</th><th>نشانی</th><th>وضعیت</th><th></th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.title}</td>
              <td dir="ltr">{publicPath(row.slug)}</td>
              <td>{row.status === "published" ? "منتشرشده" : "پیش‌نویس"}</td>
              <td className="row-actions">
                <Link href={`/master/pages/${row.id}`}>ویرایش</Link>
                <button type="button" onClick={() => remove(row.id)}>حذف</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

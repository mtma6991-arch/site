"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Builder } from "@/components/admin/Builder";
import { api } from "@/lib/api";
import type { PageRecord } from "@/lib/types";

export default function EditPage() {
  const params = useParams<{ id: string }>();
  const [page, setPage] = useState<PageRecord | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api.pages.get(params.id).then(setPage).catch((e) => setErr(e.message));
  }, [params.id]);
  if (err) return <p className="text-danger">{err}</p>;
  if (!page) return <p className="text-muted">در حال بارگذاری صفحه‌ساز…</p>;
  return (
    <div>
      <a href="/master/pages" className="text-sm text-teal">بازگشت به صفحات</a>
      <div className="mt-3"><Builder initial={page} /></div>
    </div>
  );
}

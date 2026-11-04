"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RichEditor } from "@/components/editor";
import { MediaPicker } from "@/components/media";
import { pbClient } from "@/lib/pb";
import { slugify } from "@/lib/types";

export default function PostEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("<p></p>");
  const [cover, setCover] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState("draft");
  const [msg, setMsg] = useState("");
  const [pick, setPick] = useState<"cover" | "body" | null>(null);
  const [insert, setInsert] = useState<((url: string, alt: string) => void) | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    pbClient().collection("posts").getOne(id).then((rec) => {
      setTitle(rec.title || "");
      setSlug(rec.slug || "");
      setExcerpt(rec.excerpt || "");
      setContent(rec.content || "<p></p>");
      setCover(rec.cover || "");
      setCategory(rec.category || "");
      setTags(rec.tags || "");
      setAuthor(rec.author_name || "");
      setStatus(rec.status || "draft");
      setReady(true);
    }).catch(() => setMsg("مقاله پیدا نشد."));
  }, [id]);

  async function save(next = status) {
    setMsg("");
    try {
      const clean = slugify(slug);
      await pbClient().collection("posts").update(id, {
        title: title.trim() || "بدون عنوان",
        slug: clean,
        excerpt,
        content,
        cover,
        category,
        tags,
        author_name: author,
        status: next,
        published_at: next === "published" ? new Date().toISOString() : "",
      });
      setSlug(clean);
      setStatus(next);
      setMsg(next === "published" ? "منتشر شد." : "ذخیره شد.");
    } catch {
      setMsg("ذخیره نشد. نامک را یکتا کنید.");
    }
  }

  if (!ready && !msg) return <p>در حال بارگذاری…</p>;

  return (
    <div>
      <div className="topbar">
        <button className="tiny" type="button" onClick={() => router.push("/master/posts")}>بازگشت</button>
        <div className="row-actions">
          <button className="tiny" type="button" onClick={() => save("draft")}>پیش‌نویس</button>
          <button className="btn btn-solid" type="button" onClick={() => save("published")}>انتشار</button>
          {status === "published" ? <a className="tiny" href={`/blog/${slug}`}>دیدن</a> : null}
        </div>
      </div>
      {msg ? <p className={msg.includes("نشد") || msg.includes("پیدا") ? "form-bad" : "form-ok"}>{msg}</p> : null}
      <div className="stack" style={{ display: "grid", gap: 10 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان" />
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="نامک" dir="ltr" />
        <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="چکیده" rows={3} />
        <div className="cols" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="دسته" />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="برچسب‌ها با ویرگول" />
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="نام نویسنده" />
        </div>
        <div className="row-actions">
          <button className="tiny" type="button" onClick={() => setPick("cover")}>{cover ? "تعویض تصویر شاخص" : "تصویر شاخص"}</button>
          {cover ? <button className="tiny" type="button" onClick={() => setCover("")}>حذف تصویر</button> : null}
        </div>
        {cover ? <img src={cover} alt="" style={{ maxHeight: 220, borderRadius: 12 }} /> : null}
        {ready ? (
          <RichEditor
            value={content}
            onChange={setContent}
            onRequestImage={(fn) => {
              setInsert(() => fn);
              setPick("body");
            }}
          />
        ) : null}
      </div>
      <MediaPicker
        open={pick !== null}
        onClose={() => setPick(null)}
        onPick={(url, alt) => {
          if (pick === "cover") setCover(url);
          if (pick === "body") insert?.(url, alt);
        }}
      />
    </div>
  );
}

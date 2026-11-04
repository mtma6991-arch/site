"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArticleEditor } from "@/components/admin/ArticleEditor";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { api } from "@/lib/api";
import type { PostRecord } from "@/lib/types";

export default function EditPost() {
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<PostRecord | null>(null);
  const [msg, setMsg] = useState("");
  const [pick, setPick] = useState(false);
  useEffect(() => { api.posts.get(params.id).then(setPost).catch((e) => setMsg(e.message)); }, [params.id]);
  if (!post) return <p className="text-muted">{msg || "در حال بارگذاری…"}</p>;

  async function save() {
    if (!post) return;
    const next = await api.posts.update(post.id, post);
    setPost(next);
    setMsg("ذخیره شد");
  }
  async function publish(on: boolean) {
    if (!post) return;
    await api.posts.update(post.id, post);
    const next = on ? await api.posts.publish(post.id) : await api.posts.unpublish(post.id);
    setPost(next);
    setMsg(on ? "منتشر شد" : "پیش‌نویس شد");
  }

  return (
    <div className="space-y-3">
      <a href="/master/posts" className="text-sm text-teal">بازگشت</a>
      <div className="flex flex-wrap gap-2">
        <input value={post.title} onChange={(e) => setPost({ ...post, title: e.target.value })} className="min-w-48 flex-1 rounded-lg border border-line bg-card px-3 py-2" />
        <input value={post.slug} onChange={(e) => setPost({ ...post, slug: e.target.value })} className="w-40 rounded-lg border border-line bg-card px-3 py-2" dir="ltr" />
        <button type="button" onClick={() => void save()} className="min-h-11 rounded-lg border border-line px-3 text-sm">ذخیره</button>
        <button type="button" onClick={() => void publish(post.status !== "published")} className="min-h-11 rounded-lg bg-teal px-3 text-sm text-paper">{post.status === "published" ? "پیش‌نویس" : "انتشار"}</button>
        {msg ? <span className="self-center text-sm text-muted">{msg}</span> : null}
      </div>
      <textarea value={post.excerpt} onChange={(e) => setPost({ ...post, excerpt: e.target.value })} placeholder="خلاصه" rows={2} className="w-full rounded-lg border border-line bg-card px-3 py-2" />
      <div className="flex flex-wrap items-center gap-3">
        {post.coverUrl ? <img src={post.coverUrl} alt="" className="h-16 w-24 rounded object-cover" /> : null}
        <button type="button" className="min-h-11 rounded-lg border border-line px-3 text-sm" onClick={() => setPick(true)}>تصویر شاخص</button>
        <button type="button" className="text-sm text-danger" onClick={() => setPost({ ...post, coverUrl: "", coverId: "" })}>برداشتن تصویر</button>
      </div>
      <input value={(post.tags || []).join(", ")} onChange={(e) => setPost({ ...post, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} placeholder="برچسب‌ها، با ویرگول" className="w-full rounded-lg border border-line bg-card px-3 py-2" />
      <ArticleEditor value={post.content || ""} onChange={(html) => setPost({ ...post, content: html })} />
      <div className="grid gap-3 md:grid-cols-2">
        <input value={post.seoTitle} onChange={(e) => setPost({ ...post, seoTitle: e.target.value })} placeholder="عنوان سئو" className="rounded-lg border border-line bg-card px-3 py-2" />
        <input value={post.seoDescription} onChange={(e) => setPost({ ...post, seoDescription: e.target.value })} placeholder="توضیح سئو" className="rounded-lg border border-line bg-card px-3 py-2" />
      </div>
      <MediaPicker open={pick} onClose={() => setPick(false)} onPick={(it) => setPost({ ...post, coverUrl: it.url, coverId: it.id })} />
    </div>
  );
}

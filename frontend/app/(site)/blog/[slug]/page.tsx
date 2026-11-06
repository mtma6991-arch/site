import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getRuntime } from "@/lib/api";
import { applySnippets, formatDate, safeUrl, sanitizeHtml } from "@/lib/html";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "پیدا نشد" };
  return { title: post.title, description: post.excerpt };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const runtime = await getRuntime();
  const html = sanitizeHtml(applySnippets(post.content || "", runtime.snippets));
  return (
    <article className="wrap article">
      <Link href="/blog">بازگشت به مجله</Link>
      <p className="kicker">{post.category} {post.author_name ? `· ${post.author_name}` : ""} {post.published_at ? `· ${formatDate(post.published_at)}` : ""}</p>
      <h1>{post.title}</h1>
      {post.excerpt ? <p className="lede">{post.excerpt}</p> : null}
      {post.cover ? <img className="article-cover" src={safeUrl(post.cover)} alt="" /> : null}
      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}

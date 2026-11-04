import Link from "next/link";
import { getRuntime, listPosts } from "@/lib/api";
import { formatDate } from "@/lib/html";
import { safeUrl } from "@/lib/html";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const runtime = await getRuntime();
  const posts = await listPosts(runtime.settings.posts_per_page || 9);
  return (
    <div className="wrap article">
      <h1>مجله</h1>
      <p className="muted">{runtime.settings.tagline}</p>
      <div className="post-grid">
        {posts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="post-card">
            {post.cover ? <img src={safeUrl(post.cover)} alt="" /> : <div className="cover-fallback" />}
            <div>
              <span className="kicker">{post.category} {post.published_at ? `· ${formatDate(post.published_at)}` : ""}</span>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
      {!posts.length ? <p>هنوز مقاله‌ای منتشر نشده است.</p> : null}
    </div>
  );
}

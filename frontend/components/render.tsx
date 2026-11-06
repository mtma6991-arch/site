import type { Block, PageDoc, PluginBlock, PostCard, Snippet } from "@/lib/types";
import { applySnippets, escapeHtml, renderTemplate, safeUrl, sanitizeHtml } from "@/lib/html";
import { ContactForm } from "@/components/form";

export function rowClass(pad?: string, full?: boolean, bg?: string): string {
  const tone = isDark(bg) ? "tone-dark" : "tone-light";
  return `row pad-${pad || "md"} ${full ? "is-full" : ""} ${tone}`;
}

export function isDark(bg?: string): boolean {
  if (!bg) return false;
  const hex = bg.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

function items(props: Record<string, any>, key = "items"): any[] {
  return Array.isArray(props[key]) ? props[key] : [];
}

export function RenderBlock({
  block,
  posts,
  pluginBlocks,
  snippets,
}: {
  block: Block;
  posts: PostCard[];
  pluginBlocks: PluginBlock[];
  snippets: Snippet[];
}) {
  const p = block.props || {};
  const plugin = pluginBlocks.find((b) => b.type === block.type && b.template);
  if (plugin?.template) {
    return <div className="plugin-block" dangerouslySetInnerHTML={{ __html: renderTemplate(plugin.template, p) }} />;
  }
  switch (block.type) {
    case "heading": {
      const Tag = (p.level === "h1" || p.level === "h2" || p.level === "h3" || p.level === "h4" ? p.level : "h2") as
        | "h1"
        | "h2"
        | "h3"
        | "h4";
      return <Tag className={`blk-heading align-${p.align || "start"}`}>{p.text || "عنوان"}</Tag>;
    }
    case "text":
      return (
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(applySnippets(p.html || "<p>متن</p>", snippets)) }}
        />
      );
    case "image":
      return (
        <figure className="blk-figure">
          {p.src ? <img src={safeUrl(p.src)} alt={p.alt || ""} /> : <div className="img-fallback">تصویر را از رسانه انتخاب کنید</div>}
          {p.caption ? <figcaption>{p.caption}</figcaption> : null}
        </figure>
      );
    case "button":
      return (
        <p className={`blk-actions align-${p.align || "start"}`}>
          <a className={`btn ${p.variant === "ghost" ? "btn-ghost" : "btn-solid"}`} href={safeUrl(p.href || "#")}>
            {p.text || "دکمه"}
          </a>
        </p>
      );
    case "spacer":
      return <div style={{ height: `${Number(p.size) || 32}px` }} />;
    case "divider":
      return <hr className="blk-hr" />;
    case "hero":
      return (
        <div className={`hero tone-${p.tone || "ink"}`}>
          {p.eyebrow ? <p className="eyebrow">{p.eyebrow}</p> : null}
          <h1>{p.title || "عنوان"}</h1>
          {p.subtitle ? <p className="lede">{p.subtitle}</p> : null}
          <div className="hero-actions">
            {p.buttonText ? (
              <a className="btn btn-solid" href={safeUrl(p.buttonHref || "#")}>
                {p.buttonText}
              </a>
            ) : null}
            {p.secondText ? (
              <a className="btn btn-ghost" href={safeUrl(p.secondHref || "#")}>
                {p.secondText}
              </a>
            ) : null}
          </div>
        </div>
      );
    case "features":
      return (
        <div className="feature-grid">
          {items(p).map((item, i) => (
            <article key={i} className="feature">
              <span className="idx">{String(i + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      );
    case "cards":
      return (
        <div className="card-grid">
          {items(p).map((item, i) => (
            <article key={i} className="info-card">
              {item.image ? <img src={safeUrl(item.image)} alt="" /> : null}
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              {item.href ? <a href={safeUrl(item.href)}>{item.linkLabel || "بیشتر"}</a> : null}
            </article>
          ))}
        </div>
      );
    case "stats":
      return (
        <div className="stat-grid">
          {items(p).map((item, i) => (
            <div key={i}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      );
    case "faq":
      return (
        <div className="faq">
          {p.title ? <h2>{p.title}</h2> : null}
          {items(p).map((item, i) => (
            <details key={i}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      );
    case "quote":
      return (
        <blockquote className="pull">
          <p>{p.text}</p>
          {p.cite ? <cite>{p.cite}</cite> : null}
        </blockquote>
      );
    case "cta":
      return (
        <div className={`cta tone-${p.tone || "solid"}`}>
          <h2>{p.title}</h2>
          {p.text ? <p>{p.text}</p> : null}
          {p.buttonText ? (
            <a className="btn btn-solid" href={safeUrl(p.buttonHref || "#")}>
              {p.buttonText}
            </a>
          ) : null}
        </div>
      );
    case "pricing":
      return (
        <div className="price-grid">
          {items(p).map((item, i) => (
            <article key={i} className={item.featured ? "price featured" : "price"}>
              <h3>{item.name}</h3>
              <p className="amount">
                {item.price} <small>{item.period}</small>
              </p>
              <ul>
                {String(item.features || "")
                  .split("\n")
                  .filter(Boolean)
                  .map((line: string, n: number) => (
                    <li key={n}>{line}</li>
                  ))}
              </ul>
              {item.buttonText ? (
                <a className="btn btn-solid" href={safeUrl(item.buttonHref || "#")}>
                  {item.buttonText}
                </a>
              ) : null}
            </article>
          ))}
        </div>
      );
    case "testimonials":
      return (
        <div className="quote-grid">
          {items(p).map((item, i) => (
            <figure key={i}>
              <blockquote>{item.quote}</blockquote>
              <figcaption>
                <strong>{item.name}</strong>
                <span>{item.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      );
    case "gallery":
      return (
        <div className="gallery">
          {items(p, "images").map((src: string, i: number) => (
            <img key={i} src={safeUrl(String(src))} alt="" />
          ))}
        </div>
      );
    case "video":
      return <VideoBlock url={String(p.url || "")} title={String(p.title || "")} />;
    case "form":
      return <ContactForm title={p.title || "تماس"} text={p.text || ""} button={p.button || "ارسال"} />;
    case "posts":
      return (
        <div>
          {p.title ? <h2 className="blk-heading">{p.title}</h2> : null}
          <div className="post-grid">
            {posts.slice(0, Number(p.count) || 3).map((post) => (
              <a key={post.id} className="post-card" href={`/blog/${post.slug}`}>
                {post.cover ? <img src={safeUrl(post.cover)} alt="" /> : <div className="cover-fallback" />}
                <div>
                  {post.category ? <span className="kicker">{post.category}</span> : null}
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      );
    case "html":
      return <div className="prose" dangerouslySetInnerHTML={{ __html: applySnippets(p.html || "", snippets) }} />;
    case "alert":
      return <div className={`alert tone-${p.tone || "pine"}`}>{p.text}</div>;
    case "tabs":
      return (
        <div className="tabs">
          {items(p).map((item, i) => (
            <details key={i} open={i === 0}>
              <summary>{item.label}</summary>
              <div className="prose" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.text || "") }} />
            </details>
          ))}
        </div>
      );
    case "logos":
      return (
        <div className="logo-row">
          {items(p).map((item, i) =>
            item.image ? <img key={i} src={safeUrl(item.image)} alt={item.alt || ""} /> : <span key={i}>{item.alt || "لوگو"}</span>,
          )}
        </div>
      );
    default:
      return null;
  }
}

function VideoBlock({ url, title }: { url: string; title: string }) {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/);
  if (yt) {
    return (
      <div className="video">
        <iframe
          src={`https://www.youtube.com/embed/${yt[1]}`}
          title={title || "ویدیو"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (url && safeUrl(url) !== "#") {
    return (
      <video className="video-file" controls src={safeUrl(url)}>
        {title}
      </video>
    );
  }
  return <div className="img-fallback">نشانی ویدیو را وارد کنید</div>;
}

export function PageView({
  doc,
  posts,
  pluginBlocks,
  snippets,
}: {
  doc: PageDoc;
  posts: PostCard[];
  pluginBlocks: PluginBlock[];
  snippets: Snippet[];
}) {
  if (!doc.rows.length) {
    return <p className="empty-public">این صفحه هنوز قطعه‌ای ندارد.</p>;
  }
  return (
    <div className="page">
      {doc.rows.map((row) => (
        <section key={row.id} className={rowClass(row.props?.pad, row.props?.full, row.props?.bg)} style={{ background: row.props?.bg || "transparent" }}>
          <div className="wrap">
            <div className="cols" style={{ gridTemplateColumns: `repeat(${Math.max(row.columns.length, 1)}, minmax(0, 1fr))` }}>
              {row.columns.map((col) => (
                <div key={col.id} className="col">
                  {col.blocks.map((block) => (
                    <RenderBlock key={block.id} block={block} posts={posts} pluginBlocks={pluginBlocks} snippets={snippets} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

export function pluginBlocksOf(plugins: { blocks?: PluginBlock[] | null }[]): PluginBlock[] {
  const out: PluginBlock[] = [];
  for (const plugin of plugins) {
    for (const block of plugin.blocks || []) {
      if (block?.type && block.template) out.push(block);
    }
  }
  return out;
}

export function coreCatalog(): { type: string; label: string; group: string; defaults: Record<string, any> }[] {
  return [
    { type: "heading", label: "عنوان", group: "محتوا", defaults: { text: "عنوان تازه", level: "h2", align: "start" } },
    { type: "text", label: "متن", group: "محتوا", defaults: { html: "<p>متن را از بازرس بنویسید.</p>" } },
    { type: "image", label: "تصویر", group: "رسانه", defaults: { src: "", alt: "", caption: "" } },
    { type: "gallery", label: "گالری", group: "رسانه", defaults: { images: [] } },
    { type: "video", label: "ویدیو", group: "رسانه", defaults: { url: "", title: "" } },
    { type: "button", label: "دکمه", group: "محتوا", defaults: { text: "ادامه", href: "/", variant: "solid", align: "start" } },
    { type: "quote", label: "نقل‌قول", group: "محتوا", defaults: { text: "جمله‌ای که باید بماند.", cite: "" } },
    { type: "alert", label: "اعلان", group: "محتوا", defaults: { text: "یک خبر کوتاه", tone: "pine" } },
    { type: "divider", label: "جداکننده", group: "چیدمان", defaults: {} },
    { type: "spacer", label: "فاصله", group: "چیدمان", defaults: { size: 40 } },
    { type: "hero", label: "هیرو", group: "بازاریابی", defaults: { eyebrow: "شروع", title: "عنوان اصلی", subtitle: "توضیح کوتاه زیر عنوان.", buttonText: "اقدام", buttonHref: "/", secondText: "", secondHref: "/", tone: "ink" } },
    { type: "features", label: "ویژگی‌ها", group: "بازاریابی", defaults: { items: [{ title: "ویژگی", text: "شرح کوتاه." }, { title: "ویژگی دوم", text: "شرح کوتاه." }] } },
    { type: "cards", label: "کارت‌ها", group: "بازاریابی", defaults: { items: [{ title: "کارت", text: "توضیح", image: "", href: "", linkLabel: "بیشتر" }] } },
    { type: "stats", label: "آمار", group: "بازاریابی", defaults: { items: [{ value: "۱۲", label: "پروژه" }, { value: "۴", label: "سال" }] } },
    { type: "pricing", label: "تعرفه", group: "بازاریابی", defaults: { items: [{ name: "پایه", price: "۰", period: "تومان", features: "مورد اول\nمورد دوم", buttonText: "انتخاب", buttonHref: "/master", featured: false }] } },
    { type: "testimonials", label: "نظرها", group: "بازاریابی", defaults: { items: [{ quote: "تجربهٔ کوتاه.", name: "نام", role: "سمت" }] } },
    { type: "faq", label: "پرسش‌ها", group: "بازاریابی", defaults: { title: "پرسش‌های رایج", items: [{ q: "پرسش؟", a: "پاسخ." }] } },
    { type: "cta", label: "فراخوان", group: "بازاریابی", defaults: { title: "آماده هستید؟", text: "یک جمله.", buttonText: "شروع", buttonHref: "/master", tone: "solid" } },
    { type: "tabs", label: "زبانه‌ها", group: "محتوا", defaults: { items: [{ label: "اول", text: "<p>متن زبانه</p>" }, { label: "دوم", text: "<p>متن دوم</p>" }] } },
    { type: "logos", label: "لوگوها", group: "رسانه", defaults: { items: [{ image: "", alt: "نام" }] } },
    { type: "form", label: "فرم تماس", group: "داده", defaults: { title: "پیام بگذارید", text: "پاسخ را در صندوق ورودی پنل می‌بینید.", button: "ارسال" } },
    { type: "posts", label: "آخرین مقاله‌ها", group: "داده", defaults: { title: "از مجله", count: 3 } },
    { type: "html", label: "HTML", group: "داده", defaults: { html: "<p>HTML سفارشی</p>" } },
  ];
}

export function escapePlain(s: string): string {
  return escapeHtml(s);
}

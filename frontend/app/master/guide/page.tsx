import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

export default async function GuidePage() {
  const file = path.join(process.cwd(), "content", "plugin-development.md");
  let md = "";
  try {
    md = await readFile(file, "utf8");
  } catch {
    md = "راهنما پیدا نشد.";
  }
  return (
    <article className="ng-prose max-w-3xl">
      <h1 className="text-2xl font-semibold">راهنمای ساخت افزونه</h1>
      <Guide markdown={md} />
    </article>
  );
}

function Guide({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n{2,}/);
  return (
    <div>
      {blocks.map((block, i) => {
        if (block.startsWith("```")) {
          const code = block.replace(/^```[a-z]*\n?/, "").replace(/```$/, "");
          return <pre key={i} dir="ltr"><code>{code}</code></pre>;
        }
        if (block.startsWith("# ")) return <h2 key={i}>{block.slice(2)}</h2>;
        if (block.startsWith("## ")) return <h3 key={i}>{block.slice(3)}</h3>;
        if (block.startsWith("### ")) return <h3 key={i}>{block.slice(4)}</h3>;
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return <ul key={i}>{lines.map((l) => <li key={l}>{l.slice(2)}</li>)}</ul>;
        }
        return <p key={i}>{block}</p>;
      })}
    </div>
  );
}

import fs from "fs";
import path from "path";
import { renderMarkdown } from "@/lib/html";

export const dynamic = "force-dynamic";

export default function DevelopersPage() {
  const file = path.join(process.cwd(), "..", "docs", "plugin-development.md");
  let md = "راهنما پیدا نشد.";
  try {
    md = fs.readFileSync(file, "utf8");
  } catch {
    /* keep fallback */
  }
  return <article className="wrap doc" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />;
}

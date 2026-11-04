"use client";

import { useEffect, useRef } from "react";
import { safeUrl } from "@/lib/html";

const TOOLS: { cmd: string; label: string; arg?: string }[] = [
  { cmd: "bold", label: "ضخیم" },
  { cmd: "italic", label: "کج" },
  { cmd: "underline", label: "زیرخط" },
  { cmd: "strikeThrough", label: "خط‌خورده" },
  { cmd: "formatBlock", label: "تیتر ۲", arg: "H2" },
  { cmd: "formatBlock", label: "تیتر ۳", arg: "H3" },
  { cmd: "formatBlock", label: "بند", arg: "P" },
  { cmd: "insertUnorderedList", label: "فهرست" },
  { cmd: "insertOrderedList", label: "شماره‌دار" },
  { cmd: "formatBlock", label: "نقل", arg: "BLOCKQUOTE" },
  { cmd: "formatBlock", label: "کد", arg: "PRE" },
  { cmd: "justifyRight", label: "راست" },
  { cmd: "justifyCenter", label: "وسط" },
  { cmd: "justifyLeft", label: "چپ" },
  { cmd: "removeFormat", label: "پاک‌کردن قالب" },
  { cmd: "undo", label: "بازگشت" },
  { cmd: "redo", label: "از نو" },
];

export function RichEditor({
  value,
  onChange,
  onRequestImage,
}: {
  value: string;
  onChange: (html: string) => void;
  onRequestImage?: (insert: (url: string, alt: string) => void) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (!ref.current || seeded.current) return;
    ref.current.innerHTML = value || "<p></p>";
    seeded.current = true;
  }, [value]);

  function emit() {
    const html = ref.current?.innerHTML || "";
    onChange(html);
  }

  function run(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  }

  function link() {
    const url = window.prompt("نشانی پیوند");
    if (!url) return;
    run("createLink", safeUrl(url));
  }

  function image() {
    const insert = (url: string, alt: string) => {
      ref.current?.focus();
      document.execCommand("insertHTML", false, `<img src="${safeUrl(url)}" alt="${alt.replace(/"/g, "")}">`);
      emit();
    };
    if (onRequestImage) onRequestImage(insert);
    else {
      const url = window.prompt("نشانی تصویر");
      if (url) insert(url, "");
    }
  }

  const words = (ref.current?.innerText || value || "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="editor">
      <div className="editor-bar" role="toolbar" aria-label="ابزار نوشتن">
        {TOOLS.map((tool) => (
          <button key={tool.label} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => run(tool.cmd, tool.arg)}>
            {tool.label}
          </button>
        ))}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={link}>
          پیوند
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={image}>
          تصویر
        </button>
        <span className="words">{words.toLocaleString("fa-IR")} واژه</span>
      </div>
      <div
        ref={ref}
        className="editor-surface prose"
        contentEditable
        dir="rtl"
        role="textbox"
        aria-multiline="true"
        aria-label="متن مقاله"
        onInput={emit}
        suppressContentEditableWarning
      />
    </div>
  );
}

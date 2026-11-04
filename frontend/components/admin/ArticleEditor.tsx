"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import CharacterCount from "@tiptap/extension-character-count";
import { useState } from "react";
import { MediaPicker } from "./MediaPicker";

export function ArticleEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [source, setSource] = useState(false);
  const [raw, setRaw] = useState(value);
  const [pick, setPick] = useState(false);
  const [link, setLink] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Placeholder.configure({ placeholder: "بنویسید…" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      CharacterCount,
    ],
    content: value,
    editorProps: { attributes: { class: "ng-prose min-h-80 px-4 py-3 focus:outline-none", dir: "rtl" } },
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  if (!editor) return <div className="h-80 rounded-xl border border-line bg-card" />;
  const count = editor.storage.characterCount?.characters?.() ?? 0;
  function run(fn: () => void) { fn(); }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <div className="flex flex-wrap gap-1 border-b border-line p-2">
        <Tool on={() => run(() => editor.chain().focus().toggleBold().run())} active={editor.isActive("bold")}>ضخیم</Tool>
        <Tool on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>کج</Tool>
        <Tool on={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}>خط</Tool>
        <Tool on={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}>خط‌خورده</Tool>
        <Tool on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>تیتر</Tool>
        <Tool on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>زیرتیتر</Tool>
        <Tool on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>فهرست</Tool>
        <Tool on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>شماره</Tool>
        <Tool on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>نقل</Tool>
        <Tool on={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")}>کد</Tool>
        <Tool on={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")}>هایلایت</Tool>
        <Tool on={() => editor.chain().focus().setTextAlign("right").run()}>راست</Tool>
        <Tool on={() => editor.chain().focus().setTextAlign("center").run()}>وسط</Tool>
        <Tool on={() => editor.chain().focus().setTextAlign("left").run()}>چپ</Tool>
        <Tool on={() => editor.chain().focus().setHorizontalRule().run()}>خط افقی</Tool>
        <Tool on={() => editor.chain().focus().undo().run()}>واگرد</Tool>
        <Tool on={() => editor.chain().focus().redo().run()}>ازنو</Tool>
        <Tool on={() => setPick(true)}>تصویر</Tool>
        <Tool on={() => setSource((s) => { if (!s) setRaw(editor.getHTML()); else editor.commands.setContent(raw); return !s; })}>HTML</Tool>
      </div>
      <div className="flex gap-2 border-b border-line p-2">
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className="flex-1 rounded border border-line bg-paper px-2 py-1 text-sm" dir="ltr" />
        <button type="button" className="min-h-10 rounded border border-line px-2 text-xs" onClick={() => { if (link) editor.chain().focus().setLink({ href: link }).run(); }}>پیوند</button>
        <button type="button" className="min-h-10 rounded border border-line px-2 text-xs" onClick={() => editor.chain().focus().unsetLink().run()}>برداشتن پیوند</button>
      </div>
      {source ? (
        <textarea value={raw} onChange={(e) => { setRaw(e.target.value); onChange(e.target.value); }} className="min-h-80 w-full bg-ink p-4 font-mono text-sm text-paper" dir="ltr" />
      ) : (
        <EditorContent editor={editor} />
      )}
      <p className="border-t border-line px-3 py-2 text-xs text-muted">{count} نویسه</p>
      <MediaPicker open={pick} onClose={() => setPick(false)} onPick={(it) => editor.chain().focus().setImage({ src: it.url, alt: it.alt }).run()} />
    </div>
  );
}

function Tool({ children, on, active }: { children: React.ReactNode; on: () => void; active?: boolean }) {
  return <button type="button" onClick={on} className={`min-h-10 rounded px-2 text-xs ${active ? "bg-ink text-paper" : "bg-mist"}`}>{children}</button>;
}

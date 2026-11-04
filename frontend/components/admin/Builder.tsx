"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BlockList } from "@/components/blocks/BlockView";
import { MediaPicker } from "./MediaPicker";
import { coreCatalog, mergeCatalog } from "@/lib/catalog";
import { api } from "@/lib/api";
import { createNode, duplicateNode, findHit, insertNode, moveNode, removeNode, setColumnCount, updateProps } from "@/lib/tree";
import type { BlockNode, ElementDef, PageRecord, PropDef } from "@/lib/types";

export function Builder({ initial }: { initial: PageRecord }) {
  const [page, setPage] = useState(initial);
  const [tree, setTree] = useState<BlockNode[]>(initial.tree || []);
  const [selected, setSelected] = useState<string | null>(null);
  const [defs, setDefs] = useState<ElementDef[]>(coreCatalog);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"canvas" | "blocks" | "props">("canvas");
  const [width, setWidth] = useState<"full" | "tablet" | "phone">("full");
  const past = useRef<BlockNode[][]>([]);
  const gesture = useRef(false);
  const treeRef = useRef(tree);
  treeRef.current = tree;

  useEffect(() => {
    api.plugins.elements().then((r) => setDefs(mergeCatalog(r.items || []))).catch(() => {});
  }, []);

  function checkpoint() {
    past.current = [...past.current.slice(-40), structuredClone(treeRef.current)];
    gesture.current = false;
  }
  function commit(next: BlockNode[]) {
    checkpoint();
    setTree(next);
  }
  function preview(next: BlockNode[]) {
    if (!gesture.current) {
      past.current = [...past.current.slice(-40), structuredClone(treeRef.current)];
      gesture.current = true;
    }
    setTree(next);
  }
  function undo() {
    const prev = past.current.pop();
    if (prev) setTree(prev);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "s") {
        e.preventDefault();
        void save();
      }
      if (meta && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (e.key === "Delete" && selected && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        commit(removeNode(treeRef.current, selected));
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const selectedNode = useMemo(() => (selected ? findHit(tree, selected)?.list[findHit(tree, selected)!.index] : null), [tree, selected]);
  const def = defs.find((d) => d.type === selectedNode?.type);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const next = await api.pages.update(page.id, {
        title: page.title, slug: page.slug, tree, seoTitle: page.seoTitle, seoDescription: page.seoDescription,
      });
      setPage(next);
      setTree(next.tree || []);
      setMsg("ذخیره شد");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  }
  async function publish(on: boolean) {
    setBusy(true);
    try {
      await api.pages.update(page.id, { title: page.title, slug: page.slug, tree, seoTitle: page.seoTitle, seoDescription: page.seoDescription });
      const next = on ? await api.pages.publish(page.id) : await api.pages.unpublish(page.id);
      setPage(next);
      setMsg(on ? "منتشر شد" : "پیش‌نویس شد");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  function add(type: string) {
    const node = createNode(type, defs);
    commit(insertNode(tree, selected, node));
    setSelected(node.id);
    setTab("canvas");
  }

  function onDragStart(e: React.DragEvent, type: string) {
    e.dataTransfer.setData("application/x-negar", type);
    e.dataTransfer.effectAllowed = "copy";
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/x-negar");
    const moveId = e.dataTransfer.getData("application/x-negar-move");
    if (type) add(type);
    else if (moveId && selected && moveId !== selected) {
      const next = moveNear(tree, moveId, selected);
      commit(next);
    }
  }

  const canvasW = width === "phone" ? "max-w-[390px]" : width === "tablet" ? "max-w-[768px]" : "max-w-none";
  const palette = defs.filter((d) => !d.hidden && d.type !== "column");
  const groups = [...new Set(palette.map((d) => d.category))];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={page.title} onChange={(e) => setPage({ ...page, title: e.target.value })} className="min-w-40 flex-1 rounded-lg border border-line bg-card px-3 py-2" />
        <input value={page.slug} onChange={(e) => setPage({ ...page, slug: e.target.value })} className="w-40 rounded-lg border border-line bg-card px-3 py-2" dir="ltr" />
        <span className="rounded-full bg-mist px-3 py-1 text-xs">{page.status === "published" ? "منتشر" : "پیش‌نویس"}</span>
        <button type="button" onClick={undo} className="min-h-11 rounded-lg border border-line px-3 text-sm">بازگشت</button>
        <button type="button" disabled={busy} onClick={() => void save()} className="min-h-11 rounded-lg border border-line px-3 text-sm">ذخیره</button>
        {page.status === "published"
          ? <button type="button" disabled={busy} onClick={() => void publish(false)} className="min-h-11 rounded-lg border border-line px-3 text-sm">پیش‌نویس</button>
          : <button type="button" disabled={busy} onClick={() => void publish(true)} className="min-h-11 rounded-lg bg-teal px-3 text-sm text-paper">انتشار</button>}
        <a href={"/" + page.slug} target="_blank" className="min-h-11 inline-flex items-center text-sm text-teal">نمایش</a>
        {msg ? <span className="text-sm text-muted">{msg}</span> : null}
      </div>
      <div className="flex gap-2 md:hidden">
        {(["blocks", "canvas", "props"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`min-h-11 flex-1 rounded-lg text-sm ${tab === t ? "bg-ink text-paper" : "bg-mist"}`}>{t === "blocks" ? "المان" : t === "canvas" ? "بوم" : "تنظیم"}</button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[220px_1fr_280px]">
        <aside className={`${tab === "blocks" ? "block" : "hidden"} max-h-[70vh] overflow-auto rounded-xl border border-line bg-card p-3 lg:block`}>
          {groups.map((g) => (
            <div key={g} className="mb-3">
              <p className="mb-1 text-xs text-muted">{g}</p>
              <div className="grid grid-cols-2 gap-1">
                {palette.filter((d) => d.category === g).map((d) => (
                  <button key={d.type} type="button" draggable onDragStart={(e) => onDragStart(e, d.type)} onClick={() => add(d.type)} className="rounded-lg border border-line px-2 py-2 text-start text-xs">{d.label}</button>
                ))}
              </div>
            </div>
          ))}
        </aside>
        <section className={`${tab === "canvas" ? "block" : "hidden"} lg:block`} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          <div className="mb-2 flex gap-2">
            {(["full", "tablet", "phone"] as const).map((w) => (
              <button key={w} type="button" onClick={() => setWidth(w)} className={`min-h-10 rounded-lg px-3 text-xs ${width === w ? "bg-ink text-paper" : "bg-mist"}`}>{w === "full" ? "رایانه" : w === "tablet" ? "تبلت" : "موبایل"}</button>
            ))}
          </div>
          <div className={`mx-auto overflow-hidden rounded-xl border border-line bg-paper ${canvasW}`} onClick={() => setSelected(null)}>
            <BlockList nodes={tree} editing selectedId={selected} onSelect={(id) => { setSelected(id); setTab("props"); }} elements={defs} />
          </div>
        </section>
        <aside className={`${tab === "props" ? "block" : "hidden"} max-h-[70vh] overflow-auto rounded-xl border border-line bg-card p-3 lg:block`} onBlur={() => { gesture.current = false; }}>
          <label className="mb-3 block text-xs text-muted">عنوان سئو
            <input value={page.seoTitle} onChange={(e) => setPage({ ...page, seoTitle: e.target.value })} className="mt-1 w-full rounded-lg border border-line bg-paper px-2 py-2 text-sm" />
          </label>
          <label className="mb-3 block text-xs text-muted">توضیح سئو
            <textarea value={page.seoDescription} onChange={(e) => setPage({ ...page, seoDescription: e.target.value })} className="mt-1 w-full rounded-lg border border-line bg-paper px-2 py-2 text-sm" rows={2} />
          </label>
          {!selectedNode || !def ? <p className="text-sm text-muted">یک المان را انتخاب کنید. المان را از ستون چپ بکشید یا کلیک کنید.</p> : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <strong className="text-sm">{def.label}</strong>
                <div className="flex gap-1">
                  <button type="button" className="min-h-10 rounded border border-line px-2 text-xs" onClick={() => commit(moveNode(tree, selectedNode.id, -1))}>بالا</button>
                  <button type="button" className="min-h-10 rounded border border-line px-2 text-xs" onClick={() => commit(moveNode(tree, selectedNode.id, 1))}>پایین</button>
                  <button type="button" className="min-h-10 rounded border border-line px-2 text-xs" onClick={() => commit(duplicateNode(tree, selectedNode.id))}>کپی</button>
                  <button type="button" className="min-h-10 rounded border border-line px-2 text-xs text-danger" onClick={() => { commit(removeNode(tree, selectedNode.id)); setSelected(null); }}>حذف</button>
                </div>
              </div>
              {selectedNode.type === "columns" ? (
                <div className="flex gap-1">
                  {[2, 3, 4].map((n) => (
                    <button key={n} type="button" className="min-h-10 flex-1 rounded border border-line text-xs" onClick={() => commit(setColumnCount(tree, selectedNode.id, n, defs))}>{n} ستون</button>
                  ))}
                </div>
              ) : null}
              {def.props.map((prop) => (
                <Field key={prop.key} prop={prop} value={selectedNode.props[prop.key]} onChange={(v) => preview(updateProps(treeRef.current, selectedNode.id, { ...selectedNode.props, [prop.key]: v }))} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function moveNear(tree: BlockNode[], fromId: string, toId: string) {
  const next = structuredClone(tree);
  const from = findHit(next, fromId);
  const to = findHit(next, toId);
  if (!from || !to || from.list !== to.list) return tree;
  const [item] = from.list.splice(from.index, 1);
  const idx = from.list.findIndex((n) => n.id === toId);
  from.list.splice(idx < 0 ? from.list.length : idx, 0, item);
  return next;
}

function Field({ prop, value, onChange }: { prop: PropDef; value: unknown; onChange: (v: unknown) => void }) {
  const [pick, setPick] = useState(false);
  if (prop.type === "textarea") {
    return <label className="block text-xs text-muted">{prop.label}<textarea value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-line bg-paper px-2 py-2 text-sm text-ink" /></label>;
  }
  if (prop.type === "select") {
    return (
      <label className="block text-xs text-muted">{prop.label}
        <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-paper px-2 py-2 text-sm text-ink">
          {(prop.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    );
  }
  if (prop.type === "switch") {
    return <label className="flex min-h-11 items-center justify-between text-sm"><span>{prop.label}</span><input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} /></label>;
  }
  if (prop.type === "align") {
    return (
      <div className="flex gap-1">
        {[["start", "راست"], ["center", "وسط"], ["end", "چپ"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => onChange(v)} className={`min-h-10 flex-1 rounded text-xs ${value === v ? "bg-ink text-paper" : "bg-mist"}`}>{l}</button>
        ))}
      </div>
    );
  }
  if (prop.type === "color") {
    return <label className="flex items-center justify-between text-xs text-muted">{prop.label}<input type="color" value={typeof value === "string" && value.startsWith("#") ? value : "#1c1915"} onChange={(e) => onChange(e.target.value)} /></label>;
  }
  if (prop.type === "image") {
    return (
      <div className="text-xs text-muted">
        <span>{prop.label}</span>
        {typeof value === "string" && value ? <img src={value} alt="" className="mt-1 h-16 w-full rounded object-cover" /> : null}
        <button type="button" className="mt-1 min-h-10 w-full rounded border border-line" onClick={() => setPick(true)}>انتخاب رسانه</button>
        <MediaPicker open={pick} onClose={() => setPick(false)} onPick={(it) => onChange(it.url)} />
      </div>
    );
  }
  if (prop.type === "repeater") {
    const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted">{prop.label}</p>
        {items.map((item, i) => (
          <div key={i} className="space-y-1 rounded-lg border border-line p-2">
            {(prop.itemFields || []).map((f) => (
              <Field key={f.key} prop={f} value={item[f.key]} onChange={(v) => {
                const copy = items.map((x, idx) => idx === i ? { ...x, [f.key]: v } : x);
                onChange(copy);
              }} />
            ))}
            <button type="button" className="text-xs text-danger" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>حذف ردیف</button>
          </div>
        ))}
        <button type="button" className="min-h-10 w-full rounded border border-dashed border-line text-xs" onClick={() => {
          const blank: Record<string, unknown> = {};
          for (const f of prop.itemFields || []) if (f.default !== undefined) blank[f.key] = f.default;
          onChange([...items, blank]);
        }}>ردیف تازه</button>
      </div>
    );
  }
  return <label className="block text-xs text-muted">{prop.label}<input value={value == null ? "" : String(value)} onChange={(e) => onChange(prop.type === "number" ? Number(e.target.value) : e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-paper px-2 py-2 text-sm text-ink" /></label>;
}

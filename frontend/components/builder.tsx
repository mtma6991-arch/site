"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { coreCatalog, PageView } from "@/components/render";
import { MediaPicker } from "@/components/media";
import { RichEditor } from "@/components/editor";
import { pbClient } from "@/lib/pb";
import { RESERVED_SLUGS, asDoc, emptyDoc, publicPath, slugify, uid, type Block, type PageDoc, type PluginBlock, type PluginField, type Row } from "@/lib/types";

type Field = PluginField & { type: string };

const CORE_FIELDS: Record<string, Field[]> = {
  heading: [
    { key: "text", label: "متن", type: "text" },
    { key: "level", label: "سطح", type: "select", options: ["h1", "h2", "h3", "h4"].map((v) => ({ value: v, label: v })) },
    { key: "align", label: "چینش", type: "select", options: [{ value: "start", label: "شروع" }, { value: "center", label: "وسط" }] },
  ],
  text: [{ key: "html", label: "متن", type: "rich" }],
  image: [
    { key: "src", label: "تصویر", type: "image" },
    { key: "alt", label: "متن جایگزین", type: "text" },
    { key: "caption", label: "توضیح", type: "text" },
  ],
  gallery: [{ key: "images", label: "تصویرها، هر خط یک نشانی", type: "lines" }],
  video: [
    { key: "url", label: "نشانی یوتیوب یا فایل", type: "text" },
    { key: "title", label: "عنوان", type: "text" },
  ],
  button: [
    { key: "text", label: "متن", type: "text" },
    { key: "href", label: "پیوند", type: "text" },
    { key: "variant", label: "حالت", type: "select", options: [{ value: "solid", label: "پر" }, { value: "ghost", label: "خطی" }] },
    { key: "align", label: "چینش", type: "select", options: [{ value: "start", label: "شروع" }, { value: "center", label: "وسط" }] },
  ],
  quote: [
    { key: "text", label: "متن", type: "textarea" },
    { key: "cite", label: "منبع", type: "text" },
  ],
  alert: [
    { key: "text", label: "متن", type: "textarea" },
    { key: "tone", label: "حالت", type: "select", options: [{ value: "pine", label: "سبز" }, { value: "copper", label: "مسی" }, { value: "ink", label: "تیره" }] },
  ],
  spacer: [{ key: "size", label: "ارتفاع پیکسل", type: "number" }],
  hero: [
    { key: "eyebrow", label: "بالای عنوان", type: "text" },
    { key: "title", label: "عنوان", type: "text" },
    { key: "subtitle", label: "زیرعنوان", type: "textarea" },
    { key: "buttonText", label: "دکمه", type: "text" },
    { key: "buttonHref", label: "پیوند دکمه", type: "text" },
    { key: "secondText", label: "دکمه دوم", type: "text" },
    { key: "secondHref", label: "پیوند دوم", type: "text" },
    { key: "tone", label: "زمینه", type: "select", options: [{ value: "ink", label: "تیره" }, { value: "paper", label: "روشن" }] },
  ],
  features: [{ key: "items", label: "موارد", type: "list", itemFields: [{ key: "title", label: "عنوان", type: "text" }, { key: "text", label: "شرح", type: "textarea" }] }],
  cards: [{ key: "items", label: "کارت‌ها", type: "list", itemFields: [{ key: "title", label: "عنوان", type: "text" }, { key: "text", label: "شرح", type: "textarea" }, { key: "image", label: "تصویر", type: "image" }, { key: "href", label: "پیوند", type: "text" }, { key: "linkLabel", label: "متن پیوند", type: "text" }] }],
  stats: [{ key: "items", label: "آمار", type: "list", itemFields: [{ key: "value", label: "عدد", type: "text" }, { key: "label", label: "برچسب", type: "text" }] }],
  pricing: [{ key: "items", label: "طرح‌ها", type: "list", itemFields: [{ key: "name", label: "نام", type: "text" }, { key: "price", label: "قیمت", type: "text" }, { key: "period", label: "واحد", type: "text" }, { key: "features", label: "امکانات، هر خط یکی", type: "textarea" }, { key: "buttonText", label: "دکمه", type: "text" }, { key: "buttonHref", label: "پیوند", type: "text" }, { key: "featured", label: "برجسته", type: "bool" }] }],
  testimonials: [{ key: "items", label: "نظرها", type: "list", itemFields: [{ key: "quote", label: "نقل", type: "textarea" }, { key: "name", label: "نام", type: "text" }, { key: "role", label: "سمت", type: "text" }] }],
  faq: [
    { key: "title", label: "عنوان", type: "text" },
    { key: "items", label: "پرسش‌ها", type: "list", itemFields: [{ key: "q", label: "پرسش", type: "text" }, { key: "a", label: "پاسخ", type: "textarea" }] },
  ],
  cta: [
    { key: "title", label: "عنوان", type: "text" },
    { key: "text", label: "متن", type: "textarea" },
    { key: "buttonText", label: "دکمه", type: "text" },
    { key: "buttonHref", label: "پیوند", type: "text" },
  ],
  tabs: [{ key: "items", label: "زبانه‌ها", type: "list", itemFields: [{ key: "label", label: "برچسب", type: "text" }, { key: "text", label: "متن HTML", type: "textarea" }] }],
  logos: [{ key: "items", label: "لوگوها", type: "list", itemFields: [{ key: "image", label: "تصویر", type: "image" }, { key: "alt", label: "نام", type: "text" }] }],
  form: [
    { key: "title", label: "عنوان", type: "text" },
    { key: "text", label: "توضیح", type: "textarea" },
    { key: "button", label: "دکمه", type: "text" },
  ],
  posts: [
    { key: "title", label: "عنوان", type: "text" },
    { key: "count", label: "تعداد", type: "number" },
  ],
  html: [{ key: "html", label: "HTML", type: "textarea" }],
};

type CatalogItem = { type: string; label: string; group: string; defaults: Record<string, any>; fields?: Field[] };

export function Builder({ id }: { id: string }) {
  const router = useRouter();
  const [doc, setDoc] = useState<PageDoc>(emptyDoc());
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("draft");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>(coreCatalog());
  const [pluginBlocks, setPluginBlocks] = useState<PluginBlock[]>([]);
  const [sel, setSel] = useState<{ row: string; col?: string; block?: string } | null>(null);
  const [picker, setPicker] = useState<null | { row: string; col: string } | { prop: string }>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const past = useRef<PageDoc[]>([]);
  const docRef = useRef(doc);
  docRef.current = doc;

  useEffect(() => {
    const pb = pbClient();
    pb.collection("pages").getOne(id).then((rec) => {
      setTitle(rec.title || "");
      setSlug(rec.slug || "");
      setStatus(rec.status || "draft");
      setSeoTitle(rec.seo_title || "");
      setSeoDescription(rec.seo_description || "");
      setDoc(asDoc(rec.document));
    }).catch(() => setMsg("صفحه پیدا نشد."));
    fetch(`${pb.baseUrl}/api/negar/plugins`, { headers: { Authorization: pb.authStore.token } })
      .then((r) => r.json())
      .then((data) => {
        const blocks: PluginBlock[] = [];
        const extra: CatalogItem[] = [];
        for (const plugin of data.plugins || []) {
          if (!plugin.enabled) continue;
          for (const block of plugin.blocks || []) {
            blocks.push(block);
            extra.push({
              type: block.type,
              label: block.label || block.type,
              group: block.group || "افزونه",
              defaults: block.defaults || {},
              fields: block.fields || [],
            });
          }
        }
        setPluginBlocks(blocks);
        setCatalog([...coreCatalog(), ...extra]);
      })
      .catch(() => undefined);
  }, [id]);

  function commit(next: PageDoc) {
    past.current.push(structuredClone(docRef.current));
    if (past.current.length > 40) past.current.shift();
    setDoc(next);
  }
  function undo() {
    const prev = past.current.pop();
    if (prev) setDoc(prev);
  }

  function addRow(cols: number) {
    const row: Row = {
      id: uid("r"),
      props: { bg: "", pad: "md", full: false },
      columns: Array.from({ length: cols }, () => ({ id: uid("c"), blocks: [] })),
    };
    commit({ ...doc, rows: [...doc.rows, row] });
    setSel({ row: row.id });
  }

  function addBlock(rowId: string, colId: string, type: string, index?: number) {
    const def = catalog.find((c) => c.type === type);
    const block: Block = { id: uid("b"), type, props: structuredClone(def?.defaults || {}) };
    const next = structuredClone(doc);
    const row = next.rows.find((r) => r.id === rowId);
    const col = row?.columns.find((c) => c.id === colId);
    if (!col) return;
    col.blocks.splice(index ?? col.blocks.length, 0, block);
    commit(next);
    setSel({ row: rowId, col: colId, block: block.id });
  }

  function moveBlock(from: string, toRow: string, toCol: string) {
    const [, rowId, colId, blockId] = from.split(":");
    const next = structuredClone(doc);
    let block: Block | undefined;
    for (const row of next.rows) {
      if (row.id !== rowId) continue;
      for (const col of row.columns) {
        if (col.id !== colId) continue;
        const i = col.blocks.findIndex((b) => b.id === blockId);
        if (i >= 0) block = col.blocks.splice(i, 1)[0];
      }
    }
    const dest = next.rows.find((r) => r.id === toRow)?.columns.find((c) => c.id === toCol);
    if (block && dest) dest.blocks.push(block);
    commit(next);
  }

  function patchBlock(rowId: string, colId: string, blockId: string, props: Record<string, any>) {
    const next = structuredClone(doc);
    const block = next.rows.find((r) => r.id === rowId)?.columns.find((c) => c.id === colId)?.blocks.find((b) => b.id === blockId);
    if (!block) return;
    block.props = props;
    setDoc(next);
  }

  function removeBlock(rowId: string, colId: string, blockId: string) {
    const next = structuredClone(doc);
    const col = next.rows.find((r) => r.id === rowId)?.columns.find((c) => c.id === colId);
    if (!col) return;
    col.blocks = col.blocks.filter((b) => b.id !== blockId);
    commit(next);
    setSel(null);
  }

  function shiftBlock(rowId: string, colId: string, blockId: string, dir: number) {
    const next = structuredClone(doc);
    const col = next.rows.find((r) => r.id === rowId)?.columns.find((c) => c.id === colId);
    if (!col) return;
    const i = col.blocks.findIndex((b) => b.id === blockId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= col.blocks.length) return;
    const [b] = col.blocks.splice(i, 1);
    col.blocks.splice(j, 0, b);
    commit(next);
  }

  function duplicateBlock(rowId: string, colId: string, blockId: string) {
    const next = structuredClone(doc);
    const col = next.rows.find((r) => r.id === rowId)?.columns.find((c) => c.id === colId);
    if (!col) return;
    const i = col.blocks.findIndex((b) => b.id === blockId);
    if (i < 0) return;
    const copy = structuredClone(col.blocks[i]);
    copy.id = uid("b");
    col.blocks.splice(i + 1, 0, copy);
    commit(next);
  }

  function patchRow(rowId: string, props: Row["props"]) {
    const next = structuredClone(doc);
    const row = next.rows.find((r) => r.id === rowId);
    if (!row) return;
    row.props = props;
    setDoc(next);
  }

  function shiftRow(rowId: string, dir: number) {
    const next = structuredClone(doc);
    const i = next.rows.findIndex((r) => r.id === rowId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= next.rows.length) return;
    const [r] = next.rows.splice(i, 1);
    next.rows.splice(j, 0, r);
    commit(next);
  }

  function removeRow(rowId: string) {
    commit({ ...doc, rows: doc.rows.filter((r) => r.id !== rowId) });
    setSel(null);
  }

  function setColumns(rowId: string, count: number) {
    const next = structuredClone(doc);
    const row = next.rows.find((r) => r.id === rowId);
    if (!row) return;
    while (row.columns.length < count) row.columns.push({ id: uid("c"), blocks: [] });
    if (row.columns.length > count) {
      const extra = row.columns.splice(count).flatMap((c) => c.blocks);
      row.columns[row.columns.length - 1].blocks.push(...extra);
    }
    commit(next);
  }

  function onDrop(e: React.DragEvent, rowId: string, colId: string) {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    if (data.startsWith("negar:new:")) addBlock(rowId, colId, data.slice(10));
    else if (data.startsWith("negar:move:")) moveBlock(data, rowId, colId);
  }

  async function save(nextStatus = status) {
    setBusy(true);
    setMsg("");
    try {
      const clean = slugify(slug);
      if (!clean) throw new Error("نامک خالی است");
      if (RESERVED_SLUGS.has(clean)) throw new Error("این نامک رزرو شده است");
      await pbClient().collection("pages").update(id, {
        title: title.trim() || "بدون عنوان",
        slug: clean,
        status: nextStatus,
        seo_title: seoTitle,
        seo_description: seoDescription,
        document: doc,
        published_at: nextStatus === "published" ? new Date().toISOString() : "",
      });
      setSlug(clean);
      setStatus(nextStatus);
      setMsg(nextStatus === "published" ? "منتشر شد." : "ذخیره شد.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "ذخیره نشد. نامک تکراری یا داده نامعتبر است.");
    } finally {
      setBusy(false);
    }
  }

  const selected = useMemo(() => {
    if (!sel?.block || !sel.col) return null;
    const row = doc.rows.find((r) => r.id === sel.row);
    const col = row?.columns.find((c) => c.id === sel.col);
    const block = col?.blocks.find((b) => b.id === sel.block);
    if (!row || !col || !block) return null;
    const def = catalog.find((c) => c.type === block.type);
    const fields = def?.fields?.length ? def.fields : CORE_FIELDS[block.type] || [];
    return { row, col, block, fields };
  }, [sel, doc, catalog]);

  const groups = catalog.reduce<Record<string, CatalogItem[]>>((acc, item) => {
    (acc[item.group] ||= []).push(item);
    return acc;
  }, {});

  return (
    <div>
      <div className="topbar">
        <div>
          <button className="tiny" type="button" onClick={() => router.push("/master/pages")}>بازگشت</button>
        </div>
        <div className="row-actions">
          <button className="tiny" type="button" onClick={undo}>بازگشت تغییر</button>
          <button className="tiny" type="button" disabled={busy} onClick={() => save("draft")}>ذخیره پیش‌نویس</button>
          <button className="btn btn-solid" type="button" disabled={busy} onClick={() => save("published")}>انتشار</button>
          {status === "published" ? <a className="tiny" href={publicPath(slug)} target="_blank" rel="noreferrer">دیدن</a> : null}
        </div>
      </div>
      {msg ? <p className={msg.includes("نشد") || msg.includes("خالی") || msg.includes("رزرو") ? "form-bad" : "form-ok"}>{msg}</p> : null}
      <div className="builder">
        <aside className="palette">
          <h3>قطعه‌ها</h3>
          <p className="muted">بکشید داخل ستون، یا روی ستون «افزودن» بزنید.</p>
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="group-label">{group}</div>
              {items.map((item) => (
                <button
                  key={item.type}
                  className="chip"
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", `negar:new:${item.type}`)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </aside>
        <div className="canvas-wrap">
          <div className="stack" style={{ display: "grid", gap: 8, marginBottom: 10 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان صفحه" />
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="نامک" dir="ltr" />
          </div>
          <div className="row-actions" style={{ marginBottom: 10 }}>
            {[1, 2, 3, 4].map((n) => (
              <button key={n} className="tiny" type="button" onClick={() => addRow(n)}>ردیف {n} ستون</button>
            ))}
          </div>
          {doc.rows.map((row) => (
            <div key={row.id} className={sel?.row === row.id && !sel.block ? "b-row selected" : "b-row"} onClick={() => setSel({ row: row.id })}>
              <div className="b-toolbar">
                <button type="button" onClick={() => shiftRow(row.id, -1)}>بالا</button>
                <button type="button" onClick={() => shiftRow(row.id, 1)}>پایین</button>
                <button type="button" onClick={() => setColumns(row.id, Math.min(4, row.columns.length + 1))}>ستون +</button>
                <button type="button" onClick={() => setColumns(row.id, Math.max(1, row.columns.length - 1))}>ستون −</button>
                <button type="button" onClick={() => removeRow(row.id)}>حذف ردیف</button>
              </div>
              <div className="cols" style={{ gridTemplateColumns: `repeat(${row.columns.length}, minmax(0,1fr))` }}>
                {row.columns.map((col) => (
                  <div
                    key={col.id}
                    className="b-col"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDrop(e, row.id, col.id)}
                  >
                    {col.blocks.map((block) => (
                      <div
                        key={block.id}
                        className={sel?.block === block.id ? "b-block selected" : "b-block"}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData("text/plain", `negar:move:${row.id}:${col.id}:${block.id}`);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSel({ row: row.id, col: col.id, block: block.id });
                        }}
                      >
                        <div className="b-toolbar">
                          <button type="button" onClick={() => shiftBlock(row.id, col.id, block.id, -1)}>بالا</button>
                          <button type="button" onClick={() => shiftBlock(row.id, col.id, block.id, 1)}>پایین</button>
                          <button type="button" onClick={() => duplicateBlock(row.id, col.id, block.id)}>کپی</button>
                          <button type="button" onClick={() => removeBlock(row.id, col.id, block.id)}>حذف</button>
                        </div>
                        <PageView doc={{ version: 1, rows: [{ ...row, columns: [{ ...col, blocks: [block] }] }] }} posts={[]} pluginBlocks={pluginBlocks} snippets={[]} />
                      </div>
                    ))}
                    <details>
                      <summary>افزودن قطعه</summary>
                      <div>
                        {catalog.map((item) => (
                          <button key={item.type} className="tiny" type="button" onClick={() => addBlock(row.id, col.id, item.type)}>{item.label}</button>
                        ))}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!doc.rows.length ? <p className="muted">هنوز ردیفی نیست. از دکمه‌های بالای بوم یک ردیف بسازید.</p> : null}
        </div>
        <aside className="inspector">
          <h3>ویژگی‌ها</h3>
          {sel && !selected ? (
            <RowFields
              row={doc.rows.find((r) => r.id === sel.row)!}
              onChange={(props) => patchRow(sel.row, props)}
            />
          ) : null}
          {selected ? (
            <div className="stack" style={{ display: "grid", gap: 8 }}>
              <p className="muted">{catalog.find((c) => c.type === selected.block.type)?.label || selected.block.type}</p>
              {selected.fields.map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={selected.block.props[field.key]}
                  onChange={(value) => patchBlock(selected.row.id, selected.col.id, selected.block.id, { ...selected.block.props, [field.key]: value })}
                  onPickImage={() => setPicker({ prop: field.key })}
                />
              ))}
            </div>
          ) : null}
          <h3>سئو</h3>
          <label className="field">عنوان سئو<input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} /></label>
          <label className="field">توضیح سئو<textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} /></label>
          {RESERVED_SLUGS.has(slugify(slug)) ? <p className="form-bad">نامک blog، master، developers و api رزرو است.</p> : null}
        </aside>
      </div>
      <MediaPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        onPick={(url) => {
          if (!picker || !("prop" in picker) || !selected) return;
          const key = picker.prop;
          const current = selected.block.props[key];
          const value = Array.isArray(current) ? [...current, url] : url;
          patchBlock(selected.row.id, selected.col.id, selected.block.id, { ...selected.block.props, [key]: value });
        }}
      />
    </div>
  );
}

function RowFields({ row, onChange }: { row: Row; onChange: (props: Row["props"]) => void }) {
  if (!row) return null;
  const props = row.props || {};
  return (
    <div className="stack" style={{ display: "grid", gap: 8 }}>
      <label className="field">زمینهٔ ردیف<input value={props.bg || ""} onChange={(e) => onChange({ ...props, bg: e.target.value })} placeholder="#f6f1e7" dir="ltr" /></label>
      <label className="field">فاصله
        <select value={props.pad || "md"} onChange={(e) => onChange({ ...props, pad: e.target.value })}>
          <option value="sm">کم</option>
          <option value="md">معمول</option>
          <option value="lg">زیاد</option>
        </select>
      </label>
      <label className="field"><span>تمام‌عرض</span>
        <input type="checkbox" checked={!!props.full} onChange={(e) => onChange({ ...props, full: e.target.checked })} />
      </label>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  onPickImage,
}: {
  field: Field;
  value: any;
  onChange: (v: any) => void;
  onPickImage?: () => void;
}) {
  if (field.type === "list") {
    const list = Array.isArray(value) ? value : [];
    return (
      <div className="field">
        <span>{field.label}</span>
        {list.map((item: Record<string, any>, i: number) => (
          <div key={i} className="list-item">
            {(field.itemFields || []).map((sub) => (
              <FieldInput
                key={sub.key}
                field={sub}
                value={item?.[sub.key]}
                onChange={(v) => {
                  const next = list.slice();
                  next[i] = { ...item, [sub.key]: v };
                  onChange(next);
                }}
              />
            ))}
            <button className="tiny" type="button" onClick={() => onChange(list.filter((_: unknown, j: number) => j !== i))}>حذف مورد</button>
          </div>
        ))}
        <button className="tiny" type="button" onClick={() => onChange([...list, {}])}>افزودن مورد</button>
      </div>
    );
  }
  if (field.type === "rich") return <RichEditor value={String(value || "")} onChange={onChange} />;
  if (field.type === "textarea") return <label className="field">{field.label}<textarea value={String(value || "")} onChange={(e) => onChange(e.target.value)} /></label>;
  if (field.type === "lines") {
    return (
      <label className="field">{field.label}
        <textarea value={Array.isArray(value) ? value.join("\n") : String(value || "")} onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} />
        {onPickImage ? <button className="tiny" type="button" onClick={onPickImage}>افزودن از رسانه</button> : null}
      </label>
    );
  }
  if (field.type === "bool") return <label className="field">{field.label}<input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /></label>;
  if (field.type === "number") return <label className="field">{field.label}<input type="number" value={Number(value || 0)} onChange={(e) => onChange(Number(e.target.value))} /></label>;
  if (field.type === "select") {
    return (
      <label className="field">{field.label}
        <select value={String(value || "")} onChange={(e) => onChange(e.target.value)}>
          {(field.options || []).map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
      </label>
    );
  }
  if (field.type === "image") {
    return (
      <label className="field">{field.label}
        <input value={String(value || "")} onChange={(e) => onChange(e.target.value)} dir="ltr" />
        {onPickImage ? <button className="tiny" type="button" onClick={onPickImage}>انتخاب از رسانه</button> : null}
      </label>
    );
  }
  return <label className="field">{field.label}<input value={String(value || "")} onChange={(e) => onChange(e.target.value)} /></label>;
}

"use client";

import { useEffect, useState } from "react";
import { mediaFileUrl, pbClient } from "@/lib/pb";

type Item = { id: string; file: string; title?: string; alt?: string; created?: string };

export function MediaPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (url: string, alt: string) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  if (!open) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="مرکز رسانه">
      <div className="modal-card">
        <header>
          <strong>انتخاب از رسانه</strong>
          <button type="button" onClick={onClose}>
            بستن
          </button>
        </header>
        <MediaGrid
          items={items}
          setItems={setItems}
          q={q}
          setQ={setQ}
          onPick={(item) => {
            onPick(mediaFileUrl(item), item.alt || item.title || "");
            onClose();
          }}
        />
      </div>
    </div>
  );
}

export function MediaGrid({
  items,
  setItems,
  q,
  setQ,
  onPick,
  manageable,
}: {
  items: Item[];
  setItems: (items: Item[]) => void;
  q: string;
  setQ: (q: string) => void;
  onPick?: (item: Item) => void;
  manageable?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const pb = pbClient();
    const res = await pb.collection("media").getList<Item>(1, 80, { sort: "-created" });
    setItems(res.items);
  }

  useEffect(() => {
    load().catch(() => setError("فهرست رسانه خوانده نشد."));
  }, []);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setError("");
    try {
      const pb = pbClient();
      for (const file of Array.from(list)) {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("title", file.name.replace(/\.[^.]+$/, ""));
        fd.set("alt", "");
        await pb.collection("media").create(fd);
      }
      await load();
    } catch {
      setError("بارگذاری نشد. نوع یا حجم فایل را چک کنید (حداکثر ۲۰ مگابایت).");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Item) {
    if (!confirm("این فایل حذف شود؟")) return;
    await pbClient().collection("media").delete(item.id);
    await load();
  }

  async function saveAlt(item: Item, alt: string) {
    await pbClient().collection("media").update(item.id, { alt });
    setItems(items.map((it) => (it.id === item.id ? { ...it, alt } : it)));
  }

  const shown = items.filter((item) => {
    const hay = `${item.title || ""} ${item.alt || ""} ${item.file || ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <div className="media-grid-wrap">
      <div className="media-tools">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو در عنوان و توضیح" />
        <label className="btn btn-solid">
          {busy ? "در حال بارگذاری" : "بارگذاری فایل"}
          <input type="file" multiple hidden disabled={busy} onChange={(e) => upload(e.target.files)} />
        </label>
      </div>
      {error ? <p className="form-bad">{error}</p> : null}
      <div className="media-grid">
        {shown.map((item) => {
          const url = mediaFileUrl(item);
          const thumb = mediaFileUrl(item, true);
          const image = /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(item.file);
          return (
            <article key={item.id}>
              <button type="button" className="thumb" onClick={() => onPick?.(item)}>
                {image ? <img src={thumb || url} alt={item.alt || ""} /> : <span className="file-chip">{item.file.split(".").pop()}</span>}
              </button>
              <input
                defaultValue={item.alt || ""}
                placeholder="متن جایگزین"
                onBlur={(e) => {
                  if (e.target.value !== (item.alt || "")) saveAlt(item, e.target.value);
                }}
              />
              <div className="media-actions">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(url);
                  }}
                >
                  کپی نشانی
                </button>
                {onPick ? (
                  <button type="button" onClick={() => onPick(item)}>
                    انتخاب
                  </button>
                ) : null}
                {manageable ? (
                  <button type="button" onClick={() => remove(item)}>
                    حذف
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {!shown.length ? <p className="muted">فایلی نیست. از دکمهٔ بارگذاری شروع کنید.</p> : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MediaItem } from "@/lib/types";

export function MediaPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (item: MediaItem) => void }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!open) return;
    api.media.list().then((r) => setItems(r.items)).catch((e) => setErr(e.message));
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">انتخاب از رسانه</h2>
          <button type="button" className="min-h-11 px-2" onClick={onClose}>بستن</button>
        </div>
        {err ? <p className="text-sm text-danger">{err}</p> : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((it) => (
            <button key={it.id} type="button" className="overflow-hidden rounded-lg border border-line text-start" onClick={() => { onPick(it); onClose(); }}>
              {it.mime.startsWith("image/") ? <img src={it.url} alt={it.alt} className="h-24 w-full object-cover" /> : <div className="grid h-24 place-items-center text-xs text-muted">{it.mime}</div>}
              <span className="block truncate px-2 py-1 text-xs">{it.title || it.filename}</span>
            </button>
          ))}
        </div>
        {items.length === 0 ? <p className="py-8 text-center text-sm text-muted">رسانه‌ای نیست. اول از بخش رسانه بارگذاری کنید.</p> : null}
      </div>
    </div>
  );
}

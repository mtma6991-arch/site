"use client";

import { useState } from "react";
import { MediaGrid } from "@/components/media";

type Item = { id: string; file: string; title?: string; alt?: string };

export default function MediaPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  return (
    <div>
      <div className="topbar"><h1>مرکز رسانه</h1></div>
      <MediaGrid items={items} setItems={setItems} q={q} setQ={setQ} manageable />
    </div>
  );
}

"use client";

import PocketBase, { type RecordModel } from "pocketbase";

let client: PocketBase | null = null;

export function browserPbBase(): string {
  const env = process.env.NEXT_PUBLIC_PB_URL?.replace(/\/$/, "");
  if (env) return env;
  if (typeof window === "undefined") return "/pb";
  return `${window.location.origin}/pb`;
}

export function pbClient(): PocketBase {
  if (!client) {
    client = new PocketBase(browserPbBase());
    client.autoCancellation(false);
  }
  return client;
}

export function isStaff(record: RecordModel | null | undefined): boolean {
  const role = String(record?.role || "");
  return role === "admin" || role === "editor" || role === "author";
}

export function mediaFileUrl(record: { id: string; file?: string }, thumb = false): string {
  const file = record.file || "";
  if (!file) return "";
  const path = `/api/files/media/${record.id}/${encodeURIComponent(file)}${thumb ? "?thumb=480x480f" : ""}`;
  const env = process.env.NEXT_PUBLIC_PB_URL?.replace(/\/$/, "");
  if (env) return env + path;
  return "/pb" + path;
}

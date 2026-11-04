"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "@/components/shell";

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === "/master/login") return children;
  return <AdminShell>{children}</AdminShell>;
}

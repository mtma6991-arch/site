"use client";

import { usePathname } from "next/navigation";
import { Shell } from "@/components/admin/Shell";

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === "/master/login") return <>{children}</>;
  return <Shell>{children}</Shell>;
}

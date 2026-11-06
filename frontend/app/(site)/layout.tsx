import { headers } from "next/headers";
import { SiteChrome } from "@/components/chrome";
import { getRuntime } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") || "/";
  const runtime = await getRuntime();
  return (
    <SiteChrome runtime={runtime} path={path}>
      {children}
    </SiteChrome>
  );
}

import { SiteShell, fallbackSite } from "@/components/site/SiteShell";

export default function NotFound() {
  return (
    <SiteShell site={fallbackSite}>
      <section className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">صفحه پیدا نشد</h1>
        <a href="/" className="mt-6 inline-flex min-h-11 items-center text-teal">بازگشت به خانه</a>
      </section>
    </SiteShell>
  );
}

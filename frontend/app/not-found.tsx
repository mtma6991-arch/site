import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap article">
      <h1>این صفحه نیست</h1>
      <p>یا هنوز منتشر نشده، یا نشانی اشتباه است.</p>
      <Link className="btn btn-solid" href="/">بازگشت به خانه</Link>
    </main>
  );
}

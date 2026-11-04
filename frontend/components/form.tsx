"use client";

import { useState } from "react";
import { browserPbBase } from "@/lib/pb";

export function ContactForm({ title, text, button }: { title: string; text: string; button: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setState("sending");
    try {
      const res = await fetch(`${browserPbBase()}/api/collections/submissions/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form: title || "contact",
          page: window.location.pathname,
          payload: data,
        }),
      });
      if (!res.ok) throw new Error("fail");
      form.reset();
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <form className="contact" onSubmit={onSubmit}>
      <h2>{title}</h2>
      {text ? <p>{text}</p> : null}
      <label>
        نام
        <input name="name" required autoComplete="name" />
      </label>
      <label>
        ایمیل
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        پیام
        <textarea name="message" required rows={5} />
      </label>
      <button className="btn btn-solid" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "در حال ارسال" : button || "ارسال"}
      </button>
      {state === "done" ? <p className="form-ok">پیام رسید. در صندوق پنل دیده می‌شود.</p> : null}
      {state === "error" ? <p className="form-bad">ارسال نشد. کمی بعد دوباره تلاش کنید.</p> : null}
    </form>
  );
}

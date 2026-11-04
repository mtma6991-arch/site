"use client";

import { useParams } from "next/navigation";
import { Builder } from "@/components/builder";

export default function EditPage() {
  const params = useParams<{ id: string }>();
  return <Builder id={params.id} />;
}

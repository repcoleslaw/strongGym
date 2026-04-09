import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/rbac";
import { createFeedPost } from "@/lib/repositories";

function textFromFormData(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: NextRequest) {
  const sessionResult = requireRole(req, "admin");
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as { title?: string; body?: string; source?: string };
    if (!body.title || !body.body || !body.source) {
      return NextResponse.json({ error: "title, body, and source are required" }, { status: 400 });
    }
    const created = await createFeedPost(body.title, body.body, body.source, sessionResult.name);
    return NextResponse.json(created, { status: 201 });
  }

  const formData = await req.formData();
  const title = textFromFormData(formData.get("title"));
  const source = textFromFormData(formData.get("source"));
  const body = textFromFormData(formData.get("body"));
  if (!title || !source || !body) {
    return NextResponse.json({ error: "title, body, and source are required" }, { status: 400 });
  }
  await createFeedPost(title, body, source, sessionResult.name);
  return NextResponse.redirect(new URL("/admin", req.url));
}

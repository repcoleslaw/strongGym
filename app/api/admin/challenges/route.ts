import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/rbac";
import { closeChallenge, createChallenge } from "@/lib/repositories";

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
    const body = (await req.json()) as {
      _action?: "create" | "close";
      challengeId?: string;
      title?: string;
      description?: string;
    };
    if (body._action === "close" && body.challengeId) {
      await closeChallenge(body.challengeId);
      return NextResponse.json({ ok: true });
    }
    if (!body.title || !body.description) {
      return NextResponse.json({ error: "title and description are required" }, { status: 400 });
    }
    const created = await createChallenge(body.title, body.description);
    return NextResponse.json(created, { status: 201 });
  }

  const formData = await req.formData();
  const action = textFromFormData(formData.get("_action")) || "create";
  const challengeId = textFromFormData(formData.get("challengeId"));
  if (action === "close" && challengeId) {
    await closeChallenge(challengeId);
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  const title = textFromFormData(formData.get("title"));
  const description = textFromFormData(formData.get("description"));
  if (!title || !description) {
    return NextResponse.json({ error: "title and description are required" }, { status: 400 });
  }
  await createChallenge(title, description);
  return NextResponse.redirect(new URL("/admin", req.url));
}

import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/rbac";
import { submitChallengeEntry } from "@/lib/repositories";

function textFromFormData(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: NextRequest) {
  const sessionResult = requireSession(req);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as { challengeId?: string; proofText?: string };
    if (!body.challengeId || !body.proofText) {
      return NextResponse.json({ error: "challengeId and proofText are required" }, { status: 400 });
    }
    await submitChallengeEntry(body.challengeId, sessionResult.userId, sessionResult.name, body.proofText);
    return NextResponse.json({ ok: true });
  }

  const formData = await req.formData();
  const challengeId = textFromFormData(formData.get("challengeId"));
  const proofText = textFromFormData(formData.get("proofText"));
  if (!challengeId || !proofText) {
    return NextResponse.json({ error: "challengeId and proofText are required" }, { status: 400 });
  }

  await submitChallengeEntry(challengeId, sessionResult.userId, sessionResult.name, proofText);
  redirect("/dashboard");
}

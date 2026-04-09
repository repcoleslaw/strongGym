import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/rbac";
import { setChallengeWinner } from "@/lib/repositories";

function textFromFormData(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionResult = requireRole(req, "admin");
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as { winnerUserId?: string };
    if (!body.winnerUserId) {
      return NextResponse.json({ error: "winnerUserId is required" }, { status: 400 });
    }
    await setChallengeWinner(params.id, body.winnerUserId);
    return NextResponse.json({ ok: true });
  }

  const formData = await req.formData();
  const winnerUserId = textFromFormData(formData.get("winnerUserId"));
  if (!winnerUserId) {
    return NextResponse.json({ error: "winnerUserId is required" }, { status: 400 });
  }
  await setChallengeWinner(params.id, winnerUserId);
  return NextResponse.redirect(new URL("/admin", req.url));
}

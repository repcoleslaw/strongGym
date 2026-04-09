import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/rbac";
import { getCurrentChallenge } from "@/lib/repositories";

export async function GET(req: NextRequest) {
  const sessionResult = requireSession(req);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }
  const challenge = await getCurrentChallenge();
  return NextResponse.json(challenge);
}

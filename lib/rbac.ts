import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/session";
import type { Role, SessionUser } from "@/lib/types";

export function requireSession(req: NextRequest): SessionUser | NextResponse {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

export function requireRole(req: NextRequest, role: Role): SessionUser | NextResponse {
  const result = requireSession(req);
  if (result instanceof NextResponse) {
    return result;
  }
  if (result.role !== role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}

import { NextRequest, NextResponse } from "next/server";

import { authenticateUser, setSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { email?: string; password?: string };
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const user = authenticateUser(body.email, body.password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, role: user.role });
  setSessionCookie(response, user);
  return response;
}

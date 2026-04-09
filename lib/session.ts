import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import type { SessionUser } from "@/lib/types";

const cookieName = process.env.SESSION_COOKIE_NAME ?? "sg_session";

type SeedUser = SessionUser & {
  password: string;
};

const seedUsers: SeedUser[] = [
  {
    userId: "u-100",
    name: "Sam Member",
    email: "member@stronggym.local",
    password: "member123",
    role: "member"
  },
  {
    userId: "a-001",
    name: "Alex Admin",
    email: "admin@stronggym.local",
    password: "admin123",
    role: "admin"
  }
];

export function authenticateUser(email: string, password: string): SessionUser | null {
  const match = seedUsers.find((u) => u.email === email && u.password === password);
  if (!match) {
    return null;
  }
  return {
    userId: match.userId,
    name: match.name,
    email: match.email,
    role: match.role
  };
}

export function setSessionCookie(response: NextResponse, user: SessionUser) {
  response.cookies.set(cookieName, JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export function getSessionFromRequest(req: NextRequest): SessionUser | null {
  const raw = req.cookies.get(cookieName)?.value;
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function getServerSession(): SessionUser | null {
  const raw = cookies().get(cookieName)?.value;
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

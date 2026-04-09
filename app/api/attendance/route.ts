import { NextRequest, NextResponse } from "next/server";

import {
  getHeatmapLookbackDaysForPreset,
  normalizeHeatmapLookbackDays,
  normalizeHeatmapViewPreset,
  utcTodayKey
} from "@/lib/attendance-heatmap";
import { incrementAttendanceVisit, listAttendance } from "@/lib/repositories";
import { requireSession } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const sessionResult = requireSession(req);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  const rawPreset = req.nextUrl.searchParams.get("preset");
  if (rawPreset) {
    const preset = normalizeHeatmapViewPreset(rawPreset);
    const days = getHeatmapLookbackDaysForPreset(preset);
    const attendance = await listAttendance(sessionResult.userId, days);
    return NextResponse.json({ attendance, days, preset });
  }

  const raw = req.nextUrl.searchParams.get("days");
  const days = normalizeHeatmapLookbackDays(raw ?? 90);
  const attendance = await listAttendance(sessionResult.userId, days);

  return NextResponse.json({ attendance, days });
}

export async function POST(req: NextRequest) {
  const sessionResult = requireSession(req);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  const allowedDate = utcTodayKey();
  let requestedDate: string | undefined;
  try {
    const body = (await req.json()) as { date?: unknown };
    requestedDate = typeof body?.date === "string" ? body.date : undefined;
  } catch {
    requestedDate = undefined;
  }

  const dateKey = requestedDate ?? allowedDate;
  if (dateKey !== allowedDate) {
    return NextResponse.json(
      { error: "Visits can only be logged for the current UTC calendar day." },
      { status: 400 }
    );
  }

  const record = await incrementAttendanceVisit(sessionResult.userId, dateKey);
  return NextResponse.json({ record });
}

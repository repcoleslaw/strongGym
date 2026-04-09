import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/rbac";
import { getCurrentChallenge, listAttendance, listFeedPosts } from "@/lib/repositories";

export async function GET(req: NextRequest) {
  const sessionResult = requireSession(req);
  if (sessionResult instanceof NextResponse) {
    return sessionResult;
  }

  const [attendance, challenge, feedPosts] = await Promise.all([
    listAttendance(sessionResult.userId, 90),
    getCurrentChallenge(),
    listFeedPosts()
  ]);

  return NextResponse.json({
    user: sessionResult,
    attendance,
    challenge,
    feedPosts,
    points: attendance.reduce((sum, row) => sum + Math.max(0, Math.floor(row.visitCount)), 0) * 10
  });
}

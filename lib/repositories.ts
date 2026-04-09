import { ObjectId } from "mongodb";

import {
  HEATMAP_MAX_DAYS,
  addDaysToDateKey,
  lookbackRangeStartKey,
  normalizeHeatmapLookbackDays,
  sliceLastAttendanceDays,
  utcTodayKey
} from "@/lib/attendance-heatmap";
import { getDb } from "@/lib/mongodb";
import type { AttendanceRecord, Challenge, FeedPost } from "@/lib/types";

/** Supports legacy Mongo documents that used `attended: boolean`. */
export function normalizeAttendanceRecord(doc: AttendanceRecord & { attended?: boolean }): AttendanceRecord {
  if (typeof doc.visitCount === "number" && !Number.isNaN(doc.visitCount)) {
    return {
      userId: doc.userId,
      date: doc.date,
      visitCount: Math.max(0, Math.floor(doc.visitCount))
    };
  }
  const legacy = doc.attended === true ? 1 : 0;
  return {
    userId: doc.userId,
    date: doc.date,
    visitCount: legacy
  };
}

const useMockData = process.env.USE_MOCK_DATA === "true" || !process.env.MONGODB_URI;

type MockStore = {
  attendanceByUser: Map<string, AttendanceRecord[]>;
  challenges: Challenge[];
  feedPosts: FeedPost[];
};

const mockStore: MockStore = createMockStore();

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildAttendance(userId: string, days: number): AttendanceRecord[] {
  const end = utcTodayKey();
  const records: AttendanceRecord[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dateKey = addDaysToDateKey(end, -i);
    const [y, m, d] = dateKey.split("-").map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const base = dayOfWeek !== 0 && Math.random() > 0.3 ? 1 : 0;
    const visitCount = base > 0 ? base + Math.floor(Math.random() * 3) : 0;
    records.push({
      userId,
      date: dateKey,
      visitCount
    });
  }
  return records;
}

function createMockStore(): MockStore {
  const challengeId = "mock-challenge-001";
  const now = new Date();
  const older = new Date(now);
  older.setDate(now.getDate() - 2);

  return {
    attendanceByUser: new Map<string, AttendanceRecord[]>([
      ["u-100", buildAttendance("u-100", HEATMAP_MAX_DAYS)],
      ["a-001", buildAttendance("a-001", HEATMAP_MAX_DAYS)]
    ]),
    challenges: [
      {
        _id: challengeId,
        title: "Most Active Week",
        description: "Complete at least 4 workouts this week and post your proof.",
        status: "open",
        monthKey: getMonthKey(),
        submissions: [
          {
            userId: "u-100",
            userName: "Sam Member",
            proofText: "Completed 5 sessions including mobility and cardio.",
            submittedAt: older.toISOString()
          }
        ]
      }
    ],
    feedPosts: [
      {
        _id: "mock-post-001",
        title: "Coach Ana: Mobility Monday",
        body: "8-minute hip mobility sequence before squats.",
        source: "Instagram",
        author: "Coach Ana",
        postedAt: now.toISOString()
      },
      {
        _id: "mock-post-002",
        title: "Coach Leo: Core Finisher",
        body: "Try 3 rounds: 45s plank, 20 dead bugs, 15 russian twists.",
        source: "YouTube",
        author: "Coach Leo",
        postedAt: older.toISOString()
      }
    ]
  };
}

export async function listAttendance(userId: string, lookback?: number) {
  const days = normalizeHeatmapLookbackDays(lookback ?? 90);
  const rangeStart = lookbackRangeStartKey(days);

  if (useMockData) {
    let existing = mockStore.attendanceByUser.get(userId);
    if (!existing) {
      existing = buildAttendance(userId, HEATMAP_MAX_DAYS);
      mockStore.attendanceByUser.set(userId, existing);
    }
    return sliceLastAttendanceDays(existing, days);
  }

  const db = await getDb();
  const coll = db.collection<AttendanceRecord>("attendance");
  let rows = await coll
    .find({ userId, date: { $gte: rangeStart } })
    .sort({ date: 1 })
    .toArray();

  if (rows.length > 0) {
    return rows.map((r) => normalizeAttendanceRecord(r as AttendanceRecord & { attended?: boolean }));
  }

  const end = utcTodayKey();
  const seeded: AttendanceRecord[] = [];
  for (let i = HEATMAP_MAX_DAYS - 1; i >= 0; i--) {
    seeded.push({
      userId,
      date: addDaysToDateKey(end, -i),
      visitCount: Math.random() > 0.45 ? 1 + Math.floor(Math.random() * 2) : 0
    });
  }
  await coll.insertMany(seeded);
  rows = await coll
    .find({ userId, date: { $gte: rangeStart } })
    .sort({ date: 1 })
    .toArray();
  return rows.map((r) => normalizeAttendanceRecord(r as AttendanceRecord & { attended?: boolean }));
}

/**
 * Increase visit count by 1 for the given UTC calendar day (YYYY-MM-DD).
 */
export async function incrementAttendanceVisit(userId: string, dateKey: string) {
  if (useMockData) {
    let rows = mockStore.attendanceByUser.get(userId);
    if (!rows) {
      rows = buildAttendance(userId, HEATMAP_MAX_DAYS);
      mockStore.attendanceByUser.set(userId, rows);
    }
    const idx = rows.findIndex((r) => r.date === dateKey);
    if (idx >= 0) {
      const prev = normalizeAttendanceRecord(rows[idx] as AttendanceRecord & { attended?: boolean });
      const next: AttendanceRecord = {
        ...prev,
        visitCount: prev.visitCount + 1
      };
      const copy = [...rows];
      copy[idx] = next;
      mockStore.attendanceByUser.set(userId, copy);
      return next;
    }
    const inserted: AttendanceRecord = { userId, date: dateKey, visitCount: 1 };
    const copy = [...rows, inserted].sort((a, b) => a.date.localeCompare(b.date));
    mockStore.attendanceByUser.set(userId, copy);
    return inserted;
  }

  const db = await getDb();
  const coll = db.collection<AttendanceRecord & { attended?: boolean }>("attendance");
  const existing = await coll.findOne({ userId, date: dateKey });
  const base = existing
    ? normalizeAttendanceRecord(existing as AttendanceRecord & { attended?: boolean })
    : { userId, date: dateKey, visitCount: 0 };
  const next: AttendanceRecord = {
    userId,
    date: dateKey,
    visitCount: base.visitCount + 1
  };
  await coll.replaceOne({ userId, date: dateKey }, next, { upsert: true });
  return next;
}

export async function getCurrentChallenge() {
  if (useMockData) {
    const monthKey = getMonthKey();
    const openChallenge = mockStore.challenges.find((item) => item.monthKey === monthKey && item.status === "open");
    if (openChallenge) {
      return openChallenge;
    }
    const fallback: Challenge = {
      _id: `mock-challenge-${Date.now()}`,
      title: "Most Active Week",
      description: "Complete at least 4 workouts this week and post your proof.",
      status: "open",
      monthKey,
      submissions: []
    };
    mockStore.challenges.unshift(fallback);
    return fallback;
  }

  const db = await getDb();
  const monthKey = getMonthKey();
  const openChallenge = await db
    .collection<Challenge>("challenges")
    .findOne({ monthKey, status: "open" });

  if (openChallenge) {
    return openChallenge;
  }

  const fallback: Challenge = {
    title: "Most Active Week",
    description: "Complete at least 4 workouts this week and post your proof.",
    status: "open",
    monthKey,
    submissions: []
  };
  const insert = await db.collection<Challenge>("challenges").insertOne(fallback);
  return {
    ...fallback,
    _id: insert.insertedId.toString()
  };
}

export async function submitChallengeEntry(
  challengeId: string,
  userId: string,
  userName: string,
  proofText: string
) {
  if (useMockData) {
    const challenge = mockStore.challenges.find((item) => item._id === challengeId && item.status === "open");
    if (!challenge) {
      return;
    }
    challenge.submissions.push({
      userId,
      userName,
      proofText,
      submittedAt: new Date().toISOString()
    });
    return;
  }

  const db = await getDb();
  const submission = {
    userId,
    userName,
    proofText,
    submittedAt: new Date().toISOString()
  };
  await db.collection("challenges").updateOne(
    { _id: new ObjectId(challengeId), status: "open" },
    {
      $push: {
        submissions: submission
      }
    } as any
  );
}

export async function listFeedPosts() {
  if (useMockData) {
    return [...mockStore.feedPosts].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  }

  const db = await getDb();
  const posts = await db.collection<FeedPost>("feed_posts").find({}).sort({ postedAt: -1 }).toArray();
  if (posts.length > 0) {
    return posts;
  }

  const seeded: FeedPost[] = [
    {
      title: "Coach Ana: Mobility Monday",
      body: "8-minute hip mobility sequence before squats.",
      source: "Instagram",
      author: "Coach Ana",
      postedAt: new Date().toISOString()
    }
  ];
  await db.collection<FeedPost>("feed_posts").insertMany(seeded);
  return seeded;
}

export async function createChallenge(title: string, description: string) {
  if (useMockData) {
    const challenge: Challenge = {
      _id: `mock-challenge-${Date.now()}`,
      title,
      description,
      status: "open",
      monthKey: getMonthKey(),
      submissions: []
    };
    mockStore.challenges.unshift(challenge);
    return challenge;
  }

  const db = await getDb();
  const challenge: Challenge = {
    title,
    description,
    status: "open",
    monthKey: getMonthKey(),
    submissions: []
  };
  const result = await db.collection<Challenge>("challenges").insertOne(challenge);
  return { ...challenge, _id: result.insertedId.toString() };
}

export async function closeChallenge(challengeId: string) {
  if (useMockData) {
    const challenge = mockStore.challenges.find((item) => item._id === challengeId);
    if (challenge) {
      challenge.status = "closed";
    }
    return;
  }

  const db = await getDb();
  await db
    .collection("challenges")
    .updateOne({ _id: new ObjectId(challengeId) }, { $set: { status: "closed" } });
}

export async function setChallengeWinner(challengeId: string, winnerUserId: string) {
  if (useMockData) {
    const challenge = mockStore.challenges.find((item) => item._id === challengeId);
    if (challenge) {
      challenge.winnerUserId = winnerUserId;
    }
    return;
  }

  const db = await getDb();
  await db.collection("challenges").updateOne(
    { _id: new ObjectId(challengeId) },
    {
      $set: {
        winnerUserId
      }
    }
  );
}

export async function createFeedPost(title: string, body: string, source: string, author: string) {
  if (useMockData) {
    const post: FeedPost = {
      _id: `mock-post-${Date.now()}`,
      title,
      body,
      source,
      author,
      postedAt: new Date().toISOString()
    };
    mockStore.feedPosts.unshift(post);
    return post;
  }

  const db = await getDb();
  const post: FeedPost = {
    title,
    body,
    source,
    author,
    postedAt: new Date().toISOString()
  };
  const result = await db.collection<FeedPost>("feed_posts").insertOne(post);
  return { ...post, _id: result.insertedId.toString() };
}

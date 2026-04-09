import { ObjectId } from "mongodb";

import { getDb } from "@/lib/mongodb";
import type { AttendanceRecord, Challenge, FeedPost } from "@/lib/types";

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

function makeDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildAttendance(userId: string, days: number): AttendanceRecord[] {
  const today = new Date();
  const records: AttendanceRecord[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayOfWeek = d.getDay();
    const attended = dayOfWeek !== 0 && Math.random() > 0.3;
    records.push({
      userId,
      date: makeDateKey(d),
      attended
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
      ["u-100", buildAttendance("u-100", 90)],
      ["a-001", buildAttendance("a-001", 90)]
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

export async function listAttendance(userId: string) {
  if (useMockData) {
    const existing = mockStore.attendanceByUser.get(userId);
    if (existing) {
      return existing;
    }
    const seeded = buildAttendance(userId, 90);
    mockStore.attendanceByUser.set(userId, seeded);
    return seeded;
  }

  const db = await getDb();
  const rows = await db
    .collection<AttendanceRecord>("attendance")
    .find({ userId })
    .sort({ date: 1 })
    .toArray();

  if (rows.length > 0) {
    return rows;
  }

  const today = new Date();
  const seeded: AttendanceRecord[] = [];
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    seeded.push({
      userId,
      date: d.toISOString().slice(0, 10),
      attended: Math.random() > 0.45
    });
  }
  await db.collection<AttendanceRecord>("attendance").insertMany(seeded);
  return seeded.reverse();
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

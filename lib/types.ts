export type Role = "member" | "admin";

export type SessionUser = {
  userId: string;
  name: string;
  email: string;
  role: Role;
};

export type AttendanceRecord = {
  userId: string;
  date: string;
  attended: boolean;
};

export type ChallengeSubmission = {
  userId: string;
  userName: string;
  proofText: string;
  submittedAt: string;
};

export type Challenge = {
  _id?: string;
  title: string;
  description: string;
  status: "open" | "closed";
  monthKey: string;
  winnerUserId?: string;
  submissions: ChallengeSubmission[];
};

export type FeedPost = {
  _id?: string;
  title: string;
  body: string;
  source: string;
  postedAt: string;
  author: string;
};

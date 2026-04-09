import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/session";
import { getCurrentChallenge, listAttendance, listFeedPosts } from "@/lib/repositories";

export default async function DashboardPage() {
  const session = getServerSession();
  if (!session) {
    redirect("/login");
  }

  const [attendance, challenge, feedPosts] = await Promise.all([
    listAttendance(session.userId),
    getCurrentChallenge(),
    listFeedPosts()
  ]);

  const points = attendance.filter((a) => a.attended).length * 10;

  return (
    <section className="grid" style={{ gap: 12 }}>
      <div className="card">
        <h2>Welcome, {session.name}</h2>
        <p>Loyalty points: {points}</p>
      </div>

      <div className="card">
        <h3>Attendance Heatmap (last 90 days)</h3>
        <div className="heatmap">
          {attendance.map((item) => (
            <div
              key={item.date}
              className={`heat ${item.attended ? "active" : ""}`}
              title={`${item.date} - ${item.attended ? "Attended" : "Missed"}`}
            />
          ))}
        </div>
      </div>

      <div className="card grid">
        <h3>Competition of the Month</h3>
        <p>
          <strong>{challenge.title}</strong>
        </p>
        <p>{challenge.description}</p>
        <p>Status: {challenge.status}</p>
        <p>Submissions: {challenge.submissions.length}</p>
        <form action="/api/challenges/submit" method="post" className="grid">
          <input type="hidden" name="challengeId" value={String(challenge._id ?? "")} />
          <textarea name="proofText" placeholder="Describe your submission proof" required />
          <button type="submit">Submit to leaderboard</button>
        </form>
      </div>

      <div className="card grid">
        <h3>Trainer Feed</h3>
        {feedPosts.map((post) => (
          <article key={String(post._id ?? post.postedAt)} className="card">
            <h4 style={{ marginTop: 0 }}>{post.title}</h4>
            <p>{post.body}</p>
            <small>
              {post.author} via {post.source} at {new Date(post.postedAt).toLocaleString()}
            </small>
          </article>
        ))}
      </div>

      {session.role === "admin" ? (
        <p>
          You are an admin. <Link href="/admin">Open admin panel</Link>.
        </p>
      ) : null}
    </section>
  );
}

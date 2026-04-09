import { redirect } from "next/navigation";

import { getCurrentChallenge, listFeedPosts } from "@/lib/repositories";
import { getServerSession } from "@/lib/session";

export default async function AdminPage() {
  const session = getServerSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "admin") {
    redirect("/dashboard");
  }

  const [challenge, posts] = await Promise.all([getCurrentChallenge(), listFeedPosts()]);

  return (
    <section className="grid" style={{ gap: 12 }}>
      <div className="card">
        <h2>Admin Panel</h2>
        <p>Manage monthly competitions and trainer feed content.</p>
      </div>

      <div className="card grid">
        <h3>Create competition</h3>
        <form action="/api/admin/challenges" method="post" className="grid">
          <input name="title" placeholder="Challenge title" required />
          <textarea name="description" placeholder="Challenge description" required />
          <button type="submit">Create</button>
        </form>
      </div>

      <div className="card grid">
        <h3>Current competition</h3>
        <p>
          <strong>{challenge.title}</strong> ({challenge.status})
        </p>
        <form action="/api/admin/challenges" method="post" className="row">
          <input type="hidden" name="challengeId" value={String(challenge._id ?? "")} />
          <input type="hidden" name="_action" value="close" />
          <button type="submit">Close challenge</button>
        </form>
        <form action={`/api/admin/challenges/${String(challenge._id ?? "")}/winner`} method="post" className="grid">
          <input name="winnerUserId" placeholder="Winner user ID (example: u-100)" required />
          <button type="submit">Assign winner</button>
        </form>
      </div>

      <div className="card grid">
        <h3>Post trainer feed update</h3>
        <form action="/api/admin/feed" method="post" className="grid">
          <input name="title" placeholder="Post title" required />
          <input name="source" placeholder="Source (Instagram, YouTube...)" required />
          <textarea name="body" placeholder="Post body" required />
          <button type="submit">Publish</button>
        </form>
      </div>

      <div className="card grid">
        <h3>Recent feed posts</h3>
        {posts.map((post) => (
          <article key={String(post._id ?? post.postedAt)} className="card">
            <h4 style={{ marginTop: 0 }}>{post.title}</h4>
            <p>{post.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

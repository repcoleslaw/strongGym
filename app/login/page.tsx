"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("member@stronggym.local");
  const [password, setPassword] = useState("member123");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      setError("Invalid login.");
      return;
    }
    const data = (await res.json()) as { role: "member" | "admin" };
    router.push(data.role === "admin" ? "/admin" : "/dashboard");
    router.refresh();
  }

  return (
    <section className="card" style={{ maxWidth: 480 }}>
      <h2>Sign in</h2>
      <p>Member: member@stronggym.local / member123</p>
      <p>Admin: admin@stronggym.local / admin123</p>
      <form className="grid" onSubmit={onSubmit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
        />
        <button type="submit">Login</button>
      </form>
      {error ? <p style={{ color: "#ff8f8f" }}>{error}</p> : null}
    </section>
  );
}

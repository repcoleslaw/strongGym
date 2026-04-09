import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Strong Gym",
  description: "Gym portal for attendance, challenges, and trainer feed"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="grid" style={{ gap: 16 }}>
          <header className="row" style={{ justifyContent: "space-between" }}>
            <h1 style={{ margin: 0 }}>Strong Gym</h1>
            <nav className="row">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/admin">Admin</Link>
              <Link href="/login">Login</Link>
            </nav>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}

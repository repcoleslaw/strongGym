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
        <footer>
          <p>Copyright 2026 Strong Gym</p>
          <p>All rights reserved</p>
          <p>Contact us at <a href="mailto:info@stronggym.com">info@stronggym.com</a></p>
          <p>Follow us on <a href="https://www.instagram.com/stronggym">Instagram</a></p>
          <p>Follow us on <a href="https://www.facebook.com/stronggym">Facebook</a></p>
          <p>Follow us on <a href="https://www.twitter.com/stronggym">Twitter</a></p>
          <p>Follow us on <a href="https://www.linkedin.com/company/stronggym">LinkedIn</a></p>
          <p>Follow us on <a href="https://www.youtube.com/channel/UC_x5XG1OV2P6BVIhjj9pi-g">YouTube</a></p>
        </footer>
      </body>
    </html>
  );
}

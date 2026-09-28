import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "./nav";
import { env } from "@/lib/env";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "LinkedIn Content Intelligence Agent",
  description:
    "A research-grounded content intelligence pipeline: pattern extraction, voice modeling, generation, critique, and performance feedback."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Nav />
        {env.demoMode && (
          <div className="border-b border-ink-800 bg-accent-500/10 px-6 py-1.5 text-center text-xs text-accent-400">
            DEMO_MODE is on - all research, patterns, voice examples, posts and metrics shown are
            fictional seed data. No paid API calls are made.
          </div>
        )}
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}

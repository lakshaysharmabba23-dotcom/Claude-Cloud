import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "./nav";
import { env } from "@/lib/env";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", axes: ["opsz"] });

export const metadata: Metadata = {
  title: "Content Intelligence Agent",
  description:
    "A research-grounded content intelligence pipeline: pattern extraction, voice modeling, generation, critique, and performance feedback."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>
        <Nav />
        {env.demoMode && (
          <div className="border-b border-ink-700 bg-ink-800 px-4 py-2 text-center text-xs text-ink-200">
            <span className="eyebrow mr-2">Demo mode</span>
            Everything shown is fictional seed data. No paid API calls are made.
          </div>
        )}
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
          <div className="rule pt-4 text-xs text-ink-400">
            Drafts are never published automatically. Every post is reviewed and approved by a person.
          </div>
        </footer>
      </body>
    </html>
  );
}

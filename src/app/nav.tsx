"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/research", label: "Research" },
  { href: "/patterns", label: "Patterns" },
  { href: "/voice", label: "Voice" },
  { href: "/studio", label: "Studio" },
  { href: "/analytics", label: "Analytics" }
] as const;

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn-secondary px-3 py-1.5"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={dark}
    >
      {dark ? "Light" : "Dark"}
    </button>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-ink-700 bg-ink-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="flex items-baseline gap-2">
          <span className="display text-xl">Content Intelligence</span>
          <span className="eyebrow hidden sm:inline">Agent</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`border-b-2 py-1 text-sm transition-colors ${
                  active
                    ? "border-accent-500 font-medium text-ink-50"
                    : "border-transparent text-ink-400 hover:text-ink-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t border-ink-700 bg-ink-950 md:hidden" aria-label="Primary">
          <ul className="mx-auto max-w-6xl divide-y divide-ink-700 px-4">
            {LINKS.map((link) => {
              const active = pathname?.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`display block py-3 text-2xl ${active ? "text-accent-500" : "text-ink-50"}`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}

"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: Route;
  label: string;
};

const links: NavLink[] = [
  { href: "/today", label: "Today" },
  { href: "/backlog", label: "Backlog" },
  { href: "/mcq", label: "MCQ" },
  { href: "/gt", label: "GT" },
  { href: "/schedule", label: "Schedule" },
  { href: "/weekly", label: "Weekly" },
  { href: "/settings", label: "Settings" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="sticky bottom-4 z-20">
      <div className="panel mx-auto max-w-5xl overflow-hidden px-3 py-3 backdrop-blur">
        <div className="mb-3 flex items-center justify-between px-2">
          <div className="eyebrow">Study Rooms</div>
          <div className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-[var(--text-dim)]">
            Tap to move
          </div>
        </div>
        <ul className="flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/today" && pathname.startsWith(`${link.href}/`));

            return (
              <li key={link.href} className="snap-start">
                <Link
                  href={link.href}
                  className="nav-pill"
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export default NavBar;

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Dashboard, Products, and Onboarding stay in the codebase but are off the rail for now.
const items = [{ href: "/time", label: "Time clock", icon: ClockIcon }] as const;

// Full-height rail in the same navy as the header. Icons stay centered.
export function SideNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-30 flex h-screen w-16 shrink-0 flex-col items-center justify-center bg-[#0f2c4c] py-4"
    >
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <div key={item.href} className="flex flex-col items-center">
            <Link
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`group relative flex h-11 w-11 items-center justify-center rounded-lg text-white ${
                active ? "bg-white/20" : ""
              }`}
            >
              <span className="transition-transform duration-150 ease-out group-hover:scale-110">
                <Icon />
              </span>
              <span className="pointer-events-none absolute left-full z-20 ml-2 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-md group-hover:block">
                {item.label}
              </span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

// Outline icons share one stroke so the rail stays even.
const iconStroke = 1.35;

function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth={iconStroke} />
      <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth={iconStroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

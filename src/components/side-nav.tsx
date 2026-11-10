"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HelpFaqDialog } from "@/components/help-faq-dialog";

// Dashboard, Products, and Onboarding stay in the codebase but are off the rail for now.
const items = [{ href: "/time", label: "Time clock", icon: ClockIcon }] as const;

// Full-height rail in the same navy as the header. Help sits directly under Time clock.
export function SideNav() {
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
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
        <span aria-hidden="true" className="my-1.5 h-px w-8 bg-white/40" />
        <button
          type="button"
          aria-label="Help and FAQs"
          onClick={() => setHelpOpen(true)}
          className="group relative flex h-11 w-11 items-center justify-center rounded-lg text-white hover:bg-white/10"
        >
          <span className="transition-transform duration-150 ease-out group-hover:scale-110">
            <HelpIcon />
          </span>
          <span className="pointer-events-none absolute left-full z-20 ml-2 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-md group-hover:block">
            Help & FAQs
          </span>
        </button>
      </nav>
      {helpOpen ? <HelpFaqDialog onClose={() => setHelpOpen(false)} /> : null}
    </>
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

function HelpIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth={iconStroke} />
      <path
        d="M9.8 9.6a2.4 2.4 0 0 1 4.5.8c0 1.4-1.3 2-2.1 2.5-.6.4-.8.7-.8 1.3"
        stroke="currentColor"
        strokeWidth={iconStroke}
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" />
    </svg>
  );
}

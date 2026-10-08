"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { getOnboardingSnapshot, subscribeOnboarding } from "@/lib/onboarding";

const items = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/prices", label: "Products", icon: ProductsIcon },
  { href: "/onboarding", label: "Onboarding", icon: OnboardingIcon },
  { href: "/time", label: "Time clock", icon: ClockIcon },
] as const;

// Full-height rail in the same navy as the header. Icons stay centered, with a divider between each one.
export function SideNav() {
  const pathname = usePathname();
  // Open queue rows only. The count sits on the top-right corner of the Onboarding icon.
  const queueCount = useSyncExternalStore(subscribeOnboarding, openQueueCount, () => 0);

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-30 flex h-screen w-16 shrink-0 flex-col items-center justify-center bg-[#0f2c4c] py-4"
    >
      {items.map((item, index) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <div key={item.href} className="flex flex-col items-center">
            {index > 0 ? <span aria-hidden="true" className="my-1.5 h-px w-8 bg-white/40" /> : null}
            <Link
              href={item.href}
              aria-label={item.href === "/onboarding" && queueCount > 0 ? `Onboarding, ${queueCount} in queue` : item.label}
              aria-current={active ? "page" : undefined}
              className={`group relative flex h-11 w-11 items-center justify-center rounded-lg text-white ${
                active ? "bg-white/20" : ""
              }`}
            >
              <span className="transition-transform duration-150 ease-out group-hover:scale-110">
                <Icon />
              </span>
              {item.href === "/onboarding" && queueCount > 0 ? (
                <span className="absolute top-1 right-1 z-10 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold leading-none text-white">
                  {queueCount}
                </span>
              ) : null}
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

function openQueueCount(): number {
  return getOnboardingSnapshot().filter((item) => item.status === "open").length;
}

// Outline icons share one stroke so the rail stays even. A bit lighter than 1.8, still easy to see at this size.
const iconStroke = 1.35;

function DashboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.2" y="3.2" width="7.4" height="7.4" rx="1.4" stroke="currentColor" strokeWidth={iconStroke} />
      <rect x="13.4" y="3.2" width="7.4" height="4.6" rx="1.4" stroke="currentColor" strokeWidth={iconStroke} />
      <rect x="13.4" y="10.6" width="7.4" height="10.2" rx="1.4" stroke="currentColor" strokeWidth={iconStroke} />
      <rect x="3.2" y="13.4" width="7.4" height="7.4" rx="1.4" stroke="currentColor" strokeWidth={iconStroke} />
    </svg>
  );
}

// Stacked flyers — taller sheets so it reads as print products, not square cards.
function ProductsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5.5" y="3.2" width="10" height="14.5" rx="1.2" stroke="currentColor" strokeWidth={iconStroke} />
      <path
        d="M8 19.2h9a1.3 1.3 0 0 0 1.3-1.3V5.5"
        stroke="currentColor"
        strokeWidth={iconStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 7.4h5M8 10.2h4M8 13h3.5" stroke="currentColor" strokeWidth={iconStroke} strokeLinecap="round" />
    </svg>
  );
}

function OnboardingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="3.2" width="12" height="17.6" rx="1.6" stroke="currentColor" strokeWidth={iconStroke} />
      <path d="M9 3.2h6v2.4H9V3.2Z" stroke="currentColor" strokeWidth={iconStroke} strokeLinejoin="round" />
      <path d="M8.8 12.2 10.6 14l4.6-4.4" stroke="currentColor" strokeWidth={iconStroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth={iconStroke} />
      <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth={iconStroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

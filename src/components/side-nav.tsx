"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/inventory", label: "Inventory", icon: InventoryIcon },
  { href: "/prices", label: "Price tables", icon: PriceTagIcon },
  { href: "/time", label: "Time clock", icon: ClockIcon },
] as const;

// Icon rail. The logo file is public/logo.svg. Hover shows the page name.
export function SideNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-30 flex h-screen w-16 shrink-0 flex-col items-center bg-[#0f2c4c] py-4"
    >
      <Image src="/logo.svg" alt="Logo" width={40} height={40} className="h-10 w-10 rounded-xl" />
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`hover-lift group relative flex h-11 w-11 items-center justify-center rounded-lg text-white ${
                active ? "bg-white/20" : "hover:bg-white/10"
              }`}
            >
              <Icon />
              <span className="pointer-events-none absolute left-full z-20 ml-2 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-md group-hover:block">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
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

function InventoryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.2 12 4.4l8.5 3.8L12 12 3.5 8.2Z"
        stroke="currentColor"
        strokeWidth={iconStroke}
        strokeLinejoin="round"
      />
      <path
        d="M3.5 8.2V15.8L12 19.6l8.5-3.8V8.2"
        stroke="currentColor"
        strokeWidth={iconStroke}
        strokeLinejoin="round"
      />
      <path d="M12 12v7.6" stroke="currentColor" strokeWidth={iconStroke} />
    </svg>
  );
}

function PriceTagIcon() {
  // A touch lighter than the other icons. The dollar packs more line into the same box, so the same stroke looks heavier.
  const stroke = 1.15;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v18" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <path
        d="M17 6.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

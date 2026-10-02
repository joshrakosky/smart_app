"use client";

import { useRouter } from "next/navigation";
import { dashboardHref } from "@/lib/dashboard-query";

const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 shadow-sm";

// From and To are inclusive. Changing either one drops back to page 1.
export function DateRangeFilter({
  stakeholderId,
  brand,
  query,
  from,
  to,
}: {
  stakeholderId: number | null;
  brand: string;
  query: string;
  from: string;
  to: string;
}) {
  const router = useRouter();

  function apply(nextFrom: string, nextTo: string) {
    let start = nextFrom;
    let end = nextTo;
    if (start && end && start > end) {
      [start, end] = [end, start];
    }
    router.push(dashboardHref({ stakeholderId, brand, query, from: start, to: end }));
  }

  // Two grid cells, so From and To each match one KPI card.
  return (
    <>
      <label className="flex min-w-0 flex-col gap-1 text-sm" htmlFor="from-date">
        <span className="font-medium text-slate-700">From</span>
        <input
          id="from-date"
          type="date"
          value={from}
          onChange={(event) => apply(event.target.value, to)}
          className={fieldClass}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-sm" htmlFor="to-date">
        <span className="font-medium text-slate-700">To</span>
        <input
          id="to-date"
          type="date"
          value={to}
          onChange={(event) => apply(from, event.target.value)}
          className={fieldClass}
        />
      </label>
    </>
  );
}

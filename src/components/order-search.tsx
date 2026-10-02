"use client";

import { useRouter } from "next/navigation";
import { dashboardHref } from "@/lib/dashboard-query";

// Matches order number, product name, and SKU. Other filters stay on the URL.
export function OrderSearch({
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

  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm" htmlFor="order-search">
      <span className="font-medium text-slate-700">Search</span>
      <input
        id="order-search"
        type="search"
        value={query}
        placeholder="Order # or product"
        onChange={(event) =>
          router.push(
            dashboardHref({
              stakeholderId,
              brand,
              query: event.target.value,
              from,
              to,
            }),
          )
        }
        className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 shadow-sm"
      />
    </label>
  );
}

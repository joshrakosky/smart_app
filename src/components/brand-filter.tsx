"use client";

import { useRouter } from "next/navigation";
import { BRANDS, type Brand } from "@/lib/brands";
import { dashboardHref } from "@/lib/dashboard-query";

// Sits with the other dashboard filters. Changing brand returns to page 1.
export function BrandFilter({
  brand,
  stakeholderId,
  query,
  from,
  to,
}: {
  brand: Brand | "";
  stakeholderId: number | null;
  query: string;
  from: string;
  to: string;
}) {
  const router = useRouter();

  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm" htmlFor="brand">
      <span className="font-medium text-slate-700">Brand</span>
      <select
        id="brand"
        name="brand"
        className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 shadow-sm"
        value={brand}
        onChange={(event) => {
          router.push(
            dashboardHref({
              stakeholderId,
              brand: event.target.value,
              query,
              from,
              to,
            }),
          );
        }}
      >
        <option value="">All</option>
        {BRANDS.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

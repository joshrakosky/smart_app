"use client";

import { useRouter } from "next/navigation";
import { dashboardHref } from "@/lib/dashboard-query";
import type { StakeholderBudget } from "@/lib/types";

// Updates the page query so the server re-reads KPIs and the table together.
// The current date range stays on the URL.
export function StakeholderFilter({
  selectedId,
  stakeholders,
  brand,
  query,
  from,
  to,
}: {
  selectedId: number | null;
  stakeholders: StakeholderBudget[];
  brand: string;
  query: string;
  from: string;
  to: string;
}) {
  const router = useRouter();

  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm" htmlFor="stakeholder">
      <span className="font-medium text-slate-700">Stakeholder</span>
      <select
        id="stakeholder"
        name="stakeholder"
        className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 shadow-sm"
        value={selectedId ?? ""}
        onChange={(event) => {
          const next = event.target.value;
          router.push(
            dashboardHref({
              stakeholderId: next ? Number(next) : null,
              brand,
              query,
              from,
              to,
            }),
          );
        }}
      >
        <option value="">All</option>
        {stakeholders.map((stakeholder) => (
          <option key={stakeholder.stakeholder_id} value={stakeholder.stakeholder_id}>
            {stakeholder.stakeholder_name}
          </option>
        ))}
      </select>
    </label>
  );
}

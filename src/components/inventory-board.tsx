"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PageHeader } from "@/components/page-header";
import { BRANDS, type Brand } from "@/lib/brands";
import {
  INVENTORY_STATUSES,
  averageMonthly,
  coverageMonths,
  getInventoryServerSnapshot,
  getInventorySnapshot,
  inventoryStatus,
  setInventoryReorder,
  subscribeInventory,
  type InventoryItem,
  type InventoryStatus,
} from "@/lib/inventory";
import { inventoryHref } from "@/lib/inventory-query";
import { formatSlashDate } from "@/lib/money";
import { STAKEHOLDERS } from "@/lib/stakeholders";

const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 shadow-sm";
const headerCell =
  "sticky top-0 z-10 whitespace-nowrap border-r border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-medium last:border-r-0";
const bodyCell = "border-r border-b border-slate-200 px-4 py-2.5 last:border-r-0";

// Ten rows matches the dashboard page size.
const PAGE_SIZE = 10;

// Status counts ignore the status dropdown so the four cards stay a summary
// while that dropdown narrows the table.
export function InventoryBoard({
  query,
  stakeholderId,
  brand,
  status,
  page,
}: {
  query: string;
  stakeholderId: number | null;
  brand: Brand | "";
  status: InventoryStatus | "";
  page: number;
}) {
  const router = useRouter();
  const items = useSyncExternalStore(subscribeInventory, getInventorySnapshot, getInventoryServerSnapshot);
  const today = new Date();
  const matched = items.filter((item) => matchesFilters(item, query, stakeholderId, brand));
  const counts = countStatuses(matched);
  const visible = status ? matched.filter((item) => inventoryStatus(item) === status) : matched;
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = visible.slice(startIndex, startIndex + PAGE_SIZE);
  const rangeStart = visible.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = startIndex + pageItems.length;

  function href(next: Partial<{ query: string; stakeholderId: number | null; brand: string; status: InventoryStatus | ""; page: number }>) {
    return inventoryHref({
      query,
      stakeholderId,
      brand,
      status,
      page: 1,
      ...next,
    });
  }

  return (
    <div className="min-h-full bg-slate-100 text-slate-900">
      <PageHeader
        title="Inventory"
        eyebrow="Trane Technologies"
        subtitle="On-hand balance, usage since the live date, and how many months the current stock should last."
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-1 text-sm" htmlFor="inventory-search">
            <span className="font-medium text-slate-700">Search</span>
            <input
              id="inventory-search"
              type="search"
              value={query}
              placeholder="Product or SKU"
              onChange={(event) => router.push(href({ query: event.target.value }))}
              className={fieldClass}
            />
          </label>
          <FilterSelect
            id="inventory-stakeholder"
            label="Stakeholder"
            value={stakeholderId == null ? "" : String(stakeholderId)}
            onChange={(value) => router.push(href({ stakeholderId: value ? Number(value) : null }))}
            options={[
              { value: "", label: "All" },
              ...STAKEHOLDERS.map((stakeholder) => ({ value: String(stakeholder.id), label: stakeholder.name })),
            ]}
          />
          <FilterSelect
            id="inventory-brand"
            label="Brand"
            value={brand}
            onChange={(value) => router.push(href({ brand: value }))}
            options={[{ value: "", label: "All" }, ...BRANDS.map((item) => ({ value: item, label: item }))]}
          />
          <FilterSelect
            id="inventory-status"
            label="Status"
            value={status}
            onChange={(value) => router.push(href({ status: value as InventoryStatus | "" }))}
            options={[
              { value: "", label: "All" },
              ...INVENTORY_STATUSES.map((item) => ({ value: item.id, label: item.label })),
            ]}
          />
        </div>

        <section aria-label="Status counts" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {INVENTORY_STATUSES.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <h2 className="text-sm font-medium text-slate-600">{item.label}</h2>
              <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{counts[item.id]}</p>
              <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
            </article>
          ))}
        </section>

        <section aria-label="Inventory" className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold">Inventory</h2>
          </div>
          <div className="h-[416px] overflow-auto">
            <table className="w-full border-separate border-spacing-0 text-center text-sm">
              <thead className="text-slate-600">
                <tr>
                  <th className={headerCell}>Product</th>
                  <th className={headerCell}>Live Date</th>
                  <th className={headerCell}>SKU</th>
                  <th className={headerCell}>Balance</th>
                  <th className={headerCell}>Reorder</th>
                  <th className={headerCell}>Total</th>
                  <th className={headerCell}>Proj/M</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={7}>
                      No products match these filters.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item) => <InventoryRow key={item.id} item={item} today={today} />)
                )}
              </tbody>
            </table>
          </div>
          {visible.length > 0 ? (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Showing {rangeStart}–{rangeEnd} of {visible.length}
              </p>
              <div className="flex items-center gap-2">
                <PageLink href={href({ page: currentPage - 1 })} disabled={currentPage <= 1}>
                  Previous
                </PageLink>
                <p className="min-w-24 text-center text-sm text-slate-600">
                  Page {currentPage} of {pageCount}
                </p>
                <PageLink href={href({ page: currentPage + 1 })} disabled={currentPage >= pageCount}>
                  Next
                </PageLink>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function matchesFilters(item: InventoryItem, query: string, stakeholderId: number | null, brand: Brand | ""): boolean {
  if (stakeholderId != null && item.stakeholderId !== stakeholderId) return false;
  if (brand && item.brand !== brand) return false;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${item.product} ${item.sku}`.toLowerCase().includes(needle);
}

function countStatuses(items: InventoryItem[]): Record<InventoryStatus, number> {
  const counts: Record<InventoryStatus, number> = { in: 0, backorder: 0, low: 0, out: 0 };
  for (const item of items) counts[inventoryStatus(item)] += 1;
  return counts;
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm" htmlFor={id}>
      <span className="font-medium text-slate-700">{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InventoryRow({ item, today }: { item: InventoryItem; today: Date }) {
  const [draft, setDraft] = useState(String(item.reorder));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setDraft(String(item.reorder));
  }, [item.reorder]);

  const average = averageMonthly(item, today);
  const typed = Number(draft);
  // While the field is focused, Proj/M is the typed reorder point, not the balance.
  const previewing = editing && Number.isInteger(typed) && typed >= 0;
  const projected = coverageMonths(previewing ? typed : item.balance, average);

  function commit() {
    setEditing(false);
    const next = Number(draft);
    if (!Number.isInteger(next) || next < 0) {
      setDraft(String(item.reorder));
      return;
    }
    if (next !== item.reorder) setInventoryReorder(item.id, next);
  }

  return (
    <tr className="even:bg-slate-100">
      <td className={bodyCell}>{item.product}</td>
      <td className={`${bodyCell} whitespace-nowrap tabular-nums`}>{formatSlashDate(item.liveOn)}</td>
      <td className={`${bodyCell} whitespace-nowrap`}>{item.sku}</td>
      <td className={`${bodyCell} tabular-nums`}>{formatCount(item.balance)}</td>
      <td className={bodyCell}>
        <input
          inputMode="numeric"
          aria-label={`Reorder point for ${item.product}`}
          value={draft}
          onFocus={() => setEditing(true)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="mx-auto h-8 w-20 rounded-md border border-slate-300 bg-white px-2 text-center text-sm tabular-nums text-slate-900"
        />
      </td>
      <td className={bodyCell}>
        <UsageTip item={item} average={average} />
      </td>
      <td className={`${bodyCell} tabular-nums`}>
        <span className={previewing ? "font-medium text-[#0f2c4c]" : undefined}>
          {projected == null ? "—" : formatMonths(projected)}
        </span>
      </td>
    </tr>
  );
}

function UsageTip({ item, average }: { item: InventoryItem; average: number }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number; above: boolean } | null>(null);

  function show() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const above = rect.bottom + 90 > window.innerHeight && rect.top > 90;
    setPlace({
      top: above ? rect.top - 8 : rect.bottom + 8,
      left: rect.left + rect.width / 2,
      above,
    });
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="tabular-nums underline decoration-dotted decoration-slate-400 underline-offset-4"
        aria-label={`Usage details for ${item.product}`}
        onMouseEnter={show}
        onMouseLeave={() => setPlace(null)}
        onFocus={show}
        onBlur={() => setPlace(null)}
      >
        {formatCount(item.totalUsage)}
      </button>
      {place ? (
        <div
          role="tooltip"
          style={{
            top: place.top,
            left: place.left,
            transform: place.above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
          }}
          className="fixed z-50 w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 shadow-lg"
        >
          <p className="flex justify-between gap-4 whitespace-nowrap tabular-nums">
            <span>YTD</span>
            <span>{formatCount(item.ytdUsage)}</span>
          </p>
          <p className="mt-1 flex justify-between gap-4 whitespace-nowrap tabular-nums">
            <span>Avg/M</span>
            <span>{formatAverage(average)}</span>
          </p>
        </div>
      ) : null}
    </>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: string }) {
  if (disabled) {
    return (
      <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm text-slate-400">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="hover-raise inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

function formatAverage(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function formatMonths(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

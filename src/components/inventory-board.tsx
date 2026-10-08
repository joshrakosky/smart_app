"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PageHeader } from "@/components/page-header";
import { InventoryReorderDialog } from "@/components/inventory-reorder-dialog";
import { PriceFormDialog } from "@/components/price-form-dialog";
import { ProductNotes } from "@/components/product-notes";
import { ChargeButton, ChargeDialog } from "@/components/price-table";
import { BRANDS, type Brand } from "@/lib/brands";
import { formatMoney } from "@/lib/money";
import { enqueueOnboarding, enqueueOnboardingNote, queueKindForSave } from "@/lib/onboarding";
import {
  INVENTORY_STATUSES,
  averageMonthly,
  coverageMonths,
  getInventoryServerSnapshot,
  getInventorySnapshot,
  inventoryStatus,
  clearInventoryReorder,
  completeInventoryReorder,
  daysSinceCompleted,
  saveInventoryReorder,
  setInventoryNotes,
  setInventoryReorder,
  subscribeInventory,
  type InventoryItem,
  type InventoryStatus,
} from "@/lib/inventory";
import { inventoryHref } from "@/lib/inventory-query";
import {
  applyBulkEdit,
  baseBreak,
  formatGpmPercent,
  gpmDollars,
  getPricesServerSnapshot,
  getPricesSnapshot,
  gpmPercent,
  replacePrices,
  subscribePrices,
  type BulkPriceEdit,
  type Price,
} from "@/lib/prices";
import { STAKEHOLDERS } from "@/lib/stakeholders";

type TableMode = "inventory" | "pricing";
type ChargeSide = "wholesale" | "retail";

// One row is an inventory item, a product, or both when the SKU matches.
type ProductRow = {
  key: string;
  name: string;
  sku: string;
  inventory: InventoryItem | null;
  price: Price | null;
};

const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 shadow-sm";
const iconButton =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-[#0f2c4c]";
const iconButtonOn =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-[#0f2c4c] bg-[#0f2c4c] text-white";
const navyButton =
  "h-10 rounded-lg bg-[#0f2c4c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1a4a73]";
const modeOn = "h-8 rounded-md bg-[#0f2c4c] px-3 text-sm font-medium text-white";
const modeOff = "h-8 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100";
const addButton =
  "flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f2c4c] text-lg leading-none text-white transition-colors hover:bg-[#1a4a73]";
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
  // Seed data until after mount. localStorage must not change the first client render.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const items = useSyncExternalStore(
    subscribeInventory,
    ready ? getInventorySnapshot : getInventoryServerSnapshot,
    getInventoryServerSnapshot,
  );
  const prices = useSyncExternalStore(
    subscribePrices,
    ready ? getPricesSnapshot : getPricesServerSnapshot,
    getPricesServerSnapshot,
  );
  const today = new Date();
  const [mode, setMode] = useState<TableMode>("inventory");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Price | null>(null);
  const [prefill, setPrefill] = useState<{ name: string; sku: string; stakeholderId: number } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formSession, setFormSession] = useState(0);
  const [charges, setCharges] = useState<{ price: Price; side: ChargeSide } | null>(null);
  const bulkRef = useRef<HTMLDialogElement>(null);
  const [bulkStep, setBulkStep] = useState<"edit" | "confirm">("edit");
  const [bulkActive, setBulkActive] = useState<"no-change" | "true" | "false">("no-change");
  const [bulkIncrease, setBulkIncrease] = useState("");
  const [bulkWholesale, setBulkWholesale] = useState("");
  const [bulkRetail, setBulkRetail] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const rows = productRows(items, prices);
  const matched = rows.filter((row) => matchesRow(row, query, stakeholderId, brand));
  const counts = countStatuses(matched);
  const visible = status
    ? matched.filter((row) => row.inventory && inventoryStatus(row.inventory) === status)
    : matched;
  // Every row can be checked. Bulk edit only changes rows that already have a price.
  const selectedPriceIds = rows.flatMap((row) =>
    selected.includes(row.key) && row.price ? [row.price.id] : [],
  );
  const selectedCount = new Set(selectedPriceIds).size;
  const bulkEnabled = selectedCount >= 2;
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = visible.slice(startIndex, startIndex + PAGE_SIZE);
  const rangeStart = visible.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = startIndex + pageItems.length;
  // Both views use eight columns so the widths stay put when the toggle switches.
  const columnCount = 8;

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

  function toggleSelected(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function openAdd() {
    setEditing(null);
    setPrefill(null);
    setFormSession((current) => current + 1);
    setFormOpen(true);
  }

  // A priced row opens its profile. A stock-only row starts a profile with the name and SKU filled in.
  function openProduct(row: ProductRow) {
    if (row.price) {
      setEditing(row.price);
      setPrefill(null);
    } else {
      setEditing(null);
      setPrefill({
        name: row.name,
        sku: row.sku,
        stakeholderId: row.inventory?.stakeholderId ?? 1,
      });
    }
    setFormSession((current) => current + 1);
    setFormOpen(true);
  }

  function savePrice(next: Price, queue: boolean) {
    const previous = prices.find((price) => price.id === next.id);
    replacePrices(previous ? prices.map((price) => (price.id === next.id ? next : price)) : [...prices, next]);
    if (queue) enqueueOnboarding(next, queueKindForSave(previous, next), previous);
    setFormOpen(false);
  }

  function importPrices(imported: Price[]) {
    if (imported.length === 0) return;
    replacePrices([...prices, ...imported]);
  }

  function openBulk() {
    if (!bulkEnabled) return;
    setBulkStep("edit");
    setBulkActive("no-change");
    setBulkIncrease("");
    setBulkWholesale("");
    setBulkRetail("");
    setBulkError(null);
    bulkRef.current?.showModal();
  }

  function readBulkEdit(): BulkPriceEdit | null {
    const increase = bulkIncrease.trim() ? Number(bulkIncrease) : null;
    const wholesale = bulkWholesale.trim() ? parseDraftMoney(bulkWholesale) : null;
    const retail = bulkRetail.trim() ? parseDraftMoney(bulkRetail) : null;
    const active = bulkActive === "no-change" ? null : bulkActive === "true";
    if (bulkIncrease.trim() && !Number.isFinite(increase)) {
      setBulkError("Increase GPM % must be a number.");
      return null;
    }
    if (bulkWholesale.trim() && wholesale == null) {
      setBulkError("Wholesale must be zero or greater.");
      return null;
    }
    if (bulkRetail.trim() && retail == null) {
      setBulkError("Retail must be zero or greater.");
      return null;
    }
    if (active == null && increase == null && wholesale == null && retail == null) {
      setBulkError("Choose at least one change.");
      return null;
    }
    setBulkError(null);
    return { active, increaseGpmPercent: increase, wholesale, retail };
  }

  function proceedBulk() {
    const edit = readBulkEdit();
    if (!edit) {
      setBulkStep("edit");
      return;
    }
    const ids = new Set(selectedPriceIds);
    const nextPrices = prices.map((price) => (ids.has(price.id) ? applyBulkEdit(price, edit) : price));
    replacePrices(nextPrices);
    // Same queue notes as a single product save, for each listing the bulk edit changed.
    for (const previous of prices) {
      if (!ids.has(previous.id)) continue;
      const next = nextPrices.find((price) => price.id === previous.id);
      if (!next || JSON.stringify(previous) === JSON.stringify(next)) continue;
      enqueueOnboarding(next, queueKindForSave(previous, next), previous);
    }
    setSelected([]);
    setBulkStep("edit");
    bulkRef.current?.close();
  }

  return (
    <div className="min-h-full bg-slate-100 text-slate-900">
      <PageHeader title="Products" />

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

        <section aria-label="Products" className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div className="flex rounded-lg border border-slate-300 bg-white p-0.5">
              <button
                type="button"
                aria-pressed={mode === "inventory"}
                onClick={() => setMode("inventory")}
                className={mode === "inventory" ? modeOn : modeOff}
              >
                Inventory
              </button>
              <button
                type="button"
                aria-pressed={mode === "pricing"}
                onClick={() => setMode("pricing")}
                className={mode === "pricing" ? modeOn : modeOff}
              >
                Pricing
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openBulk}
                disabled={!bulkEnabled}
                aria-label="Bulk edit"
                className={`${iconButton} disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:hover:border-slate-200 disabled:hover:bg-slate-100 disabled:hover:text-slate-300`}
              >
                <PencilIcon />
              </button>
              <button type="button" onClick={openAdd} aria-label="Add product" className={addButton}>
                +
              </button>
            </div>
          </div>
          <div className="h-[416px] overflow-auto">
            <table className="w-full min-w-[56rem] table-fixed border-separate border-spacing-0 text-center text-sm">
              <colgroup>
                <col className="w-12" />
                <col />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-32" />
              </colgroup>
              <thead className="text-slate-600">
                <tr>
                  <th className={headerCell}>
                    <span className="sr-only">Select</span>
                  </th>
                  <th className={headerCell}>Product</th>
                  <th className={headerCell}>SKU</th>
                  {mode === "inventory" ? (
                    <>
                      <th className={headerCell}>Balance</th>
                      <th className={headerCell}>Reorder</th>
                      <th className={headerCell}>Total</th>
                      <th className={headerCell}>Proj/M</th>
                    </>
                  ) : (
                    <>
                      <th className={headerCell}>Wholesale</th>
                      <th className={headerCell}>Margin</th>
                      <th className={headerCell}>Retail</th>
                      <th className={headerCell}>GPM</th>
                    </>
                  )}
                  <th className={headerCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={columnCount}>
                      No products match these filters.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((row) => (
                    <ProductTableRow
                      key={row.key}
                      row={row}
                      mode={mode}
                      today={today}
                      selected={selected.includes(row.key)}
                      onToggle={() => toggleSelected(row.key)}
                      onEdit={() => openProduct(row)}
                      onReorder={(before, after) => enqueueOnboardingNote(queuePrice(row), `Reorder point: ${before} → ${after}`)}
                      onCharge={(side) => row.price && setCharges({ price: row.price, side })}
                    />
                  ))
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

      {charges ? (
        <ChargeDialog
          price={prices.find((item) => item.id === charges.price.id) ?? charges.price}
          side={charges.side}
          onClose={() => setCharges(null)}
          onSizeUpcharges={(sizeUpcharges) => {
            replacePrices(
              prices.map((item) => (item.id === charges.price.id ? { ...item, sizeUpcharges } : item)),
            );
          }}
        />
      ) : null}

      {formOpen ? (
        <PriceFormDialog
          key={formSession}
          editing={editing}
          prefill={prefill}
          onClose={() => setFormOpen(false)}
          onSave={savePrice}
          onImport={importPrices}
        />
      ) : null}

      <dialog
        ref={bulkRef}
        className="m-auto h-fit max-h-[calc(100%-2rem)] w-[min(32rem,calc(100%-2rem))] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
      >
        {bulkStep === "edit" ? (
          <form
            className="flex flex-col gap-4 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!readBulkEdit()) return;
              setBulkStep("confirm");
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">Bulk edit</h2>
              <button type="button" onClick={() => bulkRef.current?.close()} aria-label="Close" className="text-xl leading-none text-slate-500">
                ×
              </button>
            </div>
            <label className="flex flex-col gap-1 text-sm" htmlFor="bulk-active">
              <span className="font-medium text-slate-700">Active</span>
              <select
                id="bulk-active"
                value={bulkActive}
                onChange={(event) => setBulkActive(event.target.value as "no-change" | "true" | "false")}
                className={fieldClass}
              >
                <option value="no-change">No change</option>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm" htmlFor="bulk-increase">
              <span className="font-medium text-slate-700">Increase GPM %</span>
              <input
                id="bulk-increase"
                value={bulkIncrease}
                inputMode="decimal"
                onChange={(event) => setBulkIncrease(event.target.value)}
                className={fieldClass}
              />
            </label>
            <p className="text-sm text-slate-500">
              Raises every quantity break and every extra charge by this percent. Wholesale and retail below replace the lowest quantity break only.
            </p>
            <label className="flex flex-col gap-1 text-sm" htmlFor="bulk-wholesale">
              <span className="font-medium text-slate-700">Update wholesale</span>
              <input
                id="bulk-wholesale"
                value={bulkWholesale}
                inputMode="decimal"
                onChange={(event) => setBulkWholesale(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm" htmlFor="bulk-retail">
              <span className="font-medium text-slate-700">Update retail</span>
              <input
                id="bulk-retail"
                value={bulkRetail}
                inputMode="decimal"
                onChange={(event) => setBulkRetail(event.target.value)}
                className={fieldClass}
              />
            </label>
            {bulkError ? <p className="text-sm text-red-700">{bulkError}</p> : null}
            <button type="submit" className={navyButton}>
              Continue
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4 p-5">
            <h2 className="text-lg font-semibold">Confirm update</h2>
            <p className="text-sm text-slate-700">You are going to update {selectedCount} products.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBulkStep("edit")}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={proceedBulk}
                className="h-10 rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition-colors hover:bg-green-500"
              >
                Proceed
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

// Queue rows need a product. Use the price when the SKU matches; otherwise a stock snapshot.
function queuePrice(row: ProductRow): Price {
  if (row.price) return row.price;
  const item = row.inventory;
  return {
    id: `stock:${item?.id ?? row.key}`,
    type: "print",
    name: row.name,
    sku: row.sku,
    stakeholderId: item?.stakeholderId ?? 1,
    category: "",
    accountUnitId: null,
    specs: [],
    vendor: "",
    breaks: [],
    extras: [],
    sizeUpcharges: [],
    active: true,
  };
}

function productRows(items: InventoryItem[], prices: Price[]): ProductRow[] {
  const priceBySku = new Map<string, Price>();
  for (const price of prices) {
    const sku = price.sku.trim().toLowerCase();
    if (sku && !priceBySku.has(sku)) priceBySku.set(sku, price);
  }
  const used = new Set<string>();
  const rows: ProductRow[] = items.map((item) => {
    const sku = item.sku.trim().toLowerCase();
    const price = sku ? priceBySku.get(sku) ?? null : null;
    if (price) used.add(price.id);
    return { key: item.id, name: item.product, sku: item.sku, inventory: item, price };
  });
  for (const price of prices) {
    if (used.has(price.id) || !price.active) continue;
    rows.push({ key: price.id, name: price.name, sku: price.sku, inventory: null, price });
  }
  return rows;
}

function matchesRow(row: ProductRow, query: string, stakeholderId: number | null, brand: Brand | ""): boolean {
  const owner = row.inventory?.stakeholderId ?? row.price?.stakeholderId ?? null;
  if (stakeholderId != null && owner !== stakeholderId) return false;
  if (brand && row.inventory?.brand !== brand) return false;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${row.name} ${row.sku}`.toLowerCase().includes(needle);
}

function countStatuses(rows: ProductRow[]): Record<InventoryStatus, number> {
  const counts: Record<InventoryStatus, number> = { in: 0, backorder: 0, low: 0, out: 0 };
  for (const row of rows) {
    if (row.inventory) counts[inventoryStatus(row.inventory)] += 1;
  }
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

function ProductTableRow({
  row,
  mode,
  today,
  selected,
  onToggle,
  onEdit,
  onReorder,
  onCharge,
}: {
  row: ProductRow;
  mode: TableMode;
  today: Date;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onReorder: (before: number, after: number) => void;
  onCharge: (side: ChargeSide) => void;
}) {
  const item = row.inventory;
  const [draft, setDraft] = useState(item ? String(item.reorder) : "");
  const [editingPoint, setEditingPoint] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [productionOpen, setProductionOpen] = useState(false);

  useEffect(() => {
    setDraft(item ? String(item.reorder) : "");
  }, [item?.id, item?.reorder]);

  const average = item ? averageMonthly(item, today) : 0;
  const typed = Number(draft);
  const previewing = Boolean(item) && editingPoint && Number.isInteger(typed) && typed >= 0;
  const projected = item ? coverageMonths(previewing ? typed : item.balance, average) : null;
  const base = row.price ? baseBreak(row.price) : null;
  const margin = base ? gpmPercent(base.wholesale, base.retail) : null;

  function commit() {
    setEditingPoint(false);
    if (!item) return;
    const next = Number(draft);
    if (!Number.isInteger(next) || next < 0) {
      setDraft(String(item.reorder));
      return;
    }
    if (next !== item.reorder) {
      setInventoryReorder(item.id, next);
      onReorder(item.reorder, next);
    }
  }

  return (
    <tr className={row.price && !row.price.active ? "bg-red-50" : "even:bg-slate-100"}>
      <td className={bodyCell}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${row.name}`}
          className="h-4 w-4"
        />
      </td>
      <td className={bodyCell}>
        <button
          type="button"
          onClick={onEdit}
          className="font-medium text-[#0f2c4c] underline-offset-2 hover:underline"
        >
          {row.name}
        </button>
      </td>
      <td className={`${bodyCell} whitespace-nowrap`}>{row.sku || "—"}</td>
      {mode === "inventory" ? (
        item ? (
          <>
            <td className={`${bodyCell} tabular-nums`}>{formatCount(item.balance)}</td>
            <td className={bodyCell}>
              <ReorderPoint
                product={item.product}
                draft={draft}
                editing={editingPoint}
                completed={item.lastCompleted}
                today={today}
                onDraft={setDraft}
                onFocus={() => setEditingPoint(true)}
                onCommit={commit}
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
          </>
        ) : (
          <>
            <td className={bodyCell}>—</td>
            <td className={bodyCell}>—</td>
            <td className={bodyCell}>—</td>
            <td className={bodyCell}>—</td>
          </>
        )
      ) : row.price && base ? (
        <>
          <td className={bodyCell}>
            <ChargeButton price={row.price} onOpen={() => onCharge("wholesale")} />
          </td>
          <td className={`${bodyCell} tabular-nums`}>{formatGpmPercent(margin)}</td>
          <td className={bodyCell}>
            <ChargeButton price={row.price} side="retail" onOpen={() => onCharge("retail")} />
          </td>
          <td className={`${bodyCell} tabular-nums`}>
            {formatMoney(gpmDollars(base.wholesale, base.retail))}
          </td>
        </>
      ) : (
        <>
          <td className={bodyCell}>—</td>
          <td className={bodyCell}>—</td>
          <td className={bodyCell}>—</td>
          <td className={bodyCell}>—</td>
        </>
      )}
      <td className={bodyCell}>
        {item ? (
        <>
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            aria-label={`Notes for ${item.product}`}
            onClick={() => setNotesOpen(true)}
            className={item.notes ? iconButtonOn : iconButton}
          >
            <NotesIcon />
          </button>
          {/* Opens the production-order form. Navy while that order is still open. */}
          <button
            type="button"
            aria-label={`Production order for ${item.product}`}
            aria-pressed={item.openReorder != null}
            onClick={() => setProductionOpen(true)}
            className={item.openReorder ? iconButtonOn : iconButton}
          >
            <ProductionOrderIcon />
          </button>
        </div>
        {notesOpen ? (
          <ProductNotes
            product={item.product}
            notes={item.notes}
            onClose={() => setNotesOpen(false)}
            onSave={(notes) => setInventoryNotes(item.id, notes)}
          />
        ) : null}
        {productionOpen ? (
          <InventoryReorderDialog
            product={item.product}
            order={item.openReorder}
            onClose={() => setProductionOpen(false)}
            onSave={(input) => saveInventoryReorder(item.id, input)}
            onComplete={() => {
              completeInventoryReorder(item.id);
              setProductionOpen(false);
            }}
            onCancelOrder={() => {
              clearInventoryReorder(item.id);
              setProductionOpen(false);
            }}
          />
        ) : null}
        </>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}

function parseDraftMoney(raw: string): number | null {
  const cleaned = raw.replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-.2-.2a2 2 0 0 0-2.8 0L5 17v3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13 6.5 17.5 11" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ReorderPoint({
  product,
  draft,
  editing,
  completed,
  today,
  onDraft,
  onFocus,
  onCommit,
}: {
  product: string;
  draft: string;
  editing: boolean;
  completed: InventoryItem["lastCompleted"];
  today: Date;
  onDraft: (value: string) => void;
  onFocus: () => void;
  onCommit: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number; above: boolean } | null>(null);

  function show() {
    if (editing) return;
    const rect = wrapRef.current?.getBoundingClientRect();
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
      <div
        ref={wrapRef}
        className="inline-block"
        onMouseEnter={show}
        onMouseLeave={() => setPlace(null)}
      >
        <input
          inputMode="numeric"
          aria-label={`Reorder point for ${product}`}
          value={draft}
          onFocus={() => {
            setPlace(null);
            onFocus();
          }}
          onChange={(event) => onDraft(event.target.value)}
          onBlur={onCommit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="mx-auto h-8 w-20 rounded-md border border-slate-300 bg-white px-2 text-center text-sm tabular-nums text-slate-900"
        />
      </div>
      {place && !editing ? (
        <div
          role="tooltip"
          style={{
            top: place.top,
            left: place.left,
            transform: place.above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
          }}
          className="fixed z-50 w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 shadow-lg"
        >
          <p className="flex justify-between gap-4 whitespace-nowrap">
            <span>Date</span>
            <span>{completed ? formatCompletedDate(completed.completedAt) : "—"}</span>
          </p>
          <p className="mt-1 flex justify-between gap-4 whitespace-nowrap tabular-nums">
            <span>Qty</span>
            <span>{completed?.quantity != null ? formatCount(completed.quantity) : "—"}</span>
          </p>
          <p className="mt-1 flex justify-between gap-4 whitespace-nowrap tabular-nums">
            <span>Days</span>
            <span>{completed ? daysSinceCompleted(completed.completedAt, today) : "—"}</span>
          </p>
        </div>
      ) : null}
    </>
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

function formatCompletedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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

function NotesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3.5h7.2L19 8.2V20.5H7V3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14.2 3.5V8.2H19" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 12.2h6M10 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ProductionOrderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20v-4h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 4v4h-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

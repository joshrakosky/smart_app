"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { PriceFormDialog } from "@/components/price-form-dialog";
import { enqueueOnboarding, queueKindForSave } from "@/lib/onboarding";
import {
  getAccountUnitsServerSnapshot,
  getAccountUnitsSnapshot,
  subscribeAccountUnits,
} from "@/lib/account-units";
import { formatMoney } from "@/lib/money";
import { STAKEHOLDERS } from "@/lib/stakeholders";
import {
  APPAREL_SIZES,
  apparelUpchargeRows,
  applyBulkEdit,
  baseBreak,
  formatGpmPercent,
  getPricesServerSnapshot,
  getPricesSnapshot,
  gpmDollars,
  gpmPercent,
  PRICE_TYPE_LABELS,
  PRICE_TYPES,
  PRODUCT_CATEGORIES,
  replacePrices,
  sortBreaks,
  subscribePrices,
  type ApparelSize,
  type BulkPriceEdit,
  type ExtraType,
  type Price,
  type PriceType,
  type ProductCategory,
  type SizeUpcharge,
} from "@/lib/prices";

type ChargeSide = "wholesale" | "retail";
type ChargeView = { price: Price; side: ChargeSide };

// Short names for the hover panel. The form dropdown keeps the longer billing hint.
const EXTRA_TIP_LABELS: Record<ExtraType, { name: string; hint: string }> = {
  setup: { name: "Setup", hint: "once per order" },
  run: { name: "Run", hint: "per qty" },
  shipping: { name: "Shipping", hint: "once" },
  kitting: { name: "Kitting", hint: "each" },
};

// Price-table buttons lighten on hover. No drop shadow.
const navyButton =
  "h-10 w-fit rounded-lg bg-[#0f2c4c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1a4a73]";
const toolButton =
  "flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-[#0f2c4c] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300 disabled:hover:border-slate-200 disabled:hover:bg-slate-100 disabled:hover:text-slate-300";
const addButton =
  "flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f2c4c] text-xl leading-none text-white transition-colors hover:bg-[#1a4a73]";
const inactiveToggleOn =
  "flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition-colors hover:bg-red-100";
const fieldClass = "h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900";
// Same cell borders as the orders table.
const priceHeaderCell =
  "sticky top-0 z-10 whitespace-nowrap border-r border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-semibold text-slate-800 last:border-r-0";
const priceCell = "border-r border-b border-slate-200 px-4 py-2.5 last:border-r-0";

type TypeFilter = "all" | PriceType;

// Prices live in this browser until the database table exists.
export function PriceTable() {
  const prices = useSyncExternalStore(subscribePrices, getPricesSnapshot, getPricesServerSnapshot);
  const bulkRef = useRef<HTMLDialogElement>(null);
  const accountUnits = useSyncExternalStore(
    subscribeAccountUnits,
    getAccountUnitsSnapshot,
    getAccountUnitsServerSnapshot,
  );
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  // Same idea as Type: narrows the list, and is not a table column.
  const [accountUnitFilter, setAccountUnitFilter] = useState("all");
  // Owner is a filter, same as Type and AU. It is not a column.
  const [stakeholderFilter, setStakeholderFilter] = useState("all");
  // Sits beside stakeholder. Narrows the list, and is not a table column.
  const [categoryFilter, setCategoryFilter] = useState<"all" | ProductCategory>("all");
  // Inactive rows stay hidden until this is on. It adds them to the list; it does not filter to only them.
  const [showInactive, setShowInactive] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStep, setBulkStep] = useState<"edit" | "confirm">("edit");
  const [bulkActive, setBulkActive] = useState<"no-change" | "true" | "false">("no-change");
  const [bulkIncrease, setBulkIncrease] = useState("");
  const [bulkWholesale, setBulkWholesale] = useState("");
  const [bulkRetail, setBulkRetail] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [formSession, setFormSession] = useState(0);
  const [editing, setEditing] = useState<Price | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  // Clicking wholesale or retail opens that side's charge breakdown.
  const [charges, setCharges] = useState<ChargeView | null>(null);

  const filtered = prices.filter((price) => {
    if (!showInactive && !price.active) return false;
    if (typeFilter !== "all" && price.type !== typeFilter) return false;
    if (accountUnitFilter !== "all" && price.accountUnitId !== accountUnitFilter) return false;
    if (stakeholderFilter !== "all" && String(price.stakeholderId) !== stakeholderFilter) return false;
    if (categoryFilter !== "all" && price.category !== categoryFilter) return false;
    const needle = query.trim().toLowerCase();
    return price.name.toLowerCase().includes(needle) || price.sku.toLowerCase().includes(needle);
  });
  const accountUnitName =
    accountUnitFilter === "all"
      ? ""
      : (accountUnits.find((unit) => unit.id === accountUnitFilter)?.name ?? "");
  const stakeholderName =
    stakeholderFilter === "all"
      ? ""
      : (STAKEHOLDERS.find((item) => String(item.id) === stakeholderFilter)?.name ?? "");
  const selectedCount = selected.filter((id) => prices.some((price) => price.id === id)).length;
  const bulkEnabled = selectedCount >= 2;

  function openAdd() {
    setEditing(null);
    setFormSession((current) => current + 1);
    setFormOpen(true);
  }

  function openEdit(price: Price) {
    setEditing(price);
    setFormSession((current) => current + 1);
    setFormOpen(true);
  }

  function savePrice(next: Price, queue: boolean) {
    const previous = prices.find((price) => price.id === next.id);
    replacePrices(previous ? prices.map((price) => (price.id === next.id ? next : price)) : [...prices, next]);
    // The prompt already decided. A second save of an open row updates that row.
    if (queue) enqueueOnboarding(next, queueKindForSave(previous, next));
    setFormOpen(false);
  }

  function importPrices(imported: Price[]) {
    if (imported.length === 0) return;
    replacePrices([...prices, ...imported]);
  }

  function toggleSelected(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
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

  function reviewBulk() {
    if (!readBulkEdit()) return;
    setBulkStep("confirm");
  }

  function proceedBulk() {
    const edit = readBulkEdit();
    if (!edit) {
      setBulkStep("edit");
      return;
    }
    const ids = new Set(selected);
    replacePrices(prices.map((price) => (ids.has(price.id) ? applyBulkEdit(price, edit) : price)));
    setSelected([]);
    setBulkStep("edit");
    bulkRef.current?.close();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="price-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
            aria-label="Search products"
            className={`${fieldClass} w-full sm:w-64`}
          />
          <select
            id="price-type-filter"
            aria-label="Type"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
            className={`${fieldClass} w-full text-sm sm:w-40`}
          >
            <option value="all">All Types</option>
            {PRICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {PRICE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <select
            id="price-au-filter"
            aria-label="AU"
            value={accountUnitFilter}
            onChange={(event) => setAccountUnitFilter(event.target.value)}
            className={`${fieldClass} w-full text-sm sm:w-40`}
          >
            <option value="all">All AU</option>
            {accountUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
            </select>
          <select
            id="price-stakeholder-filter"
            aria-label="Stakeholder"
            value={stakeholderFilter}
            onChange={(event) => setStakeholderFilter(event.target.value)}
            className={`${fieldClass} w-full text-sm sm:w-44`}
          >
            <option value="all">All Stakeholders</option>
            {STAKEHOLDERS.map((stakeholder) => (
              <option key={stakeholder.id} value={stakeholder.id}>
                {stakeholder.name}
              </option>
            ))}
          </select>
          <select
            id="price-category-filter"
            aria-label="Category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as "all" | ProductCategory)}
            className={`${fieldClass} w-full text-sm sm:w-40`}
          >
            <option value="all">All categories</option>
            {PRODUCT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 self-end">
          <button
            type="button"
            onClick={openBulk}
            disabled={!bulkEnabled}
            aria-label="Bulk edit"
            className={toolButton}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={() => setShowInactive((current) => !current)}
            aria-pressed={showInactive}
            aria-label="Show inactive products"
            className={showInactive ? inactiveToggleOn : toolButton}
          >
            <InactiveIcon />
          </button>
          <button type="button" onClick={openAdd} aria-label="Add product" className={addButton}>
            +
          </button>
        </div>
      </div>

      <section aria-label="Products" className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Own scroll box so the header can stick. Page title lives in the top nav. */}
        <div className="h-[416px] overflow-auto">
        <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-center text-sm">
          <thead>
            <tr>
              <th className={priceHeaderCell}>
                <span className="sr-only">Select</span>
              </th>
              <th className={priceHeaderCell}>Name</th>
              <th className={priceHeaderCell}>SKU</th>
              <th className={priceHeaderCell}>Wholesale</th>
              <th className={priceHeaderCell}>Retail</th>
              <th className={priceHeaderCell}>GPM</th>
              <th className={priceHeaderCell}>GPM %</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={7}>
                  {emptyLabel(query, typeFilter, accountUnitName, stakeholderName, categoryFilter === "all" ? "" : categoryFilter, showInactive)}
                </td>
              </tr>
            ) : (
              filtered.map((price) => {
                const base = baseBreak(price);
                return (
                  <tr key={price.id} className={price.active ? "even:bg-slate-100" : "bg-red-50"}>
                    <td className={priceCell}>
                      <input
                        type="checkbox"
                        checked={selected.includes(price.id)}
                        onChange={() => toggleSelected(price.id)}
                        aria-label={`Select ${price.name}`}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className={priceCell}>
                      {/* Name opens edit. A listing leaves the list by going inactive, not by delete. */}
                      <button
                        type="button"
                        onClick={() => openEdit(price)}
                        className="font-medium text-[#0f2c4c] underline-offset-2 hover:underline"
                      >
                        {price.name}
                      </button>
                    </td>
                    <td className={`${priceCell} whitespace-nowrap`}>{price.sku}</td>
                    <td className={priceCell}>
                      <ChargeButton price={price} onOpen={() => setCharges({ price, side: "wholesale" })} />
                    </td>
                    <td className={priceCell}>
                      <ChargeButton
                        price={price}
                        side="retail"
                        onOpen={() => setCharges({ price, side: "retail" })}
                      />
                    </td>
                    <td className={`${priceCell} tabular-nums`}>{formatMoney(gpmDollars(base.wholesale, base.retail))}</td>
                    <td className={`${priceCell} tabular-nums`}>
                      {formatGpmPercent(gpmPercent(base.wholesale, base.retail))}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </section>

      {charges ? (
        <ChargeDialog
          price={prices.find((item) => item.id === charges.price.id) ?? charges.price}
          side={charges.side}
          onClose={() => setCharges(null)}
          onSizeUpcharges={(sizeUpcharges) => {
            const next = prices.map((item) =>
              item.id === charges.price.id ? { ...item, sizeUpcharges } : item,
            );
            replacePrices(next);
          }}
        />
      ) : null}

      {formOpen ? (
        <PriceFormDialog
          key={formSession}
          editing={editing}
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
              reviewBulk();
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
            <Field label="Increase GPM %" value={bulkIncrease} onChange={setBulkIncrease} inputMode="decimal" />
            <p className="text-sm text-slate-500">
              Raises every quantity break and every extra charge by this percent. Wholesale and retail below replace the lowest quantity break only.
            </p>
            <Field label="Update wholesale" value={bulkWholesale} onChange={setBulkWholesale} inputMode="decimal" />
            <Field label="Update retail" value={bulkRetail} onChange={setBulkRetail} inputMode="decimal" />
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

function emptyLabel(
  query: string,
  typeFilter: TypeFilter,
  accountUnitName: string,
  stakeholderName: string,
  categoryName: string,
  showInactive: boolean,
): string {
  const typeName = typeFilter === "all" ? "" : PRICE_TYPE_LABELS[typeFilter];
  const scope = priceScope(typeName, accountUnitName, stakeholderName, categoryName);
  const searching = query.trim().length > 0;
  if (searching && scope) return `No ${scope} match that search.`;
  if (searching) return "No products match that search.";
  if (scope && !showInactive) return `No active ${scope}. Show inactive products to see the rest.`;
  if (scope) return `No ${scope}.`;
  if (showInactive) return "No products yet.";
  return "No active products. Show inactive products to see the rest.";
}

function priceScope(
  typeName: string,
  accountUnitName: string,
  stakeholderName: string,
  categoryName: string,
): string {
  if (!typeName && !accountUnitName && !stakeholderName && !categoryName) return "";
  let label = typeName ? `${typeName} products` : "products";
  if (categoryName) label += ` in ${categoryName}`;
  if (accountUnitName) label += ` in ${accountUnitName}`;
  if (stakeholderName) label += ` for ${stakeholderName}`;
  return label;
}

// The cell shows the lowest quantity. A click opens that side's charge breakdown.
function ChargeButton({
  price,
  side = "wholesale",
  onOpen,
}: {
  price: Price;
  side?: ChargeSide;
  onOpen: () => void;
}) {
  const base = baseBreak(price);
  const value = formatMoney(side === "wholesale" ? base.wholesale : base.retail);
  const sideLabel = side === "wholesale" ? "Wholesale" : "Retail";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="tabular-nums text-[#0f2c4c] underline-offset-2 hover:underline"
      aria-label={`${sideLabel} charges for ${price.name}`}
    >
      {value}
    </button>
  );
}

// Wholesale pricing vs Retail — same sections, one money column for the side that opened it.
function ChargeDialog({
  price,
  side,
  onClose,
  onSizeUpcharges,
}: {
  price: Price;
  side: ChargeSide;
  onClose: () => void;
  onSizeUpcharges: (next: SizeUpcharge[]) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const title = side === "wholesale" ? "Wholesale pricing" : "Retail";
  const amountHeader = side === "wholesale" ? "Wholesale" : "Retail";
  const showUpcharges = price.type === "apparel" || price.sizeUpcharges.length > 0;
  const upchargeRows = apparelUpchargeRows(price);
  const allLive = upchargeRows.every((row) => row.active);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  function moneyFor(item: { wholesale: number; retail: number }, prefix = "") {
    const value = side === "wholesale" ? item.wholesale : item.retail;
    return `${prefix}${formatMoney(value)}`;
  }

  // Keep inactive sizes in storage too so amounts stick when toggled back on.
  function writeUpcharges(rows: SizeUpcharge[]) {
    onSizeUpcharges(rows.filter((row) => row.active || row.wholesale > 0 || row.retail > 0));
  }

  function toggleSize(size: ApparelSize, active: boolean) {
    const next = upchargeRows.map((row) => (row.size === size ? { ...row, active } : row));
    writeUpcharges(next);
  }

  function toggleAll(active: boolean) {
    writeUpcharges(upchargeRows.map((row) => ({ ...row, active })));
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="charge-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="charge-dialog-title" className="text-lg font-semibold">
              {title}
            </h2>
            <p className="text-sm text-slate-500">{price.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-500">
            ×
          </button>
        </div>
        <TipSection title="Quantity breaks">
          <TipTable
            labelHeader="Qty"
            amountHeader={amountHeader}
            rows={sortBreaks(price.breaks).map((item) => ({
              key: String(item.qty),
              label: String(item.qty),
              amount: moneyFor(item),
            }))}
          />
        </TipSection>
        <TipSection title="Extras">
          {price.extras.length === 0 ? (
            <p className="text-center text-sm text-slate-400">None</p>
          ) : (
            <TipTable
              labelHeader="Charge"
              amountHeader={amountHeader}
              rows={price.extras.map((item, index) => {
                const label = EXTRA_TIP_LABELS[item.type];
                return {
                  key: `${item.type}-${index}`,
                  label: label.name,
                  hint: label.hint,
                  amount: moneyFor(item),
                };
              })}
            />
          )}
        </TipSection>
        {showUpcharges ? (
          <TipSection title="Upcharges">
            <div className="mb-2 flex items-center justify-center gap-2 text-sm">
              <input
                id={`upcharge-all-${price.id}`}
                type="checkbox"
                checked={allLive}
                onChange={(event) => toggleAll(event.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor={`upcharge-all-${price.id}`} className="font-medium text-slate-700">
                Check all
              </label>
            </div>
            <table className="w-full border-separate border-spacing-0 text-center text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="pb-1 font-medium">Live</th>
                  <th className="pb-1 font-medium">Size</th>
                  <th className="pb-1 font-medium">{amountHeader}</th>
                </tr>
              </thead>
              <tbody>
                {upchargeRows.map((row) => (
                  <tr key={row.size}>
                    <td className="border-t border-slate-100 py-1.5">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(event) => toggleSize(row.size, event.target.checked)}
                        aria-label={`${row.size} upcharge live`}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="border-t border-slate-100 py-1.5 text-slate-800">{row.size}</td>
                    <td className="border-t border-slate-100 py-1.5 tabular-nums">+{moneyFor(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {price.type !== "apparel" && price.sizeUpcharges.length === 0 ? null : (
              <p className="mt-1.5 text-center text-xs text-slate-400">Per piece · {APPAREL_SIZES.join(", ")}</p>
            )}
          </TipSection>
        ) : null}
      </div>
    </dialog>
  );
}

function TipSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {children}
    </section>
  );
}

function TipTable({
  labelHeader,
  amountHeader,
  rows,
}: {
  labelHeader: string;
  amountHeader: string;
  rows: { key: string; label: string; hint?: string; amount: string }[];
}) {
  return (
    <table className="w-full border-separate border-spacing-0 text-center text-sm">
      <thead>
        <tr className="text-slate-500">
          <th className="pb-1 font-medium">{labelHeader}</th>
          <th className="pb-1 font-medium">{amountHeader}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td className="border-t border-slate-100 py-1.5 text-slate-800">
              {row.label}
              {row.hint ? <span className="ml-1.5 text-slate-400">· {row.hint}</span> : null}
            </td>
            <td className="border-t border-slate-100 py-1.5 tabular-nums">{row.amount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function parseDraftMoney(raw: string): number | null {
  const cleaned = raw.replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "decimal" | "text";
}) {
  const id = `price-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={id}>
      <span className="font-medium text-slate-700">{label}</span>
      <input
        id={id}
        value={value}
        inputMode={inputMode ?? "text"}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </label>
  );
}

function InactiveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 17 17 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-.2-.2a2 2 0 0 0-2.8 0L5 17v3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13 6.5 17.5 11" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}


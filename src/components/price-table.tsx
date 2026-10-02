"use client";

import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { PriceFormDialog } from "@/components/price-form-dialog";
import {
  getAccountUnitsServerSnapshot,
  getAccountUnitsSnapshot,
  subscribeAccountUnits,
} from "@/lib/account-units";
import { formatMoney } from "@/lib/money";
import { STAKEHOLDERS } from "@/lib/stakeholders";
import {
  applyBulkEdit,
  baseBreak,
  formatGpmPercent,
  getPricesServerSnapshot,
  getPricesSnapshot,
  gpmDollars,
  gpmPercent,
  PRICE_TYPE_LABELS,
  PRICE_TYPES,
  replacePrices,
  sortBreaks,
  subscribePrices,
  type BulkPriceEdit,
  type ExtraType,
  type Price,
  type PriceType,
} from "@/lib/prices";

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
  "sticky top-0 z-10 whitespace-nowrap border-r border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-medium last:border-r-0";
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
  // One hover panel for the whole table, so wholesale and retail never stack.
  const [openTip, setOpenTip] = useState<{ id: string; side: "wholesale" | "retail" } | null>(null);

  const filtered = prices.filter((price) => {
    if (!showInactive && !price.active) return false;
    if (typeFilter !== "all" && price.type !== typeFilter) return false;
    if (accountUnitFilter !== "all" && price.accountUnitId !== accountUnitFilter) return false;
    if (stakeholderFilter !== "all" && String(price.stakeholderId) !== stakeholderFilter) return false;
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
    setOpenTip(null);
    setEditing(null);
    setFormSession((current) => current + 1);
    setFormOpen(true);
  }

  function openEdit(price: Price) {
    setOpenTip(null);
    setEditing(price);
    setFormSession((current) => current + 1);
    setFormOpen(true);
  }

  function savePrice(next: Price) {
    const exists = prices.some((price) => price.id === next.id);
    replacePrices(exists ? prices.map((price) => (price.id === next.id ? next : price)) : [...prices, next]);
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
            placeholder="Search prices"
            aria-label="Search prices"
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
            aria-label="Show inactive prices"
            className={showInactive ? inactiveToggleOn : toolButton}
          >
            <InactiveIcon />
          </button>
          <button type="button" onClick={openAdd} aria-label="Add price" className={addButton}>
            +
          </button>
        </div>
      </div>

      <section aria-label="Prices" className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold">Prices</h2>
        </div>
        {/* Own scroll box so the header can stick, same as orders. */}
        <div className="h-[416px] overflow-auto" onScroll={() => setOpenTip(null)}>
        <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-center text-sm">
          <thead className="text-slate-600">
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
                  {emptyLabel(query, typeFilter, accountUnitName, stakeholderName, showInactive)}
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
                      <PriceAmount
                        price={price}
                        side="wholesale"
                        open={openTip?.id === price.id && openTip.side === "wholesale"}
                        onOpen={() => setOpenTip({ id: price.id, side: "wholesale" })}
                        onClose={() =>
                          setOpenTip((current) =>
                            current?.id === price.id && current.side === "wholesale" ? null : current,
                          )
                        }
                      />
                    </td>
                    <td className={priceCell}>
                      <PriceAmount
                        price={price}
                        side="retail"
                        open={openTip?.id === price.id && openTip.side === "retail"}
                        onOpen={() => setOpenTip({ id: price.id, side: "retail" })}
                        onClose={() =>
                          setOpenTip((current) =>
                            current?.id === price.id && current.side === "retail" ? null : current,
                          )
                        }
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
            <p className="text-sm text-slate-700">You are going to update {selectedCount} price tables.</p>
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
  showInactive: boolean,
): string {
  const typeName = typeFilter === "all" ? "" : PRICE_TYPE_LABELS[typeFilter];
  const scope = priceScope(typeName, accountUnitName, stakeholderName);
  const searching = query.trim().length > 0;
  if (searching && scope) return `No ${scope} match that search.`;
  if (searching) return "No prices match that search.";
  if (scope && !showInactive) return `No active ${scope}. Show inactive prices to see the rest.`;
  if (scope) return `No ${scope}.`;
  if (showInactive) return "No prices yet.";
  return "No active prices. Show inactive prices to see the rest.";
}

function priceScope(typeName: string, accountUnitName: string, stakeholderName: string): string {
  if (!typeName && !accountUnitName && !stakeholderName) return "";
  let label = typeName ? `${typeName} prices` : "prices";
  if (accountUnitName) label += ` in ${accountUnitName}`;
  if (stakeholderName) label += ` for ${stakeholderName}`;
  return label;
}

// The cell shows the lowest quantity. Hover either price for every break and extra.
function PriceAmount({
  price,
  side,
  open,
  onOpen,
  onClose,
}: {
  price: Price;
  side: "wholesale" | "retail";
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const base = baseBreak(price);
  const value = formatMoney(side === "wholesale" ? base.wholesale : base.retail);
  return (
    <ExtraTip price={price} side={side} open={open} onOpen={onOpen} onClose={onClose}>
      {value}
    </ExtraTip>
  );
}

function ExtraTip({
  price,
  side,
  open,
  onOpen,
  onClose,
  children,
}: {
  price: Price;
  side: "wholesale" | "retail";
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const place = open ? tipPlace(buttonRef.current) : null;
  const sideLabel = side === "wholesale" ? "Wholesale" : "Retail";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="tabular-nums underline decoration-dotted decoration-slate-400 underline-offset-4"
        aria-label={`${sideLabel} details for ${price.name}`}
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
        onFocus={onOpen}
        onBlur={onClose}
      >
        {children}
      </button>
      {place ? (
        <div
          role="tooltip"
          style={{
            top: place.top,
            left: place.left,
            transform: place.above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
          }}
          className="pointer-events-none fixed z-50 w-80 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs text-slate-700 shadow-lg"
        >
          <TipBody price={price} side={side} />
        </div>
      ) : null}
    </>
  );
}

// Anchor the panel to the price that opened it. The panel itself ignores the pointer so it cannot cover the next row.
function tipPlace(button: HTMLButtonElement | null): { top: number; left: number; above: boolean } | null {
  const rect = button?.getBoundingClientRect();
  if (!rect) return null;
  const width = 320;
  const left = Math.min(Math.max(rect.left + rect.width / 2, width / 2 + 8), window.innerWidth - width / 2 - 8);
  const above = rect.bottom + 220 > window.innerHeight && rect.top > 160;
  return { top: above ? rect.top - 8 : rect.bottom + 8, left, above };
}

function TipBody({ price, side }: { price: Price; side: "wholesale" | "retail" }) {
  return (
    <div className="flex flex-col gap-3">
      <TipSection title="Quantity breaks">
        <TipTable
          labelHeader="Qty"
          side={side}
          rows={sortBreaks(price.breaks).map((item) => ({
            key: String(item.qty),
            label: String(item.qty),
            wholesale: formatMoney(item.wholesale),
            retail: formatMoney(item.retail),
          }))}
        />
      </TipSection>
      <TipSection title="Extras">
        {price.extras.length === 0 ? (
          <p className="text-slate-400">None</p>
        ) : (
          <TipTable
            labelHeader="Charge"
            side={side}
            rows={price.extras.map((item, index) => {
              const label = EXTRA_TIP_LABELS[item.type];
              return {
                key: `${item.type}-${index}`,
                label: label.name,
                hint: label.hint,
                wholesale: formatMoney(item.wholesale),
                retail: formatMoney(item.retail),
              };
            })}
          />
        )}
      </TipSection>
      {price.sizeUpcharges.length > 0 ? (
        <TipSection title="Bigger sizes, per piece">
          <TipTable
            labelHeader="Size"
            side={side}
            rows={price.sizeUpcharges.map((item) => ({
              key: item.size,
              label: item.size,
              wholesale: `+${formatMoney(item.wholesale)}`,
              retail: `+${formatMoney(item.retail)}`,
            }))}
          />
        </TipSection>
      ) : null}
    </div>
  );
}

function TipSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {children}
    </section>
  );
}

function TipTable({
  labelHeader,
  side,
  rows,
}: {
  labelHeader: string;
  side: "wholesale" | "retail";
  rows: { key: string; label: string; hint?: string; wholesale: string; retail: string }[];
}) {
  const money = "px-1.5 py-1 text-right font-normal tabular-nums";
  const hot = "rounded bg-slate-100 font-medium text-slate-900";

  return (
    <table className="w-full border-separate border-spacing-0">
      <thead>
        <tr className="text-[11px] text-slate-500">
          <th className="pb-1 text-left font-medium">{labelHeader}</th>
          <th className={`pb-1 text-right font-medium ${side === "wholesale" ? "text-slate-900" : ""}`}>Wholesale</th>
          <th className={`pb-1 text-right font-medium ${side === "retail" ? "text-slate-900" : ""}`}>Retail</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-t border-slate-100">
            <td className="border-t border-slate-100 py-1 pr-2 text-left text-slate-800">
              {row.label}
              {row.hint ? <span className="ml-1.5 text-slate-400">· {row.hint}</span> : null}
            </td>
            <td className={`border-t border-slate-100 ${money} ${side === "wholesale" ? hot : ""}`}>{row.wholesale}</td>
            <td className={`border-t border-slate-100 ${money} ${side === "retail" ? hot : ""}`}>{row.retail}</td>
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


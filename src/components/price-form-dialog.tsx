"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  accountUnitLabel,
  getAccountUnitsServerSnapshot,
  getAccountUnitsSnapshot,
  subscribeAccountUnits,
} from "@/lib/account-units";
import { formatMoney } from "@/lib/money";
import { STAKEHOLDERS } from "@/lib/stakeholders";
import {
  EXTRA_TYPES,
  EXTRA_TYPE_LABELS,
  downloadPriceTemplate,
  gpmDollars,
  gpmPercent,
  parsePriceCsv,
  PRICE_TYPE_LABELS,
  PRICE_TYPES,
  retailFromGpm,
  sortBreaks,
  type ExtraType,
  type Price,
  type PriceType,
  type QtyBreak,
  type SizeUpcharge,
} from "@/lib/prices";

// Matches the price-table buttons. The shell stays one size on every step.
const navyButton =
  "h-10 rounded-lg bg-[#0f2c4c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1a4a73] disabled:cursor-not-allowed disabled:opacity-50";
const outlineButton =
  "h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-100";

type FormStep = "details" | "breaks" | "extras" | "import";

const FORM_TABS: { id: Exclude<FormStep, "import">; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "breaks", label: "Breaks" },
  { id: "extras", label: "Extras" },
];

// "gpm" means the last price the user set was the margin, so wholesale edits refill retail.
// "retail" means they typed the sell price, so wholesale edits only refresh the margin.
type PriceDriver = "gpm" | "retail";

type ChargeDraft = {
  wholesale: string;
  gpm: string;
  retail: string;
  driver: PriceDriver;
};

type BreakDraft = ChargeDraft & {
  key: string;
  qty: string;
};

type ExtraDraft = ChargeDraft & {
  key: string;
  type: ExtraType;
};

type FormDraft = {
  step: FormStep;
  type: PriceType | "";
  name: string;
  sku: string;
  stakeholderId: number;
  accountUnitId: string;
  specs: string;
  // Not shown. Carried through so an older listing is not wiped on save.
  vendor: string;
  active: boolean;
  breaks: BreakDraft[];
  extras: ExtraDraft[];
  // Older apparel sizes. Not shown. Carried through so a save does not drop them.
  sizeUpcharges: SizeUpcharge[];
  error: string | null;
  importNote: string | null;
};

// Fixed dialog. Details, Breaks, and Extras are tabs, so the window does not resize between them.
export function PriceFormDialog({
  editing,
  onClose,
  onSave,
  onImport,
}: {
  editing: Price | null;
  onClose: () => void;
  onSave: (price: Price) => void;
  onImport: (prices: Price[]) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listingId = useRef(editing?.id ?? crypto.randomUUID());
  const [draft, setDraft] = useState<FormDraft>(() => draftFrom(editing));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  function openTab(step: Exclude<FormStep, "import">) {
    setDraft((current) => ({ ...current, error: null, step }));
  }

  function submit() {
    if (!draft.type || !draft.name.trim()) {
      setDraft((current) => ({
        ...current,
        step: "details",
        error: !current.type ? "Choose a type." : "Enter a name.",
      }));
      return;
    }
    const breakError = validateBreaks(draft.breaks);
    if (breakError) {
      setDraft((current) => ({ ...current, step: "breaks", error: breakError }));
      return;
    }
    const built = toPrice(draft, listingId.current);
    if (typeof built === "string") {
      setDraft((current) => ({ ...current, step: tabForError(built), error: built }));
      return;
    }
    onSave(built);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="price-form-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto h-[32rem] max-h-[calc(100%-2rem)] w-[min(44rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <form
        className="flex h-full min-h-0 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.step !== "import") submit();
        }}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <h2 id="price-form-title" className="text-lg font-semibold">
            {editing ? "Edit price" : "Add price"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-500">
            ×
          </button>
        </div>
        <div role="tablist" aria-label="Price sections" className="flex gap-1 border-b border-slate-200 px-5">
          {FORM_TABS.map((tab) => {
            const selected = draft.step === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => openTab(tab.id)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                  selected
                    ? "border-[#0f2c4c] text-[#0f2c4c]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {draft.step === "details" ? (
            <DetailsStep
              draft={draft}
              editing={editing != null}
              onType={(type) => setDraft((current) => changeType(current, type))}
              onName={(name) => setDraft((current) => ({ ...current, name }))}
              onSku={(sku) => setDraft((current) => ({ ...current, sku }))}
              onStakeholder={(stakeholderId) => setDraft((current) => ({ ...current, stakeholderId }))}
              onAccountUnit={(accountUnitId) => setDraft((current) => ({ ...current, accountUnitId }))}
              onSpecs={(specs) => setDraft((current) => ({ ...current, specs }))}
              onActive={(active) => setDraft((current) => ({ ...current, active }))}
              onImport={() => setDraft((current) => ({ ...current, error: null, step: "import" }))}
            />
          ) : null}

          {draft.step === "breaks" ? (
            <BreaksStep
              breaks={draft.breaks}
              onPatchBreak={(key, update) =>
                setDraft((current) => ({
                  ...current,
                  error: null,
                  breaks: current.breaks.map((row) => (row.key === key ? update(row) : row)),
                }))
              }
              onBreaks={(breaks) => setDraft((current) => ({ ...current, error: null, breaks }))}
              onReject={(error) => setDraft((current) => ({ ...current, error }))}
              onApply={() => applyGpmToAll(draft, setDraft)}
            />
          ) : null}

          {draft.step === "extras" ? (
            <ExtrasStep
              extras={draft.extras}
              onPatchExtra={(key, update) =>
                setDraft((current) => ({
                  ...current,
                  error: null,
                  extras: current.extras.map((row) => (row.key === key ? update(row) : row)),
                }))
              }
              onExtras={(extras) => setDraft((current) => ({ ...current, error: null, extras }))}
              onReject={(error) => setDraft((current) => ({ ...current, error }))}
            />
          ) : null}

          {draft.step === "import" ? (
            <ImportStep
              note={draft.importNote}
              onNote={(importNote) => setDraft((current) => ({ ...current, importNote }))}
              onImport={onImport}
            />
          ) : null}
        </div>

        {draft.error ? <p className="px-5 pb-2 text-sm text-red-700">{draft.error}</p> : null}

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4">
          {draft.step === "import" ? (
            <button type="button" onClick={() => openTab("details")} className={outlineButton}>
              Back to details
            </button>
          ) : (
            <button type="submit" className={navyButton}>
              Save
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}

function DetailsStep({
  draft,
  editing,
  onType,
  onName,
  onSku,
  onStakeholder,
  onAccountUnit,
  onSpecs,
  onActive,
  onImport,
}: {
  draft: FormDraft;
  editing: boolean;
  onType: (type: PriceType | "") => void;
  onName: (value: string) => void;
  onSku: (value: string) => void;
  onStakeholder: (id: number) => void;
  onAccountUnit: (id: string) => void;
  onSpecs: (value: string) => void;
  onActive: (active: boolean) => void;
  onImport: () => void;
}) {
  const accountUnits = useSyncExternalStore(
    subscribeAccountUnits,
    getAccountUnitsSnapshot,
    getAccountUnitsServerSnapshot,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm" htmlFor="price-status">
          <span className="font-medium text-slate-700">Status</span>
          <select
            id="price-status"
            value={draft.active ? "active" : "inactive"}
            onChange={(event) => onActive(event.target.value === "active")}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor="price-type">
          <span className="font-medium text-slate-700">Type</span>
          <select
            id="price-type"
            value={draft.type}
            onChange={(event) => onType(event.target.value as PriceType | "")}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
          >
            <option value="">Select type</option>
            {PRICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {PRICE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor="price-au">
          <span className="font-medium text-slate-700">AU</span>
          <select
            id="price-au"
            value={draft.accountUnitId}
            onChange={(event) => onAccountUnit(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
          >
            <option value="">None</option>
            {accountUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {accountUnitLabel(unit)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <LabeledInput id="price-name" label="Name" value={draft.name} onChange={onName} />
        <LabeledInput id="price-sku" label="SKU" value={draft.sku} onChange={onSku} />
        <label className="flex flex-col gap-1 text-sm" htmlFor="price-owner">
          <span className="font-medium text-slate-700">Stakeholder</span>
          <select
            id="price-owner"
            value={draft.stakeholderId}
            onChange={(event) => onStakeholder(Number(event.target.value))}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
          >
            {STAKEHOLDERS.map((stakeholder) => (
              <option key={stakeholder.id} value={stakeholder.id}>
                {stakeholder.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <LabeledInput id="price-specs" label="Specs" value={draft.specs} onChange={onSpecs} />
      {editing ? null : (
        <button type="button" onClick={onImport} className="w-fit text-sm font-medium text-[#0f2c4c] hover:underline">
          Import a CSV instead
        </button>
      )}
    </div>
  );
}

function BreaksStep({
  breaks,
  onPatchBreak,
  onBreaks,
  onReject,
  onApply,
}: {
  breaks: BreakDraft[];
  onPatchBreak: (key: string, update: (row: BreakDraft) => BreakDraft) => void;
  onBreaks: (breaks: BreakDraft[]) => void;
  onReject: (message: string) => void;
  onApply: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {breaks.length >= 2 ? (
        <button type="button" onClick={onApply} className={`${outlineButton} self-start`}>
          Apply GPM to all breaks
        </button>
      ) : null}
      {/* Same cell borders as the orders table, so a break is a row you edit in place. */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-center text-sm">
          <thead className="text-slate-600">
            <tr>
              <th className={breakHeaderCell}>Qty</th>
              <th className={breakHeaderCell}>Wholesale</th>
              <th className={breakHeaderCell}>GPM %</th>
              <th className={breakHeaderCell}>Retail</th>
              <th className={breakHeaderCell}>Margin</th>
              <th className={breakHeaderCell}>
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {breaks.map((item) => (
              <tr key={item.key} className="even:bg-slate-100">
                <td className={breakCell}>
                  <input
                    aria-label="Quantity"
                    inputMode="numeric"
                    value={item.qty}
                    onChange={(event) => onPatchBreak(item.key, (row) => ({ ...row, qty: event.target.value }))}
                    className={cellInput}
                  />
                </td>
                <td className={breakCell}>
                  <input
                    aria-label="Wholesale"
                    inputMode="decimal"
                    value={item.wholesale}
                    onChange={(event) => onPatchBreak(item.key, (row) => withWholesale(row, event.target.value))}
                    className={cellInput}
                  />
                </td>
                <td className={breakCell}>
                  <input
                    aria-label="GPM percent"
                    inputMode="decimal"
                    value={item.gpm}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      const probe = withGpm(item, nextValue);
                      if (!probe.ok) {
                        onReject(probe.reason);
                        return;
                      }
                      onPatchBreak(item.key, (row) => {
                        const result = withGpm(row, nextValue);
                        return result.ok ? { ...row, ...result.charge } : row;
                      });
                    }}
                    className={cellInput}
                  />
                </td>
                <td className={breakCell}>
                  <input
                    aria-label="Retail"
                    inputMode="decimal"
                    value={item.retail}
                    onChange={(event) => onPatchBreak(item.key, (row) => withRetail(row, event.target.value))}
                    className={cellInput}
                  />
                </td>
                <td className={`${breakCell} tabular-nums text-slate-700`}>{marginLabel(item)}</td>
                <td className={breakCell}>
                  <button
                    type="button"
                    aria-label={`Remove quantity ${item.qty || "break"}`}
                    disabled={breaks.length === 1}
                    onClick={() => onBreaks(breaks.filter((row) => row.key !== item.key))}
                    className="text-lg leading-none text-slate-500 disabled:text-slate-300"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td className={breakCell} colSpan={6}>
                <button
                  type="button"
                  onClick={() => onBreaks(addBreak(breaks))}
                  aria-label="Add break"
                  className="text-lg leading-none text-[#0f2c4c]"
                >
                  +
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm text-slate-500">
        Enter wholesale, then a GPM % to fill retail. Or type retail and the margin updates.
      </p>
    </div>
  );
}

function ExtrasStep({
  extras,
  onPatchExtra,
  onExtras,
  onReject,
}: {
  extras: ExtraDraft[];
  onPatchExtra: (key: string, update: (row: ExtraDraft) => ExtraDraft) => void;
  onExtras: (extras: ExtraDraft[]) => void;
  onReject: (message: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Same cell borders as breaks. Each row is one extra charge. */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-center text-sm">
          <thead className="text-slate-600">
            <tr>
              <th className={breakHeaderCell}>Type</th>
              <th className={breakHeaderCell}>Wholesale</th>
              <th className={breakHeaderCell}>GPM %</th>
              <th className={breakHeaderCell}>Retail</th>
              <th className={breakHeaderCell}>Margin</th>
              <th className={breakHeaderCell}>
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {extras.map((item) => (
              <tr key={item.key} className="even:bg-slate-100">
                <td className={breakCell}>
                  <select
                    aria-label="Extra type"
                    value={item.type}
                    onChange={(event) =>
                      onPatchExtra(item.key, (row) => ({ ...row, type: event.target.value as ExtraType }))
                    }
                    className={`${cellInput} bg-transparent`}
                  >
                    {EXTRA_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {EXTRA_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={breakCell}>
                  <input
                    aria-label="Wholesale"
                    inputMode="decimal"
                    value={item.wholesale}
                    onChange={(event) => onPatchExtra(item.key, (row) => withWholesale(row, event.target.value))}
                    className={cellInput}
                  />
                </td>
                <td className={breakCell}>
                  <input
                    aria-label="GPM percent"
                    inputMode="decimal"
                    value={item.gpm}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      const probe = withGpm(item, nextValue);
                      if (!probe.ok) {
                        onReject(probe.reason);
                        return;
                      }
                      onPatchExtra(item.key, (row) => {
                        const result = withGpm(row, nextValue);
                        return result.ok ? { ...row, ...result.charge, type: row.type, key: row.key } : row;
                      });
                    }}
                    className={cellInput}
                  />
                </td>
                <td className={breakCell}>
                  <input
                    aria-label="Retail"
                    inputMode="decimal"
                    value={item.retail}
                    onChange={(event) => onPatchExtra(item.key, (row) => withRetail(row, event.target.value))}
                    className={cellInput}
                  />
                </td>
                <td className={`${breakCell} tabular-nums text-slate-700`}>{marginLabel(item)}</td>
                <td className={breakCell}>
                  <button
                    type="button"
                    aria-label={`Remove ${EXTRA_TYPE_LABELS[item.type]}`}
                    onClick={() => onExtras(extras.filter((row) => row.key !== item.key))}
                    className="text-lg leading-none text-slate-500"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td className={breakCell} colSpan={6}>
                <button
                  type="button"
                  onClick={() => onExtras(addExtra(extras))}
                  aria-label="Add extra"
                  className="text-lg leading-none text-[#0f2c4c]"
                >
                  +
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm text-slate-500">
        Enter wholesale, then a GPM % to fill retail. Or type retail and the margin updates.
      </p>
    </div>
  );
}

function ImportStep({
  note,
  onNote,
  onImport,
}: {
  note: string | null;
  onNote: (note: string) => void;
  onImport: (prices: Price[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-600">
        Import a CSV with columns Name, Wholesale, and Retail. Rows are added as Print at quantity 1.
      </p>
      <button type="button" onClick={downloadPriceTemplate} className={outlineButton}>
        Download template
      </button>
      <label className="flex flex-col gap-1 text-sm" htmlFor="price-import">
        <span className="font-medium text-slate-700">CSV file</span>
        <input
          id="price-import"
          type="file"
          accept=".csv,text/csv"
          className="text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            void file.text().then((text) => {
              const result = parsePriceCsv(text);
              if (result.prices.length > 0) onImport(result.prices);
              const added = result.prices.length === 1 ? "1 price" : `${result.prices.length} prices`;
              const skipped = result.skipped === 1 ? "1 row" : `${result.skipped} rows`;
              onNote(result.skipped > 0 ? `Added ${added}. Skipped ${skipped}.` : `Added ${added}.`);
            });
          }}
        />
      </label>
      {note ? <p className="text-sm text-slate-600">{note}</p> : null}
    </div>
  );
}

function LabeledInput({
  id,
  label,
  value,
  onChange,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "decimal" | "text";
}) {
  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={id}>
      <span className="font-medium text-slate-700">{label}</span>
      <input
        id={id}
        value={value}
        inputMode={inputMode ?? "text"}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
      />
    </label>
  );
}

const cellInput = "h-8 w-full bg-transparent text-center text-sm text-slate-900 outline-none";
const breakHeaderCell =
  "sticky top-0 z-10 whitespace-nowrap border-r border-b border-slate-200 bg-slate-50 px-2 py-2 font-medium last:border-r-0";
const breakCell = "border-r border-b border-slate-200 px-2 py-1.5 last:border-r-0";

function tabForError(message: string): FormStep {
  if (/extra/i.test(message)) return "extras";
  if (/quantity|break/i.test(message)) return "breaks";
  return "details";
}

function changeType(current: FormDraft, next: PriceType | ""): FormDraft {
  return { ...current, type: next, error: null };
}

function applyGpmToAll(draft: FormDraft, setDraft: (update: (current: FormDraft) => FormDraft) => void) {
  const gpm = draft.breaks[0]?.gpm ?? "";
  const parsed = parseGpmInput(gpm);
  if (parsed == null || parsed >= 100) {
    setDraft((current) => ({ ...current, error: "Enter a GPM % on the first break first." }));
    return;
  }
  setDraft((current) => ({
    ...current,
    error: null,
    breaks: current.breaks.map((item) => ({
      ...item,
      gpm,
      driver: "gpm",
      retail: retailText(item.wholesale, gpm) ?? "",
    })),
  }));
}

function addExtra(extras: ExtraDraft[]): ExtraDraft[] {
  const previous = extras[extras.length - 1];
  return [
    ...extras,
    {
      key: crypto.randomUUID(),
      type: "setup",
      wholesale: "",
      retail: "",
      gpm: previous?.gpm ?? "",
      driver: "gpm",
    },
  ];
}

function addBreak(breaks: BreakDraft[]): BreakDraft[] {
  const previous = breaks[breaks.length - 1];
  return [
    ...breaks,
    {
      key: crypto.randomUUID(),
      qty: "",
      wholesale: "",
      retail: "",
      gpm: previous?.gpm ?? "",
      driver: "gpm",
    },
  ];
}

function withWholesale<T extends ChargeDraft>(charge: T, wholesale: string): T {
  if (charge.driver === "retail") {
    return { ...charge, wholesale, gpm: gpmText(wholesale, charge.retail) };
  }
  return { ...charge, wholesale, retail: retailText(wholesale, charge.gpm) ?? "" };
}

function withRetail<T extends ChargeDraft>(charge: T, retail: string): T {
  return { ...charge, retail, driver: "retail", gpm: gpmText(charge.wholesale, retail) };
}

function withGpm(charge: ChargeDraft, gpm: string): { ok: true; charge: ChargeDraft } | { ok: false; reason: string } {
  const trimmed = gpm.trim();
  if (trimmed && !/^-?\d*\.?\d*$/.test(trimmed)) {
    return { ok: false, reason: "GPM % must be a number under 100." };
  }
  const parsed = parseGpmInput(trimmed);
  if (parsed != null && parsed >= 100) {
    return { ok: false, reason: "GPM % must be under 100." };
  }
  return {
    ok: true,
    charge: { ...charge, gpm, driver: "gpm", retail: retailText(charge.wholesale, trimmed) ?? charge.retail },
  };
}

function gpmText(wholesaleRaw: string, retailRaw: string): string {
  const wholesale = parseDraftMoney(wholesaleRaw);
  const retail = parseDraftMoney(retailRaw);
  if (wholesale == null || retail == null) return "";
  const percent = gpmPercent(wholesale, retail);
  if (percent == null || !Number.isFinite(percent)) return "";
  return percent.toFixed(1);
}

function retailText(wholesaleRaw: string, gpmRaw: string): string | null {
  const wholesale = parseDraftMoney(wholesaleRaw);
  const gpm = parseGpmInput(gpmRaw);
  if (wholesale == null || gpm == null || gpm >= 100) return null;
  const retail = retailFromGpm(wholesale, gpm);
  if (retail == null) return null;
  return retail.toFixed(2);
}

function marginLabel(charge: ChargeDraft): string {
  const wholesale = parseDraftMoney(charge.wholesale);
  const retail = parseDraftMoney(charge.retail);
  if (wholesale == null || retail == null) return "—";
  return formatMoney(gpmDollars(wholesale, retail));
}

function blankDraft(): FormDraft {
  return {
    step: "details",
    type: "",
    name: "",
    sku: "",
    stakeholderId: 1,
    accountUnitId: "",
    specs: "",
    vendor: "",
    active: true,
    breaks: [
      {
        key: crypto.randomUUID(),
        qty: "1",
        wholesale: "",
        gpm: "",
        retail: "",
        driver: "gpm",
      },
    ],
    extras: [],
    sizeUpcharges: [],
    error: null,
    importNote: null,
  };
}

function draftFrom(price: Price | null): FormDraft {
  if (!price) return blankDraft();
  return {
    step: "details",
    type: price.type,
    name: price.name,
    sku: price.sku,
    stakeholderId: price.stakeholderId,
    accountUnitId: price.accountUnitId ?? "",
    specs: price.specs,
    vendor: price.vendor,
    active: price.active,
    breaks: (price.breaks.length > 0 ? sortBreaks(price.breaks) : [{ qty: 1, wholesale: 0, retail: 0 }]).map(
      (item) => ({
        key: crypto.randomUUID(),
        qty: String(item.qty),
        wholesale: item.wholesale.toFixed(2),
        retail: item.retail.toFixed(2),
        gpm: gpmText(item.wholesale.toFixed(2), item.retail.toFixed(2)),
        driver: "retail" as const,
      }),
    ),
    extras: price.extras.map((item) => ({
      key: crypto.randomUUID(),
      type: item.type,
      wholesale: item.wholesale.toFixed(2),
      retail: item.retail.toFixed(2),
      gpm: gpmText(item.wholesale.toFixed(2), item.retail.toFixed(2)),
      driver: "retail" as const,
    })),
    sizeUpcharges: price.sizeUpcharges,
    error: null,
    importNote: null,
  };
}

function validateBreaks(breaks: BreakDraft[]): string | null {
  if (breaks.length === 0) return "Add at least one quantity break.";
  const qtys = new Set<number>();
  for (const item of breaks) {
    const qty = parseQty(item.qty);
    const wholesale = parseDraftMoney(item.wholesale);
    const retail = parseDraftMoney(item.retail);
    if (qty == null || wholesale == null || retail == null) {
      return "Each quantity break needs a quantity of 1 or more, a wholesale, and a retail.";
    }
    if (qtys.has(qty)) return "Use a different quantity for each break.";
    qtys.add(qty);
  }
  return null;
}

function validateExtras(extras: ExtraDraft[]): string | null {
  for (const item of extras) {
    const wholesale = parseDraftMoney(item.wholesale);
    const retail = parseDraftMoney(item.retail);
    if (wholesale == null || retail == null) {
      return "Each extra needs a wholesale and a retail.";
    }
  }
  return null;
}

function toPrice(draft: FormDraft, id: string): Price | string {
  if (!draft.type) return "Choose a type.";
  if (!draft.name.trim()) return "Enter a name.";
  const breakError = validateBreaks(draft.breaks);
  if (breakError) return breakError;
  const extraError = validateExtras(draft.extras);
  if (extraError) return extraError;

  const breaks: QtyBreak[] = sortBreaks(
    draft.breaks.map((item) => ({
      qty: parseQty(item.qty) ?? 0,
      wholesale: parseDraftMoney(item.wholesale) ?? 0,
      retail: parseDraftMoney(item.retail) ?? 0,
    })),
  );

  return {
    id,
    type: draft.type,
    name: draft.name.trim(),
    sku: draft.sku.trim(),
    stakeholderId: draft.stakeholderId,
    accountUnitId: draft.accountUnitId || null,
    specs: draft.specs.trim(),
    vendor: draft.vendor.trim(),
    breaks,
    extras: draft.extras.map((item) => ({
      type: item.type,
      wholesale: parseDraftMoney(item.wholesale) ?? 0,
      retail: parseDraftMoney(item.retail) ?? 0,
    })),
    sizeUpcharges: draft.sizeUpcharges,
    active: draft.active,
  };
}

function parseQty(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const qty = Number(trimmed);
  if (!Number.isInteger(qty) || qty < 1) return null;
  return qty;
}

function parseGpmInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/%$/, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-." || cleaned.endsWith(".")) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return value;
}

function parseDraftMoney(raw: string): number | null {
  const cleaned = raw.replace(/[$,]/g, "").trim();
  if (!cleaned || cleaned === "." || cleaned === "-" || cleaned === "-.") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

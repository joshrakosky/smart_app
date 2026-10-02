import { parseAccountUnitId } from "@/lib/account-units";
import { fromCents, toCents } from "@/lib/money";
import { parseStakeholderId } from "@/lib/stakeholders";

// Local price listings until the database table exists.
// The table shows the lowest-quantity break. Extra charges stay off the grid
// and surface on hover. GPM dollars and GPM % stay calculated. They are not stored.

export type PriceType = "promo" | "apparel" | "print" | "service";

export const PRICE_TYPES: PriceType[] = ["promo", "apparel", "print", "service"];

export const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  promo: "Promo",
  apparel: "Apparel",
  print: "Print",
  service: "Service",
};

export type QtyBreak = {
  qty: number;
  wholesale: number;
  retail: number;
};

// One wholesale and one retail. Used by extra charges and older size upcharges.
export type MoneyPair = {
  wholesale: number;
  retail: number;
};

// How an extra is billed. The hint is what the extras dropdown shows.
export const EXTRA_TYPES = ["setup", "run", "shipping", "kitting"] as const;

export type ExtraType = (typeof EXTRA_TYPES)[number];

export const EXTRA_TYPE_LABELS: Record<ExtraType, string> = {
  setup: "Setup (1 time charge per order)",
  run: "Run (per qty)",
  shipping: "Shipping (1 time charge)",
  kitting: "Kitting (each)",
};

export type ExtraCharge = {
  type: ExtraType;
  wholesale: number;
  retail: number;
};

export const APPAREL_SIZES = ["2XL", "3XL", "4XL", "5XL", "6XL"] as const;

export type ApparelSize = (typeof APPAREL_SIZES)[number];

// Per piece, added on top of every quantity break. Not a separate price grid.
export type SizeUpcharge = {
  size: ApparelSize;
  wholesale: number;
  retail: number;
};

export type Price = {
  id: string;
  type: PriceType;
  name: string;
  // Shown in the table. Type stays a filter, not a column.
  sku: string;
  // Product owner. Set on the price form and filtered from the toolbar, not a column.
  stakeholderId: number;
  // Assigned category. Filtered from the toolbar, not shown as a column.
  accountUnitId: string | null;
  // Free-text product specs. Not a table column.
  specs: string;
  // No longer collected. Kept so older saved rows still load.
  vendor: string;
  breaks: QtyBreak[];
  extras: ExtraCharge[];
  // Older apparel sizes. Not edited in the extras table. Kept so a saved listing is not wiped.
  sizeUpcharges: SizeUpcharge[];
  active: boolean;
};

// Fields the bulk editor can change. Null means "leave this alone".
export type BulkPriceEdit = {
  active: boolean | null;
  increaseGpmPercent: number | null;
  wholesale: number | null;
  retail: number | null;
};

const STORAGE_KEY = "smart-prices";

export const SEED_PRICES: Price[] = [
  {
    id: "seed-brochure",
    type: "print",
    name: "Trane Brochure",
    sku: "BR-8PG",
    stakeholderId: 1,
    accountUnitId: null,
    specs: "",
    vendor: "",
    breaks: [{ qty: 1, wholesale: 2.4, retail: 3.1 }],
    extras: [],
    sizeUpcharges: [],
    active: true,
  },
  {
    id: "seed-poster",
    type: "print",
    name: "Dealer Poster",
    sku: "PS-2436",
    stakeholderId: 1,
    accountUnitId: null,
    specs: "",
    vendor: "",
    breaks: [{ qty: 1, wholesale: 8, retail: 10.5 }],
    extras: [],
    sizeUpcharges: [],
    active: true,
  },
  {
    id: "seed-spec",
    type: "print",
    name: "Product Spec Sheet",
    sku: "SS-SPEC",
    stakeholderId: 2,
    accountUnitId: null,
    specs: "",
    vendor: "",
    breaks: [{ qty: 1, wholesale: 0.75, retail: 1.05 }],
    extras: [],
    sizeUpcharges: [],
    active: true,
  },
];

let cachedPrices: Price[] | null = null;
const priceListeners = new Set<() => void>();

export function subscribePrices(listener: () => void) {
  priceListeners.add(listener);
  return () => priceListeners.delete(listener);
}

export function getPricesSnapshot(): Price[] {
  if (!cachedPrices) cachedPrices = loadPrices();
  return cachedPrices;
}

export function getPricesServerSnapshot(): Price[] {
  return SEED_PRICES;
}

export function replacePrices(next: Price[]) {
  cachedPrices = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const listener of priceListeners) listener();
}

export function loadPrices(): Price[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_PRICES;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return SEED_PRICES;
    // An empty list stays empty so a user who deleted every price is not handed the seeds again.
    return parsed.map(normalizePrice).filter((price): price is Price => price != null);
  } catch {
    return SEED_PRICES;
  }
}

// Lowest quantity is the base price shown in the table.
export function sortBreaks(breaks: QtyBreak[]): QtyBreak[] {
  return [...breaks].sort((a, b) => a.qty - b.qty);
}

export function baseBreak(price: Price): QtyBreak {
  return sortBreaks(price.breaks)[0] ?? { qty: 1, wholesale: 0, retail: 0 };
}

// GPM dollars = retail − wholesale.
export function gpmDollars(wholesale: number, retail: number): number {
  return fromCents(toCents(retail) - toCents(wholesale));
}

// GPM % of retail. Null when retail is 0 so the table can show a dash.
export function gpmPercent(wholesale: number, retail: number): number | null {
  const retailCents = toCents(retail);
  if (retailCents === 0) return null;
  return ((toCents(retail) - toCents(wholesale)) / retailCents) * 100;
}

// GPM % is the margin share of retail, so retail = wholesale / (1 − gpm/100).
// 100% and above cannot produce a retail price.
export function retailFromGpm(wholesale: number, gpmPercentValue: number): number | null {
  if (!Number.isFinite(wholesale) || wholesale < 0) return null;
  if (!Number.isFinite(gpmPercentValue) || gpmPercentValue >= 100) return null;
  const retail = wholesale / (1 - gpmPercentValue / 100);
  if (!Number.isFinite(retail) || retail < 0) return null;
  return fromCents(toCents(retail));
}

// Wholesale and retail overrides land on the lowest quantity break only.
// An increase moves every break and every extra, so the rest of the listing
// keeps the same relationship to the base price.
export function applyBulkEdit(price: Price, edit: BulkPriceEdit): Price {
  const sorted = sortBreaks(price.breaks);
  const baseQty = sorted[0]?.qty;
  let usedBase = false;
  const breaks = sorted.map((item) => {
    const isBase = !usedBase && item.qty === baseQty;
    if (isBase) usedBase = true;
    return { ...item, ...applyBreakMoney(item.wholesale, item.retail, edit, isBase) };
  });

  return {
    ...price,
    breaks,
    extras: price.extras.map((item) => ({
      ...item,
      ...applyBreakMoney(item.wholesale, item.retail, edit, false),
    })),
    sizeUpcharges: price.sizeUpcharges.map((item) => ({
      ...item,
      ...applyBreakMoney(item.wholesale, item.retail, edit, false),
    })),
    active: edit.active ?? price.active,
  };
}

export function formatGpmPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

export const PRICE_TEMPLATE_CSV = "Name,Wholesale,Retail\nTrane Brochure,2.40,3.10\n";

export function downloadPriceTemplate() {
  const file = new Blob([PRICE_TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "price-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export type PriceImport = {
  prices: Price[];
  skipped: number;
};

// Name, Wholesale, Retail. A header row is optional. Invalid rows are skipped.
// Imported rows are Print with a single quantity of 1.
export function parsePriceCsv(text: string): PriceImport {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let start = 0;
  if (lines.length > 0 && isHeader(splitCsvLine(lines[0]))) start = 1;

  const prices: Price[] = [];
  let skipped = 0;

  for (const line of lines.slice(start)) {
    const cells = splitCsvLine(line);
    const name = cells[0]?.trim() ?? "";
    const wholesale = parseMoney(cells[1] ?? "");
    const retail = parseMoney(cells[2] ?? "");
    if (!name || wholesale == null || retail == null) {
      skipped += 1;
      continue;
    }
    prices.push({
      id: crypto.randomUUID(),
      type: "print",
      name,
      sku: "",
      stakeholderId: 1,
      accountUnitId: null,
      specs: "",
      vendor: "",
      breaks: [{ qty: 1, wholesale, retail }],
      extras: [],
      sizeUpcharges: [],
      active: true,
    });
  }

  return { prices, skipped };
}

function applyBreakMoney(
  wholesale: number,
  retail: number,
  edit: BulkPriceEdit,
  isBase: boolean,
): { wholesale: number; retail: number } {
  const nextWholesale = isBase && edit.wholesale != null ? edit.wholesale : wholesale;
  const basisRetail = isBase && edit.retail != null ? edit.retail : retail;
  if (edit.increaseGpmPercent == null) {
    return { wholesale: nextWholesale, retail: basisRetail };
  }

  const gpmCents = toCents(basisRetail) - toCents(nextWholesale);
  const nextGpmCents = Math.round(gpmCents * (1 + edit.increaseGpmPercent / 100));
  return {
    wholesale: nextWholesale,
    retail: Math.max(0, fromCents(toCents(nextWholesale) + nextGpmCents)),
  };
}

// Older rows stored a single wholesale and retail. Those become Print at qty 1.
function normalizePrice(value: unknown): Price | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.name !== "string" || (typeof row.id !== "string" && typeof row.id !== "number")) {
    return null;
  }

  const breaks = Array.isArray(row.breaks)
    ? row.breaks.map(normalizeBreak).filter((item) => item != null)
    : [];

  if (breaks.length > 0) {
    const type = isPriceType(row.type) ? row.type : "print";
    return {
      id: String(row.id),
      type,
      name: row.name,
      sku: skuFromRow(row),
      stakeholderId: ownerFromRow(row),
      accountUnitId: parseAccountUnitId(row.accountUnitId),
      specs: typeof row.specs === "string" ? row.specs : "",
      vendor: typeof row.vendor === "string" ? row.vendor : "",
      breaks: sortBreaks(breaks),
      extras: normalizeExtras(row, type),
      sizeUpcharges: type === "apparel" ? normalizeSizes(row.sizeUpcharges) : [],
      active: row.active !== false,
    };
  }

  const wholesale = asMoney(row.wholesale);
  const retail = asMoney(row.retail);
  if (wholesale == null || retail == null) return null;
  return {
    id: String(row.id),
    type: "print",
    name: row.name,
    sku: skuFromRow(row),
    stakeholderId: ownerFromRow(row),
    accountUnitId: parseAccountUnitId(row.accountUnitId),
    specs: typeof row.specs === "string" ? row.specs : "",
    vendor: "",
    breaks: [{ qty: 1, wholesale, retail }],
    extras: [],
    sizeUpcharges: [],
    active: row.active !== false,
  };
}

// Sample rows saved before owners existed keep the seed owner. Anything else starts at Stakeholder 1.
const SEED_OWNERS: Record<string, number> = {
  "seed-brochure": 1,
  "seed-poster": 1,
  "seed-spec": 2,
};

// Sample rows saved before SKU existed. A stored string, even blank, is left alone.
const SEED_SKUS: Record<string, string> = {
  "seed-brochure": "BR-8PG",
  "seed-poster": "PS-2436",
  "seed-spec": "SS-SPEC",
};

function skuFromRow(row: Record<string, unknown>): string {
  if (typeof row.sku === "string") return row.sku;
  return SEED_SKUS[String(row.id)] ?? "";
}

function ownerFromRow(row: Record<string, unknown>): number {
  if (row.stakeholderId == null || row.stakeholderId === "") {
    return SEED_OWNERS[String(row.id)] ?? 1;
  }
  return parseStakeholderId(row.stakeholderId);
}

function normalizeBreak(value: unknown): QtyBreak | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const qty = typeof row.qty === "number" ? Math.round(row.qty) : null;
  const wholesale = asMoney(row.wholesale);
  const retail = asMoney(row.retail);
  if (qty == null || qty < 1 || wholesale == null || retail == null) return null;
  return { qty, wholesale, retail };
}

// New rows store extras[]. Older Promo and Apparel rows stored one setup and one run.
function normalizeExtras(row: Record<string, unknown>, type: PriceType): ExtraCharge[] {
  if (Array.isArray(row.extras)) {
    return row.extras.map(normalizeExtra).filter((item): item is ExtraCharge => item != null);
  }
  if (type !== "promo" && type !== "apparel") return [];
  const extras: ExtraCharge[] = [];
  const setup = normalizePair(row.setup);
  const run = normalizePair(row.run);
  if (setup) extras.push({ type: "setup", ...setup });
  if (run) extras.push({ type: "run", ...run });
  return extras;
}

function normalizeExtra(value: unknown): ExtraCharge | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!isExtraType(row.type)) return null;
  const pair = normalizePair(row);
  if (!pair) return null;
  return { type: row.type, ...pair };
}

function isExtraType(value: unknown): value is ExtraType {
  return typeof value === "string" && EXTRA_TYPES.includes(value as ExtraType);
}

function normalizePair(value: unknown): MoneyPair | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const wholesale = asMoney(row.wholesale);
  const retail = asMoney(row.retail);
  if (wholesale == null || retail == null) return null;
  return { wholesale, retail };
}

function normalizeSizes(value: unknown): SizeUpcharge[] {
  if (!Array.isArray(value)) return [];
  const bySize = new Map<ApparelSize, SizeUpcharge>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (!isApparelSize(row.size)) continue;
    const wholesale = asMoney(row.wholesale);
    const retail = asMoney(row.retail);
    if (wholesale == null || retail == null) continue;
    bySize.set(row.size, { size: row.size, wholesale, retail });
  }
  return APPAREL_SIZES.flatMap((size) => {
    const found = bySize.get(size);
    return found ? [found] : [];
  });
}

function isPriceType(value: unknown): value is PriceType {
  return typeof value === "string" && PRICE_TYPES.includes(value as PriceType);
}

function isApparelSize(value: unknown): value is ApparelSize {
  return typeof value === "string" && APPAREL_SIZES.includes(value as ApparelSize);
}

function asMoney(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return fromCents(toCents(value));
}

function isHeader(cells: string[]): boolean {
  const [name, wholesale, retail] = cells.map((cell) => cell.trim().toLowerCase());
  return name === "name" && wholesale === "wholesale" && retail === "retail";
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return fromCents(toCents(value));
}

import type { Brand } from "@/lib/brands";

// Sample on-hand stock until inventory has a database table.
// Reorder points, product notes, the production-order flag, and open reorder
// requests are saved in this browser.
// The production-order action opens a restock form. It stays navy until that order is completed or cancelled.
// Changing a reorder point can move a product between In Stock and Low Stock.
// Status rules, first match wins:
//   balance < 0  Backorder
//   balance = 0  Out of Stock
//   balance <= reorder point  Low Stock
//   otherwise  In Stock
// Avg/M is total usage divided by months since the live date. It is shown on hover
// over Total, along with YTD. YTD does not drive the average.
// Proj/M is normally balance divided by that average: months the current stock should last.
// While the reorder field is being edited, Proj/M uses the typed reorder point instead,
// so the number is how many months of stock remain at the moment you would reorder.

export type InventoryStatus = "in" | "backorder" | "low" | "out";

export const INVENTORY_STATUSES: { id: InventoryStatus; label: string; hint: string }[] = [
  { id: "in", label: "In Stock", hint: "Above the reorder point" },
  { id: "backorder", label: "Backorder", hint: "Balance is below zero" },
  { id: "low", label: "Low Stock", hint: "At or under the reorder point" },
  { id: "out", label: "Out of Stock", hint: "Balance is zero" },
];

// Live date stays on the record for Avg/M. It is not a table column.
type InventorySeed = {
  id: string;
  product: string;
  sku: string;
  stakeholderId: number;
  brand: Brand;
  liveOn: string;
  balance: number;
  reorder: number;
  totalUsage: number;
  ytdUsage: number;
};

// Status of an open production order. Completing or cancelling clears the order.
export const PRODUCTION_ORDER_STATUSES = ["in-progress", "in-production", "on-hold"] as const;

export type ProductionOrderStatus = (typeof PRODUCTION_ORDER_STATUSES)[number];

export const PRODUCTION_ORDER_STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  "in-progress": "In Progress",
  "in-production": "In Production",
  "on-hold": "On Hold",
};

// One open production order per product. The action stays navy until it is completed or cancelled.
export type InventoryReorder = {
  pvNumber: string;
  // Blank on the form stays null. A filled value is a whole number of at least 1.
  quantity: number | null;
  // YYYY-MM-DD from the date picker. Optional.
  estimatedCompletion: string;
  status: ProductionOrderStatus;
  createdAt: string;
};

// Latest completed production order. The reorder-point hover reads this.
export type CompletedProductionOrder = {
  quantity: number | null;
  completedAt: string;
};

// Notes, the production-order flag, and an open reorder are saved in this browser.
export type InventoryItem = InventorySeed & {
  notes: string;
  productionOrdered: boolean;
  openReorder: InventoryReorder | null;
  lastCompleted: CompletedProductionOrder | null;
};

export const SEED_INVENTORY: InventorySeed[] = [
  { id: "inv-brochure", product: "Trane Brochure", sku: "BR-8PG", stakeholderId: 1, brand: "Trane", liveOn: "2024-03-15", balance: 2400, reorder: 500, totalUsage: 18000, ytdUsage: 5400 },
  { id: "inv-poster", product: "Dealer Poster", sku: "PS-2436", stakeholderId: 1, brand: "Trane", liveOn: "2025-06-01", balance: 40, reorder: 80, totalUsage: 800, ytdUsage: 240 },
  { id: "inv-binder", product: "Spec Binder", sku: "SB-BIND", stakeholderId: 1, brand: "Trane", liveOn: "2023-01-10", balance: 900, reorder: 200, totalUsage: 7200, ytdUsage: 1600 },
  { id: "inv-spec", product: "Product Spec Sheet", sku: "SS-SPEC", stakeholderId: 2, brand: "American Standard", liveOn: "2023-06-01", balance: 0, reorder: 200, totalUsage: 9600, ytdUsage: 2100 },
  { id: "inv-card", product: "Counter Card", sku: "CC-TENT", stakeholderId: 2, brand: "American Standard", liveOn: "2024-11-01", balance: -120, reorder: 100, totalUsage: 3600, ytdUsage: 900 },
  { id: "inv-cling", product: "Window Cling", sku: "WC-CLING", stakeholderId: 2, brand: "American Standard", liveOn: "2025-02-01", balance: 180, reorder: 60, totalUsage: 900, ytdUsage: 400 },
  { id: "inv-banner", product: "Banner Stand", sku: "BN-STAND", stakeholderId: 3, brand: "RunTru", liveOn: "2025-04-01", balance: 8, reorder: 4, totalUsage: 48, ytdUsage: 18 },
  { id: "inv-folder", product: "Leave-Behind Folder", sku: "LF-FOLD", stakeholderId: 3, brand: "RunTru", liveOn: "2024-02-01", balance: 30, reorder: 50, totalUsage: 2400, ytdUsage: 700 },
  { id: "inv-sign", product: "Yard Sign", sku: "YS-SIGN", stakeholderId: 3, brand: "RunTru", liveOn: "2024-08-20", balance: 12, reorder: 25, totalUsage: 600, ytdUsage: 180 },
  { id: "inv-mailer", product: "Holiday Mailer", sku: "HM-MAIL", stakeholderId: 4, brand: "Ameristar", liveOn: "2022-09-01", balance: 0, reorder: 300, totalUsage: 15000, ytdUsage: 0 },
  { id: "inv-flyer", product: "Co-op Flyer", sku: "CF-COOP", stakeholderId: 4, brand: "Ameristar", liveOn: "2025-08-01", balance: -40, reorder: 150, totalUsage: 480, ytdUsage: 480 },
  { id: "inv-hanger", product: "Door Hanger", sku: "DH-HANG", stakeholderId: 4, brand: "Ameristar", liveOn: "2024-05-01", balance: 640, reorder: 100, totalUsage: 4800, ytdUsage: 1200 },
];

const STORAGE_KEY = "smart-inventory-reorders";
const NOTES_KEY = "smart-inventory-notes";
const ORDERS_KEY = "smart-inventory-orders";
const REORDER_REQUESTS_KEY = "smart-inventory-reorder-requests";
const COMPLETED_ORDERS_KEY = "smart-inventory-completed-orders";

let cachedItems: InventoryItem[] | null = null;
const itemListeners = new Set<() => void>();

export function subscribeInventory(listener: () => void) {
  itemListeners.add(listener);
  return () => itemListeners.delete(listener);
}

export function getInventorySnapshot(): InventoryItem[] {
  if (!cachedItems) cachedItems = loadInventory();
  return cachedItems;
}

// useSyncExternalStore requires a stable server snapshot. A new array each call loops.
const SERVER_INVENTORY: InventoryItem[] = SEED_INVENTORY.map((item) => ({
  ...item,
  notes: "",
  productionOrdered: false,
  openReorder: null,
  lastCompleted: null,
}));

export function getInventoryServerSnapshot(): InventoryItem[] {
  return SERVER_INVENTORY;
}

export function inventoryStatus(item: Pick<InventoryItem, "balance" | "reorder">): InventoryStatus {
  if (item.balance < 0) return "backorder";
  if (item.balance === 0) return "out";
  if (item.balance <= item.reorder) return "low";
  return "in";
}

export function parseInventoryStatus(value: string): InventoryStatus | "" {
  return INVENTORY_STATUSES.some((status) => status.id === value) ? (value as InventoryStatus) : "";
}

// Whole months since the product went live. At least 1 so a new item still has an average.
export function monthsSinceLive(liveOn: string, today = new Date()): number {
  const [year, month, day] = liveOn.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return 1;
  const months = (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month);
  const lived = today.getDate() < day ? months - 1 : months;
  return Math.max(1, lived);
}

export function averageMonthly(item: InventoryItem, today = new Date()): number {
  return item.totalUsage / monthsSinceLive(item.liveOn, today);
}

// Null when there is no usage yet, so the table can show a dash.
// units is the on-hand balance, or the reorder point while that field is being edited.
export function coverageMonths(units: number, average: number): number | null {
  if (average <= 0) return null;
  return units / average;
}

export function projectedMonths(item: InventoryItem, today = new Date()): number | null {
  return coverageMonths(item.balance, averageMonthly(item, today));
}

export function setInventoryReorder(id: string, reorder: number) {
  if (!Number.isInteger(reorder) || reorder < 0) return;
  const next = getInventorySnapshot().map((item) => (item.id === id ? { ...item, reorder } : item));
  cachedItems = next;
  const overrides: Record<string, number> = {};
  for (const item of next) {
    const seed = SEED_INVENTORY.find((row) => row.id === item.id);
    if (seed && seed.reorder !== item.reorder) overrides[item.id] = item.reorder;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  notifyInventory();
}

// Older on/off flag. The action button now follows an open production order instead.
export function setProductionOrdered(id: string, ordered: boolean) {
  const next = getInventorySnapshot().map((item) => (item.id === id ? { ...item, productionOrdered: ordered } : item));
  cachedItems = next;
  const flags: Record<string, true> = {};
  for (const item of next) {
    if (item.productionOrdered) flags[item.id] = true;
  }
  localStorage.setItem(ORDERS_KEY, JSON.stringify(flags));
  notifyInventory();
}

export function saveInventoryReorder(
  id: string,
  input: {
    pvNumber: string;
    quantity: number | null;
    estimatedCompletion: string;
    status: ProductionOrderStatus;
  },
): boolean {
  const estimatedCompletion = input.estimatedCompletion.trim();
  if (estimatedCompletion && !/^\d{4}-\d{2}-\d{2}$/.test(estimatedCompletion)) return false;
  if (input.quantity != null && (!Number.isInteger(input.quantity) || input.quantity < 1)) return false;
  if (!PRODUCTION_ORDER_STATUSES.includes(input.status)) return false;
  if (!SEED_INVENTORY.some((item) => item.id === id)) return false;

  const existing = getInventorySnapshot().find((item) => item.id === id)?.openReorder;
  const order: InventoryReorder = {
    pvNumber: input.pvNumber.trim(),
    quantity: input.quantity,
    estimatedCompletion,
    status: input.status,
    // Editing an open order keeps the original created time.
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  const next = getInventorySnapshot().map((item) => (item.id === id ? { ...item, openReorder: order } : item));
  cachedItems = next;
  writeOpenReorders(next);
  notifyInventory();
  return true;
}

// Completing keeps the qty and date for the reorder-point hover, then clears the open order.
export function completeInventoryReorder(id: string) {
  const current = getInventorySnapshot();
  const open = current.find((item) => item.id === id)?.openReorder;
  if (!open) return;
  const completed: CompletedProductionOrder = {
    quantity: open.quantity,
    completedAt: new Date().toISOString(),
  };
  const next = current.map((item) =>
    item.id === id ? { ...item, openReorder: null, lastCompleted: completed } : item,
  );
  cachedItems = next;
  writeOpenReorders(next);
  writeCompletedOrders(next);
  notifyInventory();
}

// Whole days since the last completed production order. Today is 0.
export function daysSinceCompleted(completedAt: string, today = new Date()): number {
  const then = new Date(completedAt);
  if (Number.isNaN(then.getTime())) return 0;
  const startToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const startThen = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate());
  return Math.max(0, Math.round((startToday - startThen) / 86_400_000));
}

// Cancelling clears the open request and does not update the previous reorder.
export function clearInventoryReorder(id: string) {
  const next = getInventorySnapshot().map((item) => (item.id === id ? { ...item, openReorder: null } : item));
  cachedItems = next;
  writeOpenReorders(next);
  notifyInventory();
}

export function setInventoryNotes(id: string, notes: string) {
  const text = notes.trim();
  const next = getInventorySnapshot().map((item) => (item.id === id ? { ...item, notes: text } : item));
  cachedItems = next;
  const saved: Record<string, string> = {};
  for (const item of next) {
    if (item.notes) saved[item.id] = item.notes;
  }
  localStorage.setItem(NOTES_KEY, JSON.stringify(saved));
  notifyInventory();
}

function notifyInventory() {
  for (const listener of itemListeners) listener();
}

function decorate(
  item: InventorySeed,
  notes: string,
  productionOrdered: boolean,
  openReorder: InventoryReorder | null,
  lastCompleted: CompletedProductionOrder | null,
): InventoryItem {
  return { ...item, notes, productionOrdered, openReorder, lastCompleted };
}

function loadInventory(): InventoryItem[] {
  const overrides = readOverrides();
  const notes = readNotes();
  const orders = readOrders();
  const reorders = readReorderRequests();
  const completed = readCompletedOrders();
  return SEED_INVENTORY.map((item) => {
    const reorder = overrides[item.id];
    const row = reorder == null ? item : { ...item, reorder };
    return decorate(row, notes[item.id] ?? "", orders.has(item.id), reorders[item.id] ?? null, completed[item.id] ?? null);
  });
}

function writeCompletedOrders(items: InventoryItem[]) {
  const saved: Record<string, CompletedProductionOrder> = {};
  for (const item of items) {
    if (item.lastCompleted) saved[item.id] = item.lastCompleted;
  }
  localStorage.setItem(COMPLETED_ORDERS_KEY, JSON.stringify(saved));
}

function readCompletedOrders(): Record<string, CompletedProductionOrder> {
  const parsed = readRecord(COMPLETED_ORDERS_KEY);
  const completed: Record<string, CompletedProductionOrder> = {};
  for (const [id, value] of Object.entries(parsed)) {
    const order = normalizeCompleted(value);
    if (order && SEED_INVENTORY.some((item) => item.id === id)) completed[id] = order;
  }
  return completed;
}

function normalizeCompleted(value: unknown): CompletedProductionOrder | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const quantity = optionalQuantity(row.quantity);
  const completedAt = typeof row.completedAt === "string" ? row.completedAt : "";
  if (!completedAt || Number.isNaN(new Date(completedAt).getTime())) return null;
  return { quantity, completedAt };
}

function writeOpenReorders(items: InventoryItem[]) {
  const saved: Record<string, InventoryReorder> = {};
  for (const item of items) {
    if (item.openReorder) saved[item.id] = item.openReorder;
  }
  localStorage.setItem(REORDER_REQUESTS_KEY, JSON.stringify(saved));
}

function readReorderRequests(): Record<string, InventoryReorder> {
  const parsed = readRecord(REORDER_REQUESTS_KEY);
  const requests: Record<string, InventoryReorder> = {};
  for (const [id, value] of Object.entries(parsed)) {
    const order = normalizeReorder(value);
    if (order && SEED_INVENTORY.some((item) => item.id === id)) requests[id] = order;
  }
  return requests;
}

function normalizeReorder(value: unknown): InventoryReorder | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const pvNumber = typeof row.pvNumber === "string" ? row.pvNumber.trim() : "";
  const quantity = optionalQuantity(row.quantity);
  const estimatedCompletion =
    typeof row.estimatedCompletion === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.estimatedCompletion)
      ? row.estimatedCompletion
      : "";
  const createdAt = typeof row.createdAt === "string" ? row.createdAt : "";
  const status = PRODUCTION_ORDER_STATUSES.includes(row.status as ProductionOrderStatus)
    ? (row.status as ProductionOrderStatus)
    : "in-progress";
  if (!createdAt) return null;
  return { pvNumber, quantity, estimatedCompletion, status, createdAt };
}

function optionalQuantity(value: unknown): number | null {
  if (value == null || value === "") return null;
  const quantity = typeof value === "number" ? value : Number(value);
  return Number.isInteger(quantity) && quantity >= 1 ? quantity : null;
}

function readOverrides(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const overrides: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed)) {
      const reorder = typeof value === "number" ? value : Number(value);
      if (SEED_INVENTORY.some((item) => item.id === id) && Number.isInteger(reorder) && reorder >= 0) {
        overrides[id] = reorder;
      }
    }
    return overrides;
  } catch {
    return {};
  }
}

function readNotes(): Record<string, string> {
  const parsed = readRecord(NOTES_KEY);
  const notes: Record<string, string> = {};
  for (const [id, value] of Object.entries(parsed)) {
    if (typeof value === "string" && value.trim() && SEED_INVENTORY.some((item) => item.id === id)) {
      notes[id] = value.trim();
    }
  }
  return notes;
}

function readOrders(): Set<string> {
  const parsed = readRecord(ORDERS_KEY);
  return new Set(Object.keys(parsed).filter((id) => parsed[id] === true && SEED_INVENTORY.some((item) => item.id === id)));
}

function readRecord(key: string): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

import type { Brand } from "@/lib/brands";

// Sample on-hand stock until inventory has a database table.
// Reorder points, product notes, and the production-order flag are saved in this browser.
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

// Notes and the production-order flag are saved in this browser, like the reorder point.
export type InventoryItem = InventorySeed & {
  notes: string;
  productionOrdered: boolean;
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

export function getInventoryServerSnapshot(): InventoryItem[] {
  return SEED_INVENTORY.map((item) => decorate(item, "", false));
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

// Stays on until clicked again, so a low or out row can show that restock was already ordered.
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

function decorate(item: InventorySeed, notes: string, productionOrdered: boolean): InventoryItem {
  return { ...item, notes, productionOrdered };
}

function loadInventory(): InventoryItem[] {
  const overrides = readOverrides();
  const notes = readNotes();
  const orders = readOrders();
  return SEED_INVENTORY.map((item) => {
    const reorder = overrides[item.id];
    const row = reorder == null ? item : { ...item, reorder };
    return decorate(row, notes[item.id] ?? "", orders.has(item.id));
  });
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

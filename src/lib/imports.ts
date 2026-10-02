import { addAccountUnit } from "@/lib/account-units";
import { parseBrand } from "@/lib/brands";
import { getPricesSnapshot, parsePriceCsv, PRICE_TEMPLATE_CSV, replacePrices } from "@/lib/prices";
import { STAKEHOLDERS } from "@/lib/stakeholders";

// First-pass import files. CSV so the upload can be read without another package.
// Excel opens these templates. Price rows use the same columns as the price-form import.
// Account-unit rows are added to the list in the hamburger menu.
// Order rows are checked only. The database is still read-only, so they are not saved yet.

export type ImportId = "orders" | "prices" | "units";

export const IMPORTS: { id: ImportId; label: string; detail: string }[] = [
  {
    id: "orders",
    label: "Orders",
    detail: "Order, date, product, SKU, stakeholder, brand, quantity, and unit prices.",
  },
  {
    id: "prices",
    label: "Price tables",
    detail: "Name, wholesale, and retail. Added as Print at quantity 1.",
  },
  {
    id: "units",
    label: "Account units",
    detail: "Name, stakeholder, and margin. Added to Account Units.",
  },
];

const ORDER_TEMPLATE =
  "Order,Date,Product,SKU,Stakeholder,Brand,Qty,Print cost,Wholesale,Retail,Fee rate\nORD-1000,2026-10-01,Sample brochure,SM-001,Stakeholder 1,Trane,10,1.00,2.00,3.00,0.03\n";

const UNIT_TEMPLATE = "Name,Stakeholder,Margin\nSample unit,Stakeholder 1,30\n";

export function downloadImportTemplate(id: ImportId) {
  const file = new Blob([templateCsv(id)], { type: "text/csv" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = templateName(id);
  link.click();
  URL.revokeObjectURL(url);
}

// Reads one CSV. Prices and account units are saved. Orders are counted only.
export function applyImport(id: ImportId, text: string): string {
  if (id === "prices") return applyPrices(text);
  if (id === "units") return applyUnits(text);
  return checkOrders(text);
}

function templateCsv(id: ImportId): string {
  if (id === "prices") return PRICE_TEMPLATE_CSV;
  if (id === "units") return UNIT_TEMPLATE;
  return ORDER_TEMPLATE;
}

function templateName(id: ImportId): string {
  if (id === "prices") return "price-import-template.csv";
  if (id === "units") return "account-units-import-template.csv";
  return "orders-import-template.csv";
}

function applyPrices(text: string): string {
  const result = parsePriceCsv(text);
  if (result.prices.length > 0) {
    replacePrices([...getPricesSnapshot(), ...result.prices]);
  }
  return resultNote("Added", result.prices.length, "price", result.skipped);
}

function applyUnits(text: string): string {
  const rows = dataRows(text, "name");
  let added = 0;
  let skipped = 0;

  for (const cells of rows) {
    const name = cells[0]?.trim() ?? "";
    const stakeholderId = stakeholderIdFromCell(cells[1] ?? "");
    const margin = parseMargin(cells[2] ?? "");
    if (!name || stakeholderId == null || margin == null) {
      skipped += 1;
      continue;
    }
    const created = addAccountUnit({ name, stakeholderId, marginPercent: margin });
    if (created) added += 1;
    else skipped += 1;
  }

  return resultNote("Added", added, "account unit", skipped);
}

function checkOrders(text: string): string {
  const rows = dataRows(text, "order");
  let checked = 0;
  let skipped = 0;

  for (const cells of rows) {
    if (orderRow(cells)) checked += 1;
    else skipped += 1;
  }

  const base = resultNote("Checked", checked, "order", skipped);
  return `${base} Saving orders to the dashboard comes next.`;
}

function orderRow(cells: string[]): boolean {
  const order = cells[0]?.trim() ?? "";
  const date = cells[1]?.trim() ?? "";
  const product = cells[2]?.trim() ?? "";
  const sku = cells[3]?.trim() ?? "";
  const stakeholderId = stakeholderIdFromCell(cells[4] ?? "");
  const brand = parseBrand(cells[5]?.trim() ?? "");
  const qty = Number(cells[6]?.replace(/,/g, "").trim());
  const printCost = parseMoney(cells[7] ?? "");
  const wholesale = parseMoney(cells[8] ?? "");
  const retail = parseMoney(cells[9] ?? "");
  const fee = parseFeeRate(cells[10] ?? "");
  if (!order || !isIsoDate(date) || !product || !sku || stakeholderId == null || !brand) return false;
  if (!Number.isInteger(qty) || qty < 1) return false;
  if (printCost == null || wholesale == null || retail == null || fee == null) return false;
  return retail >= wholesale;
}

function dataRows(text: string, headerFirst: string): string[][] {
  const rows = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(splitCsvLine);
  if (rows.length === 0) return [];
  const first = rows[0][0]?.trim().toLowerCase();
  return first === headerFirst ? rows.slice(1) : rows;
}

function stakeholderIdFromCell(value: string): number | null {
  const trimmed = value.trim();
  const byName = STAKEHOLDERS.find((item) => item.name.toLowerCase() === trimmed.toLowerCase());
  if (byName) return byName.id;
  const id = Number(trimmed);
  return STAKEHOLDERS.some((item) => item.id === id) ? id : null;
}

function parseMargin(raw: string): number | null {
  const value = Number(raw.replace("%", "").trim());
  if (!Number.isFinite(value) || value < 0 || value >= 100) return null;
  return value;
}

function parseMoney(raw: string): number | null {
  const value = Number(raw.replace(/[$,]/g, "").trim());
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function parseFeeRate(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return 0.03;
  const value = Number(trimmed.replace("%", ""));
  if (!Number.isFinite(value) || value < 0) return null;
  const rate = value > 1 ? value / 100 : value;
  return rate < 1 ? rate : null;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function resultNote(verb: string, count: number, noun: string, skipped: number): string {
  if (count === 0 && skipped === 0) return "That file has no data rows.";
  const added = `${verb} ${count} ${count === 1 ? noun : `${noun}s`}.`;
  if (skipped === 0) return added;
  const rows = skipped === 1 ? "1 row" : `${skipped} rows`;
  return `${added} Skipped ${rows}.`;
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

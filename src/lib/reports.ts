import type { ExcelColumn, ExcelSheet } from "@/lib/excel";
import { fromCents, toCents } from "@/lib/money";
import { baseBreak, gpmDollars, gpmPercent, PRICE_TYPE_LABELS, type Price } from "@/lib/prices";
import { stakeholderName } from "@/lib/stakeholders";
import { hoursDecimal, timeLines, type Project } from "@/lib/time-clock";
import type { OrderLineSummary } from "@/lib/types";

// First-pass columns. They follow the columns already on each screen.
// Change these lists when the exact report layout is decided.
// Prices use the lowest quantity break only. Extra breaks, setup, run, and size upcharges are not columns yet.
// Orders are every line, not the dashboard page or its filters. Stakeholder is included so a full export still shows the owner.
// Hours is one line per person / day / project so billing can see who worked where.

export type ReportId = "prices" | "orders" | "time";

export const REPORTS: { id: ReportId; label: string; detail: string }[] = [
  {
    id: "prices",
    label: "Products",
    detail: "Name, owner, type, wholesale, retail, GPM, and active.",
  },
  {
    id: "orders",
    label: "Orders",
    detail: "Date, order, product, stakeholder, and the dollar columns from the dashboard.",
  },
  {
    id: "time",
    label: "Hours",
    detail: "Person, date, project, and decimal hours — one line per person per day per project.",
  },
];

const priceColumns: ExcelColumn[] = [
  { header: "Name", kind: "text" },
  { header: "Owner", kind: "text" },
  { header: "Type", kind: "text" },
  { header: "Wholesale", kind: "money" },
  { header: "Retail", kind: "money" },
  { header: "GPM", kind: "money" },
  { header: "GPM %", kind: "percent" },
  { header: "Active", kind: "text" },
];

const orderColumns: ExcelColumn[] = [
  { header: "Date", kind: "text" },
  { header: "Order", kind: "text" },
  { header: "Product", kind: "text" },
  { header: "Stakeholder", kind: "text" },
  { header: "SKU", kind: "text" },
  { header: "Qty", kind: "count" },
  { header: "Print cost", kind: "money" },
  { header: "Wholesale", kind: "money" },
  { header: "Retail", kind: "money" },
  { header: "Gross Smart$", kind: "money" },
  { header: "Fee", kind: "money" },
  { header: "Net Smart$", kind: "money" },
];

const timeColumns: ExcelColumn[] = [
  { header: "Person", kind: "text" },
  { header: "Date", kind: "text" },
  { header: "Project", kind: "text" },
  { header: "Hours", kind: "number" },
];

export function priceReport(prices: Price[]): ExcelSheet {
  return {
    name: "Products",
    columns: priceColumns,
    rows: prices.map((price) => {
      const base = baseBreak(price);
      const percent = gpmPercent(base.wholesale, base.retail);
      return [
        price.name,
        stakeholderName(price.stakeholderId),
        PRICE_TYPE_LABELS[price.type],
        money(base.wholesale),
        money(base.retail),
        money(gpmDollars(base.wholesale, base.retail)),
        percent == null ? null : Math.round(percent * 10) / 10,
        price.active ? "Yes" : "No",
      ];
    }),
  };
}

export function orderReport(lines: OrderLineSummary[]): ExcelSheet {
  return {
    name: "Orders",
    columns: orderColumns,
    rows: lines.map((line) => [
      line.ordered_on,
      line.order_number,
      line.product_name,
      line.stakeholder_name,
      line.sku,
      line.quantity,
      money(line.print_cost_total),
      money(line.wholesale_total),
      money(line.retail_total),
      money(line.gross_smart),
      money(line.fee_amount),
      money(line.net_smart),
    ]),
  };
}

export function timeReport(projects: Project[], now: number): ExcelSheet {
  return {
    name: "Hours",
    columns: timeColumns,
    rows: timeLines(projects, now).map((line) => [
      line.person,
      line.date,
      line.project,
      hoursDecimal(line.ms),
    ]),
  };
}

export function reportFilename(id: ReportId, now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const slug = id === "prices" ? "price-tables" : id === "orders" ? "orders" : "time-clock";
  return `${slug}-${year}-${month}-${day}.xlsx`;
}

function money(amount: number): number {
  return fromCents(toCents(amount));
}

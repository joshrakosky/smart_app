import type { Brand } from "@/lib/brands";
import { feeCents, fromCents, toCents } from "@/lib/money";
import type { OrderLineSummary, StakeholderBudget } from "@/lib/types";

// Mirrors supabase/migrations/20261001021802_seed_test_orders.sql.
// Used only when Supabase keys are not set yet, so the landing page can be reviewed.

type DemoStakeholder = { id: number; name: string };
type DemoProduct = { id: number; sku: string; name: string; stakeholderId: number; brand: Brand };
type DemoOrder = {
  id: number;
  orderNumber: string;
  orderedOn: string;
  productId: number;
  quantity: number;
  unitPrintCost: number;
  unitWholesale: number;
  unitRetail: number;
  feeRate: number;
};

const stakeholders: DemoStakeholder[] = [
  { id: 1, name: "Stakeholder 1" },
  { id: 2, name: "Stakeholder 2" },
  { id: 3, name: "Stakeholder 3" },
  { id: 4, name: "Stakeholder 4" },
];

const products: DemoProduct[] = [
  { id: 1, sku: "BR-8PG", name: "Trane Brochure", stakeholderId: 1, brand: "Trane" },
  { id: 2, sku: "PS-2436", name: "Dealer Poster", stakeholderId: 1, brand: "Trane" },
  { id: 3, sku: "SS-SPEC", name: "Product Spec Sheet", stakeholderId: 2, brand: "American Standard" },
  { id: 4, sku: "CC-TENT", name: "Counter Card", stakeholderId: 2, brand: "American Standard" },
  { id: 5, sku: "BN-STAND", name: "Banner Stand", stakeholderId: 3, brand: "RunTru" },
  { id: 6, sku: "LF-FOLD", name: "Leave-Behind Folder", stakeholderId: 3, brand: "RunTru" },
  { id: 7, sku: "HM-MAIL", name: "Holiday Mailer", stakeholderId: 4, brand: "Ameristar" },
  { id: 8, sku: "CF-COOP", name: "Co-op Flyer", stakeholderId: 4, brand: "Ameristar" },
];

const orders: DemoOrder[] = [
  { id: 1, orderNumber: "ORD-1041", orderedOn: "2026-09-02", productId: 1, quantity: 500, unitPrintCost: 1.2, unitWholesale: 2.4, unitRetail: 3.1, feeRate: 0.03 },
  { id: 2, orderNumber: "ORD-1041", orderedOn: "2026-09-03", productId: 2, quantity: 40, unitPrintCost: 4.5, unitWholesale: 8, unitRetail: 10.5, feeRate: 0.03 },
  { id: 3, orderNumber: "ORD-1048", orderedOn: "2026-09-05", productId: 3, quantity: 1000, unitPrintCost: 0.35, unitWholesale: 0.75, unitRetail: 1.05, feeRate: 0.03 },
  { id: 4, orderNumber: "ORD-1048", orderedOn: "2026-09-05", productId: 4, quantity: 250, unitPrintCost: 0.8, unitWholesale: 1.6, unitRetail: 2.25, feeRate: 0.03 },
  { id: 5, orderNumber: "ORD-1055", orderedOn: "2026-09-08", productId: 5, quantity: 6, unitPrintCost: 28, unitWholesale: 45, unitRetail: 62, feeRate: 0.03 },
  { id: 6, orderNumber: "ORD-1055", orderedOn: "2026-09-09", productId: 6, quantity: 300, unitPrintCost: 1.1, unitWholesale: 2.2, unitRetail: 3, feeRate: 0.03 },
  { id: 7, orderNumber: "ORD-1062", orderedOn: "2026-09-11", productId: 7, quantity: 800, unitPrintCost: 0.55, unitWholesale: 1.15, unitRetail: 1.7, feeRate: 0.03 },
  { id: 8, orderNumber: "ORD-1062", orderedOn: "2026-09-12", productId: 8, quantity: 600, unitPrintCost: 0.4, unitWholesale: 0.9, unitRetail: 1.3, feeRate: 0.03 },
  { id: 9, orderNumber: "ORD-1070", orderedOn: "2026-09-15", productId: 1, quantity: 200, unitPrintCost: 1.2, unitWholesale: 2.4, unitRetail: 3.1, feeRate: 0.03 },
  { id: 10, orderNumber: "ORD-1074", orderedOn: "2026-09-16", productId: 3, quantity: 400, unitPrintCost: 0.35, unitWholesale: 0.75, unitRetail: 1.05, feeRate: 0.03 },
  { id: 11, orderNumber: "ORD-1081", orderedOn: "2026-09-18", productId: 5, quantity: 2, unitPrintCost: 28, unitWholesale: 45, unitRetail: 62, feeRate: 0.03 },
  { id: 12, orderNumber: "ORD-1088", orderedOn: "2026-09-19", productId: 7, quantity: 250, unitPrintCost: 0.55, unitWholesale: 1.15, unitRetail: 1.7, feeRate: 0.03 },
  { id: 13, orderNumber: "ORD-1093", orderedOn: "2026-09-22", productId: 2, quantity: 15, unitPrintCost: 4.5, unitWholesale: 8, unitRetail: 10.5, feeRate: 0.03 },
  { id: 14, orderNumber: "ORD-1099", orderedOn: "2026-09-24", productId: 6, quantity: 120, unitPrintCost: 1.1, unitWholesale: 2.2, unitRetail: 3, feeRate: 0.03 },
  { id: 15, orderNumber: "ORD-1104", orderedOn: "2026-09-26", productId: 4, quantity: 100, unitPrintCost: 0.8, unitWholesale: 1.6, unitRetail: 2.25, feeRate: 0.03 },
];

function summarize(order: DemoOrder): OrderLineSummary {
  const product = products.find((item) => item.id === order.productId);
  const stakeholder = stakeholders.find((item) => item.id === product?.stakeholderId);
  if (!product || !stakeholder) {
    throw new Error(`Sample order ${order.id} is missing its product owner.`);
  }

  const printCents = toCents(order.unitPrintCost) * order.quantity;
  const wholesaleCents = toCents(order.unitWholesale) * order.quantity;
  const retailCents = toCents(order.unitRetail) * order.quantity;
  const grossCents = retailCents - wholesaleCents;
  const fee = feeCents(retailCents, order.feeRate);

  return {
    id: order.id,
    order_number: order.orderNumber,
    ordered_on: order.orderedOn,
    quantity: order.quantity,
    sku: product.sku,
    product_name: product.name,
    stakeholder_id: stakeholder.id,
    stakeholder_name: stakeholder.name,
    brand: product.brand,
    unit_print_cost: order.unitPrintCost,
    unit_wholesale: order.unitWholesale,
    unit_retail: order.unitRetail,
    fee_rate: order.feeRate,
    print_cost_total: fromCents(printCents),
    wholesale_total: fromCents(wholesaleCents),
    retail_total: fromCents(retailCents),
    gross_smart: fromCents(grossCents),
    fee_amount: fromCents(fee),
    net_smart: fromCents(grossCents - fee),
  };
}

export function getDemoDashboard(): {
  lines: OrderLineSummary[];
  budgets: StakeholderBudget[];
} {
  const lines = orders
    .map(summarize)
    .sort((a, b) => b.ordered_on.localeCompare(a.ordered_on) || b.id - a.id);

  const budgets = stakeholders.map((stakeholder) => {
    const netCents = lines
      .filter((line) => line.stakeholder_id === stakeholder.id)
      .reduce((total, line) => total + toCents(line.net_smart), 0);
    const net = fromCents(netCents);
    return {
      stakeholder_id: stakeholder.id,
      stakeholder_name: stakeholder.name,
      net_allocated: net,
      spent: 0,
      available: net,
    };
  });

  return { lines, budgets };
}

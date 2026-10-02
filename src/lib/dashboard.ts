import { parseBrand } from "@/lib/brands";
import { getDemoDashboard } from "@/lib/demo-data";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import type { OrderLineSummary, StakeholderBudget } from "@/lib/types";

export type DashboardSource = "supabase" | "demo";

export type DashboardResult =
  | {
      ok: true;
      source: DashboardSource;
      lines: OrderLineSummary[];
      budgets: StakeholderBudget[];
    }
  | {
      ok: false;
      message: string;
    };

const lineColumns =
  "id, order_number, ordered_on, quantity, sku, product_name, stakeholder_id, stakeholder_name, unit_print_cost, unit_wholesale, unit_retail, fee_rate, print_cost_total, wholesale_total, retail_total, gross_smart, fee_amount, net_smart";

const budgetColumns =
  "stakeholder_id, stakeholder_name, net_allocated, spent, available";

function asNumber(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function mapLine(row: Record<string, unknown>): OrderLineSummary {
  return {
    id: asNumber(row.id),
    order_number: String(row.order_number),
    ordered_on: String(row.ordered_on).slice(0, 10),
    quantity: asNumber(row.quantity),
    sku: String(row.sku),
    product_name: String(row.product_name),
    stakeholder_id: asNumber(row.stakeholder_id),
    stakeholder_name: String(row.stakeholder_name),
    // The summary view does not have brand yet. Unknown rows stay out of a brand filter.
    brand: typeof row.brand === "string" ? parseBrand(row.brand) : "",
    unit_print_cost: asNumber(row.unit_print_cost),
    unit_wholesale: asNumber(row.unit_wholesale),
    unit_retail: asNumber(row.unit_retail),
    fee_rate: asNumber(row.fee_rate),
    print_cost_total: asNumber(row.print_cost_total),
    wholesale_total: asNumber(row.wholesale_total),
    retail_total: asNumber(row.retail_total),
    gross_smart: asNumber(row.gross_smart),
    fee_amount: asNumber(row.fee_amount),
    net_smart: asNumber(row.net_smart),
  };
}

function mapBudget(row: Record<string, unknown>): StakeholderBudget {
  return {
    stakeholder_id: asNumber(row.stakeholder_id),
    stakeholder_name: String(row.stakeholder_name),
    net_allocated: asNumber(row.net_allocated),
    spent: asNumber(row.spent),
    available: asNumber(row.available),
  };
}

// Reads the summary views. Falls back to the checked-in sample only when
// the env placeholders are still empty.
export async function getDashboard(): Promise<DashboardResult> {
  if (!isSupabaseConfigured()) {
    const demo = getDemoDashboard();
    return { ok: true, source: "demo", ...demo };
  }

  const supabase = createSupabaseServerClient();
  const [linesResult, budgetsResult] = await Promise.all([
    supabase
      .from("order_line_summary")
      .select(lineColumns)
      .order("ordered_on", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("stakeholder_budgets")
      .select(budgetColumns)
      .order("stakeholder_id", { ascending: true }),
  ]);

  if (linesResult.error || budgetsResult.error) {
    const detail = linesResult.error?.message ?? budgetsResult.error?.message;
    return {
      ok: false,
      message: `Could not read Smart$ from Supabase. Confirm the URL and anon key in .env.local, and run the SQL files in supabase/migrations. ${detail ?? ""}`.trim(),
    };
  }

  return {
    ok: true,
    source: "supabase",
    lines: (linesResult.data ?? []).map((row) =>
      mapLine(row as Record<string, unknown>),
    ),
    budgets: (budgetsResult.data ?? []).map((row) =>
      mapBudget(row as Record<string, unknown>),
    ),
  };
}

// Row shape of public.order_line_summary. Dollar fields are already extended.
export type OrderLineSummary = {
  id: number;
  order_number: string;
  ordered_on: string;
  quantity: number;
  sku: string;
  product_name: string;
  stakeholder_id: number;
  stakeholder_name: string;
  // Empty until the database view carries a brand. Sample orders always have one.
  brand: string;
  unit_print_cost: number;
  unit_wholesale: number;
  unit_retail: number;
  fee_rate: number;
  print_cost_total: number;
  wholesale_total: number;
  retail_total: number;
  gross_smart: number;
  fee_amount: number;
  net_smart: number;
};

// Row shape of public.stakeholder_budgets.
// available equals net_allocated while spent is still zero.
export type StakeholderBudget = {
  stakeholder_id: number;
  stakeholder_name: string;
  net_allocated: number;
  spent: number;
  available: number;
};

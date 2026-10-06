import Link from "next/link";
import { BrandFilter } from "@/components/brand-filter";
import { DateRangeFilter } from "@/components/date-range-filter";
import { OrderSearch } from "@/components/order-search";
import { PageHeader } from "@/components/page-header";
import { StakeholderFilter } from "@/components/stakeholder-filter";
import type { Brand } from "@/lib/brands";
import { dashboardHref } from "@/lib/dashboard-query";
import { formatMoney, formatSlashDate } from "@/lib/money";
import type { OrderLineSummary, StakeholderBudget } from "@/lib/types";

type DashboardProps = {
  lines: OrderLineSummary[];
  // Full filtered totals. These stay put when the orders table changes page.
  totals: {
    wholesale: number;
    retail: number;
    gross: number;
    fees: number;
    net: number;
  };
  stakeholders: StakeholderBudget[];
  selectedId: number | null;
  brand: Brand | "";
  query: string;
  from: string;
  to: string;
  page: number;
  pageCount: number;
  totalLines: number;
  rangeStart: number;
  rangeEnd: number;
};

// Borders sit on the cells. border-separate ignores a border on the row, which is why the lines disappeared.
const orderHeaderCell =
  "sticky top-0 z-10 whitespace-nowrap border-r border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-medium last:border-r-0";
const orderCell = "border-r border-b border-slate-200 px-4 py-2.5 last:border-r-0";

export function Dashboard({
  lines,
  totals,
  stakeholders,
  selectedId,
  brand,
  query,
  from,
  to,
  page,
  pageCount,
  totalLines,
  rangeStart,
  rangeEnd,
}: DashboardProps) {
  const kpis = [
    { label: "Wholesale spend", hint: "What was paid for these orders", value: totals.wholesale },
    { label: "Retail total", hint: "What distributors were charged", value: totals.retail },
    { label: "Gross Smart$", hint: "Retail minus wholesale", value: totals.gross },
    { label: "Fees", hint: "Card fee, 3% of retail", value: totals.fees },
    { label: "Net Smart$", hint: "Allocated to the product owner", value: totals.net },
  ];

  return (
    <div className="min-h-full bg-slate-100 text-slate-900">
      <PageHeader title="Smart$" />

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        {/* Same five columns as the KPI cards so each filter sits on the card under it. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <OrderSearch stakeholderId={selectedId} brand={brand} query={query} from={from} to={to} />
          <StakeholderFilter
            selectedId={selectedId}
            stakeholders={stakeholders}
            brand={brand}
            query={query}
            from={from}
            to={to}
          />
          <BrandFilter brand={brand} stakeholderId={selectedId} query={query} from={from} to={to} />
          <DateRangeFilter stakeholderId={selectedId} brand={brand} query={query} from={from} to={to} />
        </div>

        <section aria-label="Totals" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((kpi) => (
            <article key={kpi.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <h2 className="text-sm font-medium text-slate-600">{kpi.label}</h2>
              <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{formatMoney(kpi.value)}</p>
              <p className="mt-1 text-xs text-slate-500">{kpi.hint}</p>
            </article>
          ))}
        </section>

        <section aria-label="Order lines" className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold">Orders</h2>
          </div>
          {/* Own scroll box so the header can stick. overflow on a parent would block that. */}
          {/* Fixed height so a short filter does not collapse the orders box. */}
          <div id="orders-scroll" className="h-[416px] overflow-auto">
            <table className="w-full min-w-[64rem] border-separate border-spacing-0 text-center text-sm">
              <thead className="text-slate-600">
                <tr>
                  <th className={orderHeaderCell}>Date</th>
                  <th className={orderHeaderCell}>Order</th>
                  <th className={orderHeaderCell}>Product</th>
                  <th className={orderHeaderCell}>SKU</th>
                  <th className={orderHeaderCell}>Qty</th>
                  <th className={orderHeaderCell}>Wholesale</th>
                  <th className={orderHeaderCell}>Retail</th>
                  <th className={orderHeaderCell}>Gross Smart$</th>
                  <th className={orderHeaderCell}>Fee</th>
                  <th className={orderHeaderCell}>Net Smart$</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={10}>
                      No orders match these filters.
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr key={line.id} className="even:bg-slate-100">
                      <td className={`${orderCell} whitespace-nowrap tabular-nums`}>{formatSlashDate(line.ordered_on)}</td>
                      <td className={`${orderCell} whitespace-nowrap`}>{line.order_number}</td>
                      <td className={orderCell}>{line.product_name}</td>
                      <td className={`${orderCell} whitespace-nowrap`}>{line.sku}</td>
                      <td className={`${orderCell} tabular-nums`}>{line.quantity.toLocaleString("en-US")}</td>
                      <td className={`${orderCell} tabular-nums`}>{formatMoney(line.wholesale_total)}</td>
                      <td className={`${orderCell} tabular-nums`}>{formatMoney(line.retail_total)}</td>
                      <td className={`${orderCell} tabular-nums`}>{formatMoney(line.gross_smart)}</td>
                      <td className={`${orderCell} tabular-nums`}>{formatMoney(line.fee_amount)}</td>
                      <td className={`${orderCell} font-medium tabular-nums`}>{formatMoney(line.net_smart)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalLines > 0 ? (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Showing {rangeStart}–{rangeEnd} of {totalLines}
              </p>
              <div className="flex items-center gap-2">
                <PageLink
                  href={dashboardHref({ stakeholderId: selectedId, brand, query, from, to, page: page - 1 })}
                  disabled={page <= 1}
                >
                  Previous
                </PageLink>
                <p className="min-w-24 text-center text-sm text-slate-600">
                  Page {page} of {pageCount}
                </p>
                <PageLink
                  href={dashboardHref({ stakeholderId: selectedId, brand, query, from, to, page: page + 1 })}
                  disabled={page >= pageCount}
                >
                  Next
                </PageLink>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: string;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm text-slate-400">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="hover-raise inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

export function DashboardError({ message }: { message: string }) {
  return (
    <div className="min-h-full bg-slate-100 px-4 py-16 text-slate-900">
      <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Smart$ could not load</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">{message}</p>
      </div>
    </div>
  );
}

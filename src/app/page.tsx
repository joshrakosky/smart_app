import { Dashboard, DashboardError } from "@/components/dashboard";
import { parseBrand } from "@/lib/brands";
import { getDashboard } from "@/lib/dashboard";
import { parseIsoDate } from "@/lib/dashboard-query";
import { sumDollars } from "@/lib/money";

// Ten rows keeps the sample set on two pages without hiding the totals above.
const PAGE_SIZE = 10;

// Stakeholder filter and page are query params so the KPI row, budgets, and table stay in step.
export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const requested =
    typeof searchParams.stakeholder === "string" ? searchParams.stakeholder : "";
  const requestedPage = parsePage(
    typeof searchParams.page === "string" ? searchParams.page : "",
  );
  const query = typeof searchParams.q === "string" ? searchParams.q : "";
  const brand = parseBrand(typeof searchParams.brand === "string" ? searchParams.brand : "");
  let from = parseIsoDate(typeof searchParams.from === "string" ? searchParams.from : "");
  let to = parseIsoDate(typeof searchParams.to === "string" ? searchParams.to : "");
  if (from && to && from > to) {
    [from, to] = [to, from];
  }

  const result = await getDashboard();
  if (!result.ok) {
    return <DashboardError message={result.message} />;
  }

  const selectedId = result.budgets.some(
    (budget) => String(budget.stakeholder_id) === requested,
  )
    ? Number(requested)
    : null;

  const needle = query.trim().toLowerCase();
  const lines = result.lines.filter((line) => {
    if (selectedId != null && line.stakeholder_id !== selectedId) return false;
    if (brand && line.brand !== brand) return false;
    if (from && line.ordered_on < from) return false;
    if (to && line.ordered_on > to) return false;
    if (!needle) return true;
    const haystack = `${line.order_number} ${line.product_name} ${line.sku}`.toLowerCase();
    return haystack.includes(needle);
  });

  const pageCount = Math.max(1, Math.ceil(lines.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageLines = lines.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <Dashboard
      lines={pageLines}
      totals={{
        wholesale: sumDollars(lines.map((line) => line.wholesale_total)),
        retail: sumDollars(lines.map((line) => line.retail_total)),
        gross: sumDollars(lines.map((line) => line.gross_smart)),
        fees: sumDollars(lines.map((line) => line.fee_amount)),
        net: sumDollars(lines.map((line) => line.net_smart)),
      }}
      stakeholders={result.budgets}
      selectedId={selectedId}
      brand={brand}
      query={query}
      from={from}
      to={to}
      page={page}
      pageCount={pageCount}
      totalLines={lines.length}
      rangeStart={lines.length === 0 ? 0 : startIndex + 1}
      rangeEnd={startIndex + pageLines.length}
    />
  );
}

function parsePage(value: string): number {
  const page = Number(value);
  if (!Number.isInteger(page) || page < 1) return 1;
  return page;
}

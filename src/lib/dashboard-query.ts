// Shared dashboard URL. Stakeholder, search, date range, and page stay together
// so the KPIs and the orders table always describe the same slice.

export type DashboardQuery = {
  stakeholderId: number | null;
  brand: string;
  query: string;
  from: string;
  to: string;
  page?: number;
};

export function dashboardHref({
  stakeholderId,
  brand,
  query,
  from,
  to,
  page = 1,
}: DashboardQuery): string {
  const params = new URLSearchParams();
  if (stakeholderId != null) params.set("stakeholder", String(stakeholderId));
  if (brand) params.set("brand", brand);
  if (query.trim()) params.set("q", query.trim());
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/?${search}` : "/";
}

// Accepts a real calendar day only. Anything else means "no bound".
export function parseIsoDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }
  return value;
}

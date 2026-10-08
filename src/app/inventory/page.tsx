import { redirect } from "next/navigation";

// Inventory now lives on Products. Keep old links working.
export default async function InventoryPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const params = new URLSearchParams();
  for (const key of ["stakeholder", "brand", "status", "q", "page"]) {
    const value = searchParams[key];
    if (typeof value === "string" && value) params.set(key, value);
  }
  const search = params.toString();
  redirect(search ? `/prices?${search}` : "/prices");
}

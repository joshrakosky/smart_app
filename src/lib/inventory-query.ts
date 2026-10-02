import type { InventoryStatus } from "@/lib/inventory";

// Inventory URL. Search, stakeholder, brand, status, and page stay together.

export type InventoryQuery = {
  stakeholderId: number | null;
  brand: string;
  status: InventoryStatus | "";
  query: string;
  page?: number;
};

export function inventoryHref({
  stakeholderId,
  brand,
  status,
  query,
  page = 1,
}: InventoryQuery): string {
  const params = new URLSearchParams();
  if (stakeholderId != null) params.set("stakeholder", String(stakeholderId));
  if (brand) params.set("brand", brand);
  if (status) params.set("status", status);
  if (query.trim()) params.set("q", query.trim());
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/inventory?${search}` : "/inventory";
}

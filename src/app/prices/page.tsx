import { InventoryBoard } from "@/components/inventory-board";
import { parseBrand } from "@/lib/brands";
import { parseInventoryStatus } from "@/lib/inventory";
import { STAKEHOLDERS } from "@/lib/stakeholders";

export const metadata = {
  title: "Products · Smart$",
};

// Products is the inventory list and the price list. Filters stay on the URL.
export default async function PricesPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const requested = typeof searchParams.stakeholder === "string" ? searchParams.stakeholder : "";
  const stakeholderId = STAKEHOLDERS.some((stakeholder) => String(stakeholder.id) === requested)
    ? Number(requested)
    : null;

  return (
    <InventoryBoard
      query={typeof searchParams.q === "string" ? searchParams.q : ""}
      stakeholderId={stakeholderId}
      brand={parseBrand(typeof searchParams.brand === "string" ? searchParams.brand : "")}
      status={parseInventoryStatus(typeof searchParams.status === "string" ? searchParams.status : "")}
      page={parsePage(typeof searchParams.page === "string" ? searchParams.page : "")}
    />
  );
}

function parsePage(value: string): number {
  const page = Number(value);
  if (!Number.isInteger(page) || page < 1) return 1;
  return page;
}

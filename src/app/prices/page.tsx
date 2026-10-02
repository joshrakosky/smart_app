import { PageHeader } from "@/components/page-header";
import { PriceTable } from "@/components/price-table";

export const metadata = {
  title: "Price Tables · Smart$",
};

export default function PricesPage() {
  return (
    <div className="min-h-full bg-slate-100 text-slate-900">
      <PageHeader title="Price Tables" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <PriceTable />
      </main>
    </div>
  );
}

import { PageHeader } from "@/components/page-header";
import { TimeClock } from "@/components/time-clock";

export const metadata = {
  title: "Hours · Smart$",
};

export default function TimePage() {
  return (
    <div className="min-h-full bg-slate-100 text-slate-900">
      <PageHeader
        title="Hours"
        eyebrow="Trane Technologies"
        subtitle="Projects and the combined time contractors have on each one."
      />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <TimeClock />
      </main>
    </div>
  );
}

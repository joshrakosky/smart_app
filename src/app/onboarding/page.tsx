import { OnboardingBoard } from "@/components/onboarding-board";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "Onboarding · Smart$",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-full bg-slate-100 text-slate-900">
      <PageHeader title="Onboarding" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <OnboardingBoard />
      </main>
    </div>
  );
}

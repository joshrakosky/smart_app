import { AccountMenu } from "@/components/account-menu";

// Shared page title. Same navy as the left rail. The display font comes from h1 in globals.css.
export function PageHeader({ title }: { title: string }) {
  return (
    <header className="bg-[#0f2c4c] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <h1 className="text-4xl font-semibold">{title}</h1>
        <AccountMenu />
      </div>
    </header>
  );
}

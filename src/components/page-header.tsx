import { AccountMenu } from "@/components/account-menu";

// Shared page title. The display font comes from h1 in globals.css.
export function PageHeader({
  title,
  eyebrow,
  subtitle,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
}) {
  return (
    <header className="bg-[#0f2c4c] text-white">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-1">
          {eyebrow ? <p className="text-sm tracking-wide text-slate-200">{eyebrow}</p> : null}
          <h1 className="text-4xl font-semibold">{title}</h1>
          {subtitle ? <p className="max-w-2xl text-sm text-slate-200">{subtitle}</p> : null}
        </div>
        <AccountMenu />
      </div>
    </header>
  );
}

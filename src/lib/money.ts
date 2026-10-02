// Display helpers. The database view is the source of truth once Supabase is
// connected. This cents math is only for the local sample, and it follows the
// same steps as order_line_summary: round the fee to cents, then subtract it
// from gross Smart$.

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

// feeRate is a fraction such as 0.03. Round half up, matching Postgres numeric round.
export function feeCents(retailCents: number, feeRate: number): number {
  const rateBasisPoints = Math.round(feeRate * 10000);
  return Math.round((retailCents * rateBasisPoints) / 10000);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function sumDollars(values: number[]): number {
  const cents = values.reduce((total, value) => total + toCents(value), 0);
  return fromCents(cents);
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatMoney(amount: number): string {
  return usd.format(amount);
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

// Dashboard order rows. Month and day stay two digits: 09/26/2026.
export function formatSlashDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${month}/${day}/${year}`;
}

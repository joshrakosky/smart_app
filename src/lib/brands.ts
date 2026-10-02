// Residential brands on the dashboard filter. Empty means every brand.
export const BRANDS = ["Trane", "American Standard", "RunTru", "Ameristar"] as const;

export type Brand = (typeof BRANDS)[number];

export function parseBrand(value: string): Brand | "" {
  return (BRANDS as readonly string[]).includes(value) ? (value as Brand) : "";
}

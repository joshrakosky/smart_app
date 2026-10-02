import { parseStakeholderId, stakeholderName } from "@/lib/stakeholders";

// Each unit is a category that points at a stakeholder and a target margin.
// Later that margin will set retail from wholesale. It does not change prices yet.
export type AccountUnit = {
  id: string;
  name: string;
  stakeholderId: number;
  marginPercent: number;
};

const STORAGE_KEY = "smart-account-units";

export const SEED_ACCOUNT_UNITS: AccountUnit[] = [
  { id: "au-house", name: "House", stakeholderId: 1, marginPercent: 40 },
  { id: "au-dealer", name: "Dealer", stakeholderId: 2, marginPercent: 32 },
  { id: "au-coop", name: "Co-op", stakeholderId: 3, marginPercent: 25 },
  { id: "au-internal", name: "Internal", stakeholderId: 4, marginPercent: 15 },
];

let cachedUnits: AccountUnit[] | null = null;
const unitListeners = new Set<() => void>();

export function subscribeAccountUnits(listener: () => void) {
  unitListeners.add(listener);
  return () => unitListeners.delete(listener);
}

export function getAccountUnitsSnapshot(): AccountUnit[] {
  if (!cachedUnits) cachedUnits = loadAccountUnits();
  return cachedUnits;
}

export function getAccountUnitsServerSnapshot(): AccountUnit[] {
  return SEED_ACCOUNT_UNITS;
}

export function loadAccountUnits(): AccountUnit[] {
  if (typeof window === "undefined") return SEED_ACCOUNT_UNITS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_ACCOUNT_UNITS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return SEED_ACCOUNT_UNITS;
    const units = parsed.map(normalizeUnit).filter((unit): unit is AccountUnit => unit != null);
    return units.length > 0 ? units : SEED_ACCOUNT_UNITS;
  } catch {
    return SEED_ACCOUNT_UNITS;
  }
}

export function addAccountUnit(input: {
  name: string;
  stakeholderId: number;
  marginPercent: number;
}): AccountUnit | null {
  const name = input.name.trim();
  if (!name || !Number.isFinite(input.marginPercent) || input.marginPercent < 0 || input.marginPercent >= 100) {
    return null;
  }
  const unit: AccountUnit = {
    id: crypto.randomUUID(),
    name,
    stakeholderId: parseStakeholderId(input.stakeholderId),
    marginPercent: input.marginPercent,
  };
  const next = [...getAccountUnitsSnapshot(), unit];
  cachedUnits = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const listener of unitListeners) listener();
  return unit;
}

export function accountUnitById(id: string | null): AccountUnit | null {
  if (!id) return null;
  return getAccountUnitsSnapshot().find((unit) => unit.id === id) ?? null;
}

export function parseAccountUnitId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return accountUnitById(value) ? value : null;
}

export function accountUnitLabel(unit: AccountUnit): string {
  return `${unit.name} · ${stakeholderName(unit.stakeholderId)} · ${unit.marginPercent}%`;
}

function normalizeUnit(value: unknown): AccountUnit | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const margin = typeof row.marginPercent === "number" ? row.marginPercent : Number(row.marginPercent);
  const id = typeof row.id === "string" ? row.id : "";
  if (!id || !name || !Number.isFinite(margin) || margin < 0 || margin >= 100) return null;
  return {
    id,
    name,
    stakeholderId: parseStakeholderId(row.stakeholderId),
    marginPercent: margin,
  };
}

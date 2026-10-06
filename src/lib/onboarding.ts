import type { Price } from "@/lib/prices";

// Onboarding queue for the ecomm team. A product lands here only when a save
// chooses "Add to queue". Open rows are the queue. Done and cancelled stay stored
// so a later save can start a fresh row instead of reviving an old one.

export type QueueKind = "new" | "update" | "remove";

export const QUEUE_KIND_LABELS: Record<QueueKind, string> = {
  new: "New",
  update: "Update",
  remove: "Remove",
};

export type QueueStatus = "open" | "done" | "cancelled";

export type OnboardingItem = {
  id: string;
  productId: string;
  kind: QueueKind;
  // The product as it was when it was queued. Review shows this copy.
  product: Price;
  note: string;
  status: QueueStatus;
  queuedAt: string;
};

const STORAGE_KEY = "smart-onboarding";
const EMPTY: OnboardingItem[] = [];

let cachedItems: OnboardingItem[] | null = null;
const listeners = new Set<() => void>();

export function subscribeOnboarding(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOnboardingSnapshot(): OnboardingItem[] {
  if (!cachedItems) cachedItems = loadOnboarding();
  return cachedItems;
}

export function getOnboardingServerSnapshot(): OnboardingItem[] {
  return EMPTY;
}

// New if the product did not exist. Remove when an active product is turned off. Otherwise Update.
export function queueKindForSave(previous: Price | undefined, next: Price): QueueKind {
  if (!previous) return "new";
  if (previous.active && !next.active) return "remove";
  return "update";
}

// One open row per product. A second yes updates that row. A finished row stays finished.
export function enqueueOnboarding(product: Price, kind: QueueKind) {
  const snapshot = structuredClone(product);
  const current = getOnboardingSnapshot();
  const open = current.find((item) => item.productId === product.id && item.status === "open");
  const next = open
    ? current.map((item) =>
        item.id === open.id
          ? {
              ...item,
              kind: combineKind(item.kind, kind, snapshot.active),
              product: snapshot,
              queuedAt: new Date().toISOString(),
            }
          : item,
      )
    : [
        {
          id: crypto.randomUUID(),
          productId: product.id,
          kind,
          product: snapshot,
          note: "",
          status: "open" as const,
          queuedAt: new Date().toISOString(),
        },
        ...current,
      ];
  replaceOnboarding(next);
}

export function setOnboardingNote(id: string, note: string) {
  replaceOnboarding(getOnboardingSnapshot().map((item) => (item.id === id ? { ...item, note } : item)));
}

export function completeOnboarding(id: string) {
  setStatus(id, "done");
}

export function cancelOnboarding(id: string) {
  setStatus(id, "cancelled");
}

// Remove wins. A still-new product stays New until it is deactivated. A remove stays a remove while it is off.
function combineKind(openKind: QueueKind, nextKind: QueueKind, active: boolean): QueueKind {
  if (nextKind === "remove" || (openKind === "remove" && !active)) return "remove";
  if (openKind === "new") return "new";
  return nextKind;
}

function setStatus(id: string, status: QueueStatus) {
  replaceOnboarding(getOnboardingSnapshot().map((item) => (item.id === id ? { ...item, status } : item)));
}

function replaceOnboarding(next: OnboardingItem[]) {
  cachedItems = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}

function loadOnboarding(): OnboardingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeItem).filter((item): item is OnboardingItem => item != null);
  } catch {
    return [];
  }
}

function kindFromRow(value: unknown): QueueKind | null {
  if (value === "new" || value === "update" || value === "remove") return value;
  // Older rows stored edits as "edit".
  if (value === "edit") return "update";
  return null;
}

function normalizeItem(value: unknown): OnboardingItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const product = row.product;
  if (!product || typeof product !== "object") return null;
  const price = product as Price;
  if (typeof price.id !== "string" || typeof price.name !== "string") return null;
  const kind = kindFromRow(row.kind);
  if (!kind) return null;
  if (row.status !== "open" && row.status !== "done" && row.status !== "cancelled") return null;
  if (typeof row.id !== "string") return null;
  return {
    id: row.id,
    productId: typeof row.productId === "string" ? row.productId : price.id,
    kind,
    product: price,
    note: typeof row.note === "string" ? row.note : "",
    status: row.status,
    queuedAt: typeof row.queuedAt === "string" ? row.queuedAt : new Date().toISOString(),
  };
}

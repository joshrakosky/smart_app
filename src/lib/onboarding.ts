import { accountUnitById } from "@/lib/account-units";
import { formatMoney } from "@/lib/money";
import {
  EXTRA_TYPE_LABELS,
  PRICE_TYPE_LABELS,
  type ExtraCharge,
  type Price,
  type QtyBreak,
  type SizeUpcharge,
} from "@/lib/prices";
import { stakeholderName } from "@/lib/stakeholders";

// Onboarding queue keeps ecomm and backend product records aligned.
// A product lands here only when a save chooses "Add to queue". The note lists
// what changed (or what a new product needs) so the ecomm team knows what to sync.
// Open rows are the queue. Done and cancelled stay stored so a later save can
// start a fresh row instead of reviving an old one.

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

// One open row per product. A second yes updates that row and appends new change notes.
export function enqueueOnboarding(product: Price, kind: QueueKind, previous?: Price) {
  const snapshot = structuredClone(product);
  writeQueueRow(snapshot, kind, describeProductChanges(previous, snapshot, kind));
}

// Inline edits that are not the product form, such as a reorder point, still
// land on the same open row so ecomm sees them with the other field changes.
export function enqueueOnboardingNote(product: Price, note: string) {
  const text = note.trim();
  if (!text) return;
  writeQueueRow(structuredClone(product), "update", text);
}

function writeQueueRow(snapshot: Price, kind: QueueKind, changeNote: string) {
  const current = getOnboardingSnapshot();
  const open = current.find((item) => item.productId === snapshot.id && item.status === "open");
  const next = open
    ? current.map((item) =>
        item.id === open.id
          ? {
              ...item,
              kind: combineKind(item.kind, kind, snapshot.active),
              product: snapshot,
              // Keep earlier sync notes; append what changed on this save.
              note: mergeChangeNotes(item.note, changeNote),
              queuedAt: new Date().toISOString(),
            }
          : item,
      )
    : [
        {
          id: crypto.randomUUID(),
          productId: snapshot.id,
          kind,
          product: snapshot,
          note: changeNote,
          status: "open" as const,
          queuedAt: new Date().toISOString(),
        },
        ...current,
      ];
  replaceOnboarding(next);
}

// Human-readable sync brief for the queue. Empty fields are skipped.
export function describeProductChanges(
  previous: Price | undefined,
  next: Price,
  kind: QueueKind,
): string {
  if (kind === "new" || !previous) return describeNewProduct(next);
  if (kind === "remove") return "Deactivated — remove from ecomm storefront.";

  const lines: string[] = [];
  pushFieldChange(lines, "Name", previous.name, next.name);
  pushFieldChange(lines, "SKU", previous.sku || "—", next.sku || "—");
  pushFieldChange(lines, "Type", PRICE_TYPE_LABELS[previous.type], PRICE_TYPE_LABELS[next.type]);
  pushFieldChange(lines, "Category", previous.category || "—", next.category || "—");
  pushFieldChange(
    lines,
    "Stakeholder",
    stakeholderName(previous.stakeholderId),
    stakeholderName(next.stakeholderId),
  );
  pushFieldChange(
    lines,
    "Account unit",
    unitLabel(previous.accountUnitId),
    unitLabel(next.accountUnitId),
  );
  pushFieldChange(lines, "Active", previous.active ? "On" : "Off", next.active ? "On" : "Off");

  const specsNote = describeListChange("Specs", previous.specs, next.specs);
  if (specsNote) lines.push(specsNote);

  const pricingNote = describeBreaksChange(previous.breaks, next.breaks);
  if (pricingNote) lines.push(pricingNote);

  const extrasNote = describeExtrasChange(previous.extras, next.extras);
  if (extrasNote) lines.push(extrasNote);

  const sizesNote = describeSizeUpchargesChange(previous.sizeUpcharges, next.sizeUpcharges);
  if (sizesNote) lines.push(sizesNote);

  return lines.length > 0 ? lines.join("\n") : "Details updated — review product in queue.";
}

function describeNewProduct(product: Price): string {
  const parts = [
    `New product for ecomm`,
    `Type: ${PRICE_TYPE_LABELS[product.type]}`,
    product.category ? `Category: ${product.category}` : null,
    product.sku ? `SKU: ${product.sku}` : null,
    `Stakeholder: ${stakeholderName(product.stakeholderId)}`,
    product.accountUnitId ? `Account unit: ${unitLabel(product.accountUnitId)}` : null,
    product.specs.length > 0 ? `Specs: ${product.specs.join(", ")}` : null,
    product.breaks.length > 0 ? `Pricing: ${formatBreaks(product.breaks)}` : null,
    product.extras.length > 0 ? `Extras: ${formatExtras(product.extras)}` : null,
  ];
  return parts.filter(Boolean).join("\n");
}

function mergeChangeNotes(existing: string, incoming: string): string {
  const prior = existing.trim();
  const next = incoming.trim();
  if (!prior) return next;
  if (!next) return prior;
  if (prior === next || prior.includes(next)) return prior;
  return `${prior}\n—\n${next}`;
}

function pushFieldChange(lines: string[], label: string, before: string, after: string) {
  if (before === after) return;
  lines.push(`${label}: ${before} → ${after}`);
}

function describeListChange(label: string, before: string[], after: string[]): string | null {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added = after.filter((item) => !beforeSet.has(item));
  const removed = before.filter((item) => !afterSet.has(item));
  if (added.length === 0 && removed.length === 0) return null;
  const parts: string[] = [];
  if (added.length > 0) parts.push(`added ${added.join(", ")}`);
  if (removed.length > 0) parts.push(`removed ${removed.join(", ")}`);
  return `${label}: ${parts.join("; ")}`;
}

function describeBreaksChange(before: QtyBreak[], after: QtyBreak[]): string | null {
  if (stableString(before) === stableString(after)) return null;
  return `Pricing: ${formatBreaks(before) || "—"} → ${formatBreaks(after) || "—"}`;
}

function describeExtrasChange(before: ExtraCharge[], after: ExtraCharge[]): string | null {
  if (stableString(before) === stableString(after)) return null;
  return `Extras: ${formatExtras(before) || "none"} → ${formatExtras(after) || "none"}`;
}

function describeSizeUpchargesChange(before: SizeUpcharge[], after: SizeUpcharge[]): string | null {
  if (stableString(before) === stableString(after)) return null;
  return `Size upcharges: ${formatSizeUpcharges(before) || "none"} → ${formatSizeUpcharges(after) || "none"}`;
}

function formatBreaks(breaks: QtyBreak[]): string {
  return breaks
    .map((item) => `qty ${item.qty} ${formatMoney(item.wholesale)}/${formatMoney(item.retail)}`)
    .join("; ");
}

function formatExtras(extras: ExtraCharge[]): string {
  return extras
    .map(
      (item) =>
        `${EXTRA_TYPE_LABELS[item.type].split(" (")[0]} ${formatMoney(item.wholesale)}/${formatMoney(item.retail)}`,
    )
    .join("; ");
}

function formatSizeUpcharges(sizes: SizeUpcharge[]): string {
  return sizes
    .map(
      (item) =>
        `${item.size}${item.active ? "" : " (off)"} ${formatMoney(item.wholesale)}/${formatMoney(item.retail)}`,
    )
    .join("; ");
}

function unitLabel(id: string | null): string {
  if (!id) return "—";
  return accountUnitById(id)?.name ?? id;
}

function stableString(value: unknown): string {
  return JSON.stringify(value);
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

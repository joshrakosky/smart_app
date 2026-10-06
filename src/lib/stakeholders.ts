// Product / order owners. Ids stay 1–4 so existing local rows keep their links.
export const STAKEHOLDERS = [
  { id: 1, name: "MarCom" },
  { id: 2, name: "Tours" },
  { id: 3, name: "FSR" },
  { id: 4, name: "Elite Dealer Service" },
] as const;

export function stakeholderName(id: number): string {
  return STAKEHOLDERS.find((stakeholder) => stakeholder.id === id)?.name ?? "MarCom";
}

export function parseStakeholderId(value: unknown): number {
  const id = typeof value === "number" ? value : Number(value);
  return STAKEHOLDERS.some((stakeholder) => stakeholder.id === id) ? id : 1;
}

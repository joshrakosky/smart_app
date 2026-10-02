// Placeholder owners. Same four people as the sample orders.
export const STAKEHOLDERS = [
  { id: 1, name: "Stakeholder 1" },
  { id: 2, name: "Stakeholder 2" },
  { id: 3, name: "Stakeholder 3" },
  { id: 4, name: "Stakeholder 4" },
] as const;

export function stakeholderName(id: number): string {
  return STAKEHOLDERS.find((stakeholder) => stakeholder.id === id)?.name ?? "Stakeholder 1";
}

export function parseStakeholderId(value: unknown): number {
  const id = typeof value === "number" ? value : Number(value);
  return STAKEHOLDERS.some((stakeholder) => stakeholder.id === id) ? id : 1;
}

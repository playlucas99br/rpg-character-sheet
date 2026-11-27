import type { ResourceKey, Sheet } from "./types";

export type QuickAction = "damage" | "heal" | "spend" | "spend_sanity";

export const MAX_QUICK_ACTION_AMOUNT = 9999;

export function resourceSpendWarning(
  sheet: Pick<Sheet, "resources">,
  key: ResourceKey,
  delta: number,
  resourceLabel = key === "ep" ? "energia" : "sanidade",
): string | null {
  if (key === "hp" || delta >= 0 || -delta <= sheet.resources[key].current)
    return null;

  return `Saldo insuficiente de ${resourceLabel}. Disponível: ${sheet.resources[key].current}; gasto solicitado: ${-delta}.`;
}

export function quickResourceChange(
  sheet: Pick<Sheet, "resources">,
  action: QuickAction,
  amount: number,
): { key: ResourceKey; delta: number; next: number } | null {
  if (
    !Number.isInteger(amount) ||
    amount < 1 ||
    amount > MAX_QUICK_ACTION_AMOUNT
  ) return null;

  const key = action === "spend" ? "ep" : action === "spend_sanity" ? "sanity" : "hp";
  const delta = action === "heal" ? amount : -amount;
  const resource = sheet.resources[key];
  return {
    key,
    delta,
    next: Math.max(0, Math.min(resource.max, resource.current + delta)),
  };
}

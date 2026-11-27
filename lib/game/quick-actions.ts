import type { ResourceKey, Sheet } from "./types";

export type QuickAction = "damage" | "heal" | "spend";

export const MAX_QUICK_ACTION_AMOUNT = 9999;

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

  const key = action === "spend" ? "ep" : "hp";
  const delta = action === "heal" ? amount : -amount;
  const resource = sheet.resources[key];
  return {
    key,
    delta,
    next: Math.max(0, Math.min(resource.max, resource.current + delta)),
  };
}

import { z } from "zod";
import type { InventoryItem } from "./types.ts";

export type InventoryCounter = {
  kind: "ammunition" | "charges" | "consumable";
  current: number;
  max: number;
  label?: string;
};

export type CounterInventoryItem = InventoryItem & {
  counter?: InventoryCounter | null;
};

export const MAX_INVENTORY_COUNTER = 9999;

export const inventoryCounterSchema = z.object({
  kind: z.enum(["ammunition", "charges", "consumable"]),
  current: z.number().int().min(0).max(MAX_INVENTORY_COUNTER),
  max: z.number().int().min(1).max(MAX_INVENTORY_COUNTER),
  label: z.string().trim().max(80).optional(),
}).refine((counter) => counter.current <= counter.max, {
  message: "O valor atual do contador não pode superar o máximo.",
  path: ["current"],
});

const adjustmentSchema = z.object({
  operation: z.enum(["consume", "replenish"]),
  amount: z.number().int().min(1).max(MAX_INVENTORY_COUNTER),
});

export const adjustInventoryCounterSchema = adjustmentSchema.extend({
  sheetId: z.string().min(1).max(100),
  itemId: z.string().min(1).max(100),
  version: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
});

export type InventoryCounterOperation = z.infer<typeof adjustmentSchema>["operation"];

export function inventoryCounterLabel(counter: InventoryCounter): string {
  return counter.label?.trim() || {
    ammunition: "Munição",
    charges: "Cargas",
    consumable: "Usos",
  }[counter.kind];
}

export function inventoryCounterWarning(
  counter: InventoryCounter,
  operation: InventoryCounterOperation,
  amount: number,
): string | null {
  if (!adjustmentSchema.safeParse({ operation, amount }).success)
    return `Informe uma quantidade inteira entre 1 e ${MAX_INVENTORY_COUNTER}.`;
  if (operation === "consume" && amount > counter.current)
    return `Saldo insuficiente de ${inventoryCounterLabel(counter)}. Disponível: ${counter.current}; gasto solicitado: ${amount}.`;
  if (operation === "replenish" && amount > counter.max - counter.current)
    return `A reposição supera o máximo de ${inventoryCounterLabel(counter)}. Espaço disponível: ${counter.max - counter.current}; reposição solicitada: ${amount}.`;
  return null;
}

/** Counters describe uses of this item; physical quantity and attacks stay independent. */
export function adjustInventoryCounter<T extends CounterInventoryItem>(
  item: T,
  operation: InventoryCounterOperation,
  amount: number,
): T {
  const adjustment = adjustmentSchema.parse({ operation, amount });
  if (!item.counter) throw new Error("Este item não possui um contador configurado.");
  const counter = inventoryCounterSchema.parse(item.counter);
  const warning = inventoryCounterWarning(counter, adjustment.operation, adjustment.amount);
  if (warning) throw new Error(warning);
  return {
    ...item,
    counter: {
      ...counter,
      current: counter.current + (adjustment.operation === "consume" ? -adjustment.amount : adjustment.amount),
    },
  };
}

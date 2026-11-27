import { z } from "zod";
import type { InventoryItem } from "./types";

export const MAX_INVENTORY_ITEMS = 100;
export const MAX_ITEM_QUANTITY = 9999;
export const MAX_ITEM_WEIGHT = 9999;

export const inventoryItemSchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(0).max(MAX_ITEM_QUANTITY),
  weight: z.number().finite().min(0).max(MAX_ITEM_WEIGHT).multipleOf(0.001),
  equipped: z.boolean(),
  description: z.string().max(2000).optional(),
});

export const inventoryItemsSchema = z
  .array(inventoryItemSchema)
  .max(MAX_INVENTORY_ITEMS)
  .superRefine((items, context) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.id)) {
        context.addIssue({
          code: "custom",
          path: [index, "id"],
          message: "Identificadores duplicados no inventário.",
        });
      }
      seen.add(item.id);
    });
  });

/** Weight is informational; carrying capacity depends on the table's rules. */
export function inventoryWeight(items: readonly Pick<InventoryItem, "quantity" | "weight">[] = []): number {
  const total = items.reduce((weight, item) => weight + item.quantity * item.weight, 0);
  return Math.round(total * 1000) / 1000;
}

export function formatInventoryWeight(weight: number): string {
  return weight.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

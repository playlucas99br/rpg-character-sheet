import type { Sheet } from "./types";

// Missing optional extensions from older clients must not erase newer data.
// Explicit null clears a counter; an explicit empty list removes the items.
export function preserveSheetExtensions<T extends Pick<Sheet, "inventoryItems" | "abilities">>(current: Sheet, content: T): T {
  const previous = new Map((current.inventoryItems ?? []).map((item) => [item.id, item]));
  const previousAbilities = new Map(current.abilities.map((ability) => [ability.id, ability]));
  return {
    ...content,
    ...(content.inventoryItems === undefined ? {} : { inventoryItems: content.inventoryItems.map((item) => {
      const saved = previous.get(item.id);
      return item.counter === undefined && saved?.counter !== undefined
        ? { ...item, counter: structuredClone(saved.counter) }
        : item;
    }) }),
    abilities: content.abilities.map((ability) => {
      const saved = previousAbilities.get(ability.id);
      return ability.tracking === undefined && saved?.tracking !== undefined
        ? { ...ability, tracking: structuredClone(saved.tracking) }
        : ability;
    }),
  };
}

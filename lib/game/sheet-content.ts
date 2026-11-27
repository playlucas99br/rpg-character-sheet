import type { Sheet } from "./types";

// Missing optional extensions from older clients must not erase newer data.
// Explicit null clears a counter; an explicit empty list removes the items.
export function preserveSheetExtensions<T extends Pick<Sheet, "inventoryItems">>(current: Sheet, content: T): T {
  if (content.inventoryItems === undefined) return content;
  const previous = new Map((current.inventoryItems ?? []).map((item) => [item.id, item]));
  return {
    ...content,
    inventoryItems: content.inventoryItems.map((item) => {
      const saved = previous.get(item.id);
      return item.counter === undefined && saved?.counter !== undefined
        ? { ...item, counter: structuredClone(saved.counter) }
        : item;
    }),
  };
}

import type { Sheet } from "./types";
import { randomId } from "./id.ts";

export function makeSheetCopy(source: Sheet, name: string, updatedAt = new Date().toISOString()): Sheet {
  return { ...structuredClone(source), id: randomId(), name, version: 1, updatedAt };
}

export function suggestedCopyName(sourceName: string, existingNames: string[]) {
  const base = sourceName.replace(/\s+\(cópia(?: \d+)?\)$/u, "").trim() || "Ficha";
  const names = new Set(existingNames.map((name) => name.toLocaleLowerCase("pt-BR")));
  for (let number = 1; ; number += 1) {
    const suffix = number === 1 ? " (cópia)" : ` (cópia ${number})`;
    const shortened = base.slice(0, 100 - suffix.length).replace(/[\uD800-\uDBFF]$/u, "").trimEnd();
    const name = shortened + suffix;
    if (!names.has(name.toLocaleLowerCase("pt-BR"))) return name;
  }
}

import type { Sheet } from "./types";

// Drafts are scoped to the person editing, including when a GM edits a player's
// character. Only the explicit demo stores examples outside the authenticated DB.
export type SheetDraft = { base: Sheet; value: Sheet; savedAt: string };
export function draftKey(scope: string, sheetId: string) {
  return `nexo-draft-v1:${JSON.stringify([scope, sheetId])}`;
}
export function parseDraft(raw: string | null, sheet: Sheet): SheetDraft | null {
  try {
    const draft = JSON.parse(raw || "null") as SheetDraft | null;
    if (!draft || draft.base.id !== sheet.id || draft.value.id !== sheet.id || draft.base.ownerId !== sheet.ownerId || draft.base.campaignId !== sheet.campaignId || draft.base.system !== sheet.system || !Number.isInteger(draft.base.version) || typeof draft.savedAt !== "string") return null;
    for (const candidate of [draft.base, draft.value]) {
      for (const key of editableFields) {
        if (typeof candidate[key] !== typeof sheet[key]) return null;
        if (Array.isArray(sheet[key]) && (!Array.isArray(candidate[key]) || (candidate[key] as unknown[]).some((item) => !item || typeof item !== "object" || typeof (item as { id?: unknown }).id !== "string"))) return null;
      }
      if (!candidate.attributes || Array.isArray(candidate.attributes) || Object.values(candidate.attributes).some((value) => typeof value !== "number")) return null;
      for (const key of ["hp", "ep", "sanity"] as const) {
        if (typeof candidate.resources?.[key]?.current !== "number" || typeof candidate.resources?.[key]?.max !== "number") return null;
      }
    }
    return draft;
  } catch {
    return null;
  }
}
const editableFields = ["name", "className", "origin", "level", "exposure", "defense", "attributes", "resources", "skills", "attacks", "rituals", "abilities", "inventory", "notes", "description", "tone"] as const;
export function hasDraftChanges(base: Sheet, value: Sheet) {
  return editableFields.some((key) => JSON.stringify(base[key]) !== JSON.stringify(value[key]));
}

// A three-way merge preserves newer database changes. Conflicts must be
// resolved by the person editing; they never silently overwrite another tab.
export function reconcileDraft(saved: SheetDraft, current: Sheet): { value: Sheet; conflicts: string[] } {
  const value = structuredClone(current), conflicts: string[] = [];
  for (const key of editableFields) {
    const previous = JSON.stringify(saved.base[key]), edited = JSON.stringify(saved.value[key]), latest = JSON.stringify(current[key]);
    if (edited === previous || edited === latest) continue;
    if (latest !== previous) { conflicts.push(key); continue; }
    Object.assign(value, { [key]: structuredClone(saved.value[key]) });
  }
  return { value, conflicts };
}

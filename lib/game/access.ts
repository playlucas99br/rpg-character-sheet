import type { Campaign, Sheet } from "./types";
export function canReadSheet(
  userId: string,
  role: Campaign["role"] | null,
  sheet: Pick<Sheet, "ownerId" | "type">,
) {
  return (
    role === "gm" ||
    (role === "player" &&
      sheet.type === "character" &&
      sheet.ownerId === userId)
  );
}
export const canEditSheet = canReadSheet;
export const canCreateMonster = (role: Campaign["role"] | null) =>
  role === "gm";
export function canSeeRoll(
  userId: string,
  role: Campaign["role"],
  roll: { userId: string; visibility: string },
) {
  return roll.visibility === "table" || role === "gm" || roll.userId === userId;
}

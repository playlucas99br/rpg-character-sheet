import type { Campaign, Sheet } from "./types";

export type MasterPanelRoster = {
  campaign: Campaign;
  characters: Sheet[];
  creatures: Sheet[];
};

export function masterPanelFor(
  campaign: Campaign | undefined,
  sheets: readonly Sheet[],
): MasterPanelRoster | null {
  if (campaign?.role !== "gm") return null;

  const characters: Sheet[] = [];
  const creatures: Sheet[] = [];
  for (const sheet of sheets) {
    if (sheet.campaignId !== campaign.id) continue;
    (sheet.type === "monster" ? creatures : characters).push(sheet);
  }
  return { campaign, characters, creatures };
}

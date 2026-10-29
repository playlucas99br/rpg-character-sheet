import type { Campaign, Sheet } from "./types";
import { canReadSheet } from "./access.ts";

export type RecentActivity = { campaignIds: string[]; sheetIds: string[] };
export const EMPTY_ACTIVITY: RecentActivity = { campaignIds: [], sheetIds: [] };
const LIMIT = 12;

export function activityKey(accountId: string | undefined, mode: "account" | "demo-gm" | "demo-player") {
  return `nexo-recent-v1:${mode}:${encodeURIComponent(accountId || "guest")}`;
}

export function parseActivity(value: string | null): RecentActivity {
  try {
    const parsed: unknown = JSON.parse(value || "null");
    if (!parsed || typeof parsed !== "object") return EMPTY_ACTIVITY;
    const { campaignIds, sheetIds } = parsed as Record<string, unknown>;
    if (!Array.isArray(campaignIds) || !Array.isArray(sheetIds)) return EMPTY_ACTIVITY;
    const ids = (values: unknown[]) => [...new Set(values.filter((id): id is string =>
      typeof id === "string" && id.length > 0 && id.length <= 256 && id.trim() === id,
    ))].slice(0, LIMIT);
    return { campaignIds: ids(campaignIds), sheetIds: ids(sheetIds) };
  } catch {
    return EMPTY_ACTIVITY;
  }
}

function promote(ids: string[], id: string) {
  return ids[0] === id ? ids : [id, ...ids.filter((value) => value !== id)].slice(0, LIMIT);
}

export function rememberVisit(
  previous: RecentActivity,
  route: { page: string; id?: string },
  campaigns: Campaign[],
  sheets: Sheet[],
  userId: string,
): RecentActivity {
  const sheet = route.page === "sheet" ? sheets.find((s) => s.id === route.id) : undefined;
  const campaign = campaigns.find((c) => c.id === (sheet?.campaignId || (route.page === "campaign" ? route.id : undefined)));
  if (!campaign || (route.page === "sheet" && (!sheet || !canReadSheet(userId, campaign.role, sheet)))) return previous;
  const campaignIds = promote(previous.campaignIds, campaign.id);
  const sheetIds = sheet ? promote(previous.sheetIds, sheet.id) : previous.sheetIds;
  return campaignIds === previous.campaignIds && sheetIds === previous.sheetIds ? previous : { campaignIds, sheetIds };
}

const timestamp = (value: string) => Date.parse(value) || 0;

export function resumeTargets(activity: RecentActivity, campaigns: Campaign[], sheets: Sheet[], userId: string) {
  const campaign = activity.campaignIds.map((id) => campaigns.find((c) => c.id === id)).find(Boolean)
    || [...campaigns].sort((a, b) => Number(b.status === "active") - Number(a.status === "active") || timestamp(b.createdAt) - timestamp(a.createdAt))[0];
  const visible = sheets.filter((s) => canReadSheet(userId, campaigns.find((c) => c.id === s.campaignId)?.role || null, s));
  const lastSheet = activity.sheetIds.map((id) => visible.find((s) => s.id === id)).find(Boolean);
  const suggestedSheet = [...visible].sort((a, b) => {
    const priority = (s: Sheet) => (s.type === "character" ? 4 : 0) + (s.ownerId === userId ? 2 : 0) + (s.campaignId === campaign?.id ? 1 : 0);
    return priority(b) - priority(a) || timestamp(b.updatedAt) - timestamp(a.updatedAt);
  })[0];
  return {
    campaign,
    sheet: lastSheet || suggestedSheet,
    campaignVisited: !!campaign && activity.campaignIds.includes(campaign.id),
    sheetVisited: !!lastSheet,
  };
}

import test from "node:test";
import assert from "node:assert/strict";
import { activityKey, EMPTY_ACTIVITY, parseActivity, rememberVisit, resumeTargets } from "../lib/game/recent-activity.ts";
import { newSheet } from "../lib/game/systems.ts";

const campaign = (id, role = "gm", status = "active") => ({
  id, name: id, system: "ordem", role, status, description: "", banner: "forest", gmName: "Mestre", members: [], createdAt: "2026-10-29T10:00:00Z",
});
const sheet = (id, campaignId = "a", ownerId = "me", type = "character") => ({ ...newSheet("ordem", campaignId, ownerId, "Jogador", type), id, name: id });

test("recent visits distinguish accounts, real data and both demo roles; corrupted storage is ignored", () => {
  const keys = [activityKey("a", "account"), activityKey("b", "account"), activityKey("a", "demo-gm"), activityKey("a", "demo-player"), activityKey(undefined, "demo-gm")];
  assert.equal(new Set(keys).size, keys.length);
  for (const value of [null, "", "broken", "null", "[]", '{"campaignIds":null,"sheetIds":[]}']) assert.deepEqual(parseActivity(value), EMPTY_ACTIVITY);
  assert.deepEqual(parseActivity(JSON.stringify({ campaignIds: ["a", "a", null, 42, "", " ", "b"], sheetIds: ["s", {}] })), { campaignIds: ["a", "b"], sheetIds: ["s"] });
  assert.equal(parseActivity(JSON.stringify({ campaignIds: Array.from({ length: 40 }, (_, i) => `c${i}`), sheetIds: [] })).campaignIds.length, 12);
});

test("opening a sheet records its campaign too; returning home does not overwrite visits", () => {
  const campaigns = [campaign("a"), campaign("b")], sheets = [sheet("first"), sheet("last", "b")];
  let activity = rememberVisit(EMPTY_ACTIVITY, { page: "sheet", id: "first" }, campaigns, sheets, "me");
  activity = rememberVisit(activity, { page: "sheet", id: "last" }, campaigns, sheets, "me");
  assert.deepEqual(activity, { campaignIds: ["b", "a"], sheetIds: ["last", "first"] });
  assert.equal(rememberVisit(activity, { page: "dashboard" }, campaigns, sheets, "me"), activity);
  assert.equal(rememberVisit(activity, { page: "sheet", id: "last" }, campaigns, sheets, "me"), activity);
  const restored = parseActivity(JSON.stringify(activity));
  assert.equal(resumeTargets(restored, campaigns, sheets, "me").campaign.id, "b");
  assert.equal(resumeTargets(restored, campaigns, sheets, "me").sheet.id, "last");
});

test("deleted sheets, removed campaigns and private creatures cannot reappear through stored history", () => {
  const campaigns = [campaign("a", "player")], sheets = [sheet("own"), sheet("someone-else", "a", "other"), sheet("private", "a", "me", "monster"), sheet("removed", "removed")];
  const activity = { campaignIds: ["removed", "a"], sheetIds: ["deleted", "private", "someone-else", "removed", "own"] };
  const targets = resumeTargets(activity, campaigns, sheets, "me");
  assert.equal(targets.campaign.id, "a");
  assert.equal(targets.sheet.id, "own");
  for (const id of ["private", "someone-else", "removed", "deleted"]) assert.equal(rememberVisit(EMPTY_ACTIVITY, { page: "sheet", id }, campaigns, sheets, "me"), EMPTY_ACTIVITY);
  assert.equal(rememberVisit(EMPTY_ACTIVITY, { page: "campaign", id: "removed" }, campaigns, sheets, "me"), EMPTY_ACTIVITY);
  assert.equal(resumeTargets(activity, [], sheets, "me").sheet, undefined);
});

test("first visits suggest active campaigns and owned characters without claiming they were previously opened", () => {
  const campaigns = [campaign("paused", "gm", "paused"), campaign("a")];
  const sheets = [sheet("monster", "a", "me", "monster"), sheet("other", "a", "other"), sheet("own")];
  const targets = resumeTargets(EMPTY_ACTIVITY, campaigns, sheets, "me");
  assert.equal(targets.campaign.id, "a");
  assert.equal(targets.sheet.id, "own");
  assert.equal(targets.campaignVisited, false);
  assert.equal(targets.sheetVisited, false);
  assert.equal(resumeTargets(EMPTY_ACTIVITY, campaigns, [], "me").sheet, undefined);
  assert.equal(resumeTargets(EMPTY_ACTIVITY, [], [], "me").campaign, undefined);
  assert.equal(resumeTargets({ campaignIds: ["paused"], sheetIds: [] }, campaigns, [], "me").campaign.id, "paused");
});

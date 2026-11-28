import test from "node:test";
import assert from "node:assert/strict";
import { masterPanelFor } from "../lib/game/master-panel.ts";
import { newSheet } from "../lib/game/systems.ts";

const campaign = { id: "a", role: "gm" };
const character = {
  ...newSheet("ordem", campaign.id, "player", "Jogador"),
  id: "character",
};
const creature = {
  ...newSheet("ordem", campaign.id, "gm", "Mestre", "monster"),
  id: "creature",
};

test("the master panel groups characters and creatures from the selected campaign only", () => {
  const otherCampaignCharacter = { ...character, id: "other", campaignId: "b" };
  const otherCampaignCreature = { ...creature, id: "other-creature", campaignId: "b" };

  assert.deepEqual(masterPanelFor(campaign, [otherCampaignCharacter, creature, character, otherCampaignCreature]), {
    campaign,
    characters: [character],
    creatures: [creature],
  });
});

test("an empty campaign still has a panel for its master, while players and non-members have no panel", () => {
  assert.deepEqual(masterPanelFor(campaign, []), { campaign, characters: [], creatures: [] });
  assert.equal(masterPanelFor({ ...campaign, role: "player" }, [character, creature]), null);
  assert.equal(masterPanelFor(undefined, [character, creature]), null);
});

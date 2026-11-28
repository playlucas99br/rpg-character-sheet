import test from "node:test";
import assert from "node:assert/strict";
import { advanceEncounter, finishEncounter, orderedParticipants, parseEncounterDraft, startEncounter } from "../lib/game/encounters.ts";

const participants = [
  { sheetId: "slow", name: "Lento", initiative: 3 },
  { sheetId: "first-tie", name: "Primeiro empate", initiative: 15 },
  { sheetId: "second-tie", name: "Segundo empate", initiative: 15 },
];
const encounter = () => ({ id: "encounter", campaignId: "campaign", name: "Encontro", status: "draft", participants: structuredClone(participants), round: 0, currentParticipantId: null, version: 1, updatedAt: "2026-11-27T12:00:00.000Z" });

test("encounter drafts validate bounded initiative, unique participants and trimmed names", () => {
  assert.deepEqual(parseEncounterDraft({ name: "  Combate  ", participants: [{ sheetId: "hero", initiative: -999 }] }), { name: "Combate", participants: [{ sheetId: "hero", initiative: -999 }] });
  assert.equal(parseEncounterDraft({ name: "A", participants: [{ sheetId: "hero", initiative: 999 }] }).participants[0].initiative, 999);
  for (const input of [
    { name: " ", participants }, { name: "x".repeat(101), participants }, { name: "A", participants: [] },
    { name: "A", participants: [{ sheetId: "same", initiative: 1 }, { sheetId: "same", initiative: 2 }] },
    { name: "A", participants: Array.from({ length: 61 }, (_, index) => ({ sheetId: String(index), initiative: 1 })) },
    ...[-1000, 1000, 1.5, NaN, Infinity, "12"].map((initiative) => ({ name: "A", participants: [{ sheetId: "hero", initiative }] })),
  ]) assert.throws(() => parseEncounterDraft(input));
});

test("initiative is descending with explicit draft order breaking ties without changing the source", () => {
  const original = structuredClone(participants);
  assert.deepEqual(orderedParticipants(participants).map((participant) => participant.sheetId), ["first-tie", "second-tie", "slow"]);
  assert.deepEqual(participants, original);
  assert.deepEqual(orderedParticipants([participants[2], participants[1]]).map((participant) => participant.sheetId), ["second-tie", "first-tie"]);
});

test("starting and advancing encounter turns maintains order, increments only complete rounds and remains immutable", () => {
  const draft = encounter();
  const original = structuredClone(draft);
  const started = startEncounter(draft);
  assert.equal(started.status, "active");
  assert.equal(started.round, 1);
  assert.equal(started.currentParticipantId, "first-tie");
  assert.equal(started.version, 1, "persistence owns the version increment");
  const second = advanceEncounter(started);
  assert.equal(second.currentParticipantId, "second-tie");
  assert.equal(second.round, 1);
  const third = advanceEncounter(second);
  assert.equal(third.currentParticipantId, "slow");
  const nextRound = advanceEncounter(third);
  assert.equal(nextRound.currentParticipantId, "first-tie");
  assert.equal(nextRound.round, 2);
  assert.deepEqual(draft, original);
  assert.equal(started.currentParticipantId, "first-tie");
});

test("one participant completes a round on each advance, and finishing preserves the completed state", () => {
  const started = startEncounter({ ...encounter(), participants: [participants[0]] });
  const advanced = advanceEncounter(started);
  assert.equal(advanced.round, 2);
  assert.equal(advanced.currentParticipantId, "slow");
  const finished = finishEncounter(advanced);
  assert.equal(finished.status, "finished");
  assert.equal(finished.currentParticipantId, null);
  assert.equal(finished.round, 2);
  assert.deepEqual(finished.participants, advanced.participants);
  assert.equal(advanced.status, "active");
});

test("invalid encounter transitions and missing current participants fail explicitly", () => {
  const draft = encounter();
  const started = startEncounter(draft);
  const finished = finishEncounter(started);
  assert.throws(() => startEncounter(started));
  assert.throws(() => startEncounter(finished));
  assert.throws(() => startEncounter({ ...draft, participants: [] }));
  assert.throws(() => advanceEncounter(draft));
  assert.throws(() => advanceEncounter(finished));
  assert.throws(() => advanceEncounter({ ...started, currentParticipantId: "missing" }), (error) => error.status === 409);
  assert.throws(() => finishEncounter(draft));
  assert.throws(() => finishEncounter(finished));
});

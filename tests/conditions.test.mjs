import test from "node:test";
import assert from "node:assert/strict";
import {
  conditionInputSchema,
  encounterConditionSchema,
  encounterConditionsSchema,
  makeEncounterCondition,
  MAX_CONDITION_ROUNDS,
  MAX_ENCOUNTER_CONDITIONS,
  tickRoundConditions,
} from "../lib/game/conditions.ts";

const condition = (id, remainingRounds, name = "Atordoado") => ({ id, name, remainingRounds });

test("condition inputs accept named finite or indefinite durations and normalize names", () => {
  assert.deepEqual(conditionInputSchema.parse({ name: "  Atordoado  ", remainingRounds: 2 }), { name: "Atordoado", remainingRounds: 2 });
  assert.equal(conditionInputSchema.parse({ name: "Ferido", remainingRounds: 1 }).remainingRounds, 1);
  assert.equal(conditionInputSchema.parse({ name: "Marcado", remainingRounds: MAX_CONDITION_ROUNDS }).remainingRounds, MAX_CONDITION_ROUNDS);
  assert.equal(conditionInputSchema.parse({ name: "Iluminado", remainingRounds: null }).remainingRounds, null);
  assert.equal(conditionInputSchema.safeParse({ name: "🎲".repeat(40), remainingRounds: 1 }).success, true);
  assert.equal(conditionInputSchema.safeParse({ name: "🎲".repeat(41), remainingRounds: 1 }).success, false);
  const first = makeEncounterCondition("  Amaldiçoado  ", 3);
  const second = makeEncounterCondition("Amaldiçoado", 3);
  assert.equal(first.name, "Amaldiçoado");
  assert.notEqual(first.id, second.id);
  assert.equal(encounterConditionSchema.safeParse(first).success, true);
});

test("condition validation rejects missing fields, invalid durations and duplicate identifiers", () => {
  for (const value of [
    {},
    { name: "Atordoado" },
    { remainingRounds: 2 },
    { name: "", remainingRounds: 2 },
    { name: "   ", remainingRounds: 2 },
    { name: "x".repeat(81), remainingRounds: 2 },
    ...[0, -1, 1.5, 1000, NaN, Infinity, "2", undefined].map((remainingRounds) => ({ name: "Atordoado", remainingRounds })),
  ]) assert.equal(conditionInputSchema.safeParse(value).success, false, JSON.stringify(value));

  assert.equal(encounterConditionSchema.safeParse({ name: "Marcado", remainingRounds: null }).success, false);
  assert.equal(encounterConditionSchema.safeParse(condition("", 2)).success, false);
  assert.equal(encounterConditionSchema.safeParse(condition("x".repeat(101), 2)).success, false);
  const list = Array.from({ length: MAX_ENCOUNTER_CONDITIONS }, (_, index) => condition(`condition-${index}`, 1));
  assert.equal(encounterConditionsSchema.safeParse(list).success, true);
  assert.equal(encounterConditionsSchema.safeParse([...list, condition("extra", 1)]).success, false);
  assert.equal(encounterConditionsSchema.safeParse([condition("same", 1), condition("same", 2)]).success, false);
  assert.equal(encounterConditionsSchema.safeParse([]).success, true);
});

test("round transitions decrement finite conditions, expire the last round and preserve indefinite conditions", () => {
  const participants = [{
    sheetId: "hero",
    name: "Herói",
    initiative: 18,
    conditions: [condition("stunned", 2), condition("dazzled", 1), condition("marked", null)],
  }];
  const next = tickRoundConditions(participants);
  assert.deepEqual(next[0].conditions, [condition("stunned", 1), condition("marked", null)]);
  assert.equal(next[0].sheetId, "hero");
  assert.equal(next[0].initiative, 18);
  assert.deepEqual(tickRoundConditions(next)[0].conditions, [condition("marked", null)]);
  assert.deepEqual(tickRoundConditions(tickRoundConditions(next))[0].conditions, [condition("marked", null)]);
});

test("round transitions do not mutate stored participants and preserve older encounters without conditions", () => {
  const finite = Object.freeze(condition("finite", 3));
  const indefinite = Object.freeze(condition("indefinite", null));
  const original = Object.freeze([
    Object.freeze({ sheetId: "hero", conditions: Object.freeze([finite, indefinite]) }),
    Object.freeze({ sheetId: "npc" }),
    Object.freeze({ sheetId: "monster", conditions: Object.freeze([]) }),
  ]);
  const result = tickRoundConditions(original);
  assert.notEqual(result, original);
  assert.notEqual(result[0], original[0]);
  assert.notEqual(result[0].conditions, original[0].conditions);
  assert.notEqual(result[0].conditions[0], finite);
  assert.notEqual(result[0].conditions[1], indefinite);
  assert.equal(original[0].conditions[0].remainingRounds, 3);
  assert.equal(original[0].conditions[1].remainingRounds, null);
  assert.deepEqual(result[1], { sheetId: "npc" });
  assert.equal(Object.hasOwn(result[1], "conditions"), false);
  assert.deepEqual(result[2].conditions, []);
  assert.deepEqual(tickRoundConditions([]), []);
});

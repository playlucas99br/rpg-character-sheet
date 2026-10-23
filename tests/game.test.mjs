import test from "node:test";
import assert from "node:assert/strict";
import {
  parseFormula,
  evaluateFormula,
  attributeFormula,
  resolveRoll,
  secureDie,
} from "../lib/game/dice.ts";
import { newSheet, SYSTEMS } from "../lib/game/systems.ts";
import { sheetSchema } from "../lib/game/validation.ts";
import {
  canReadSheet,
  canEditSheet,
  canCreateMonster,
  canSeeRoll,
} from "../lib/game/access.ts";

const seq = (...values) => {
  let i = 0;
  return () => values[i++];
};
test("sum, highest and lowest dice are resolved before the bonus", () => {
  assert.equal(evaluateFormula("2d6+3", seq(2, 5)).total, 10);
  assert.equal(evaluateFormula("3d20kh1+5", seq(4, 19, 9)).total, 24);
  assert.equal(evaluateFormula("2d20kl1-2", seq(12, 5)).total, 3);
  assert.equal(parseFormula(" d20 + 5 ").count, 1);
});
test("invalid or expensive formulas cannot execute code or unbounded work", () => {
  for (const formula of [
    "0d20",
    "31d20",
    "100d6",
    "1d0",
    "1d1",
    "1d1001",
    "1d20+1001",
    "1d20-1001",
    "Math.random()",
    "1d20;fetch('/api')",
    "1d20+2d6",
    "2d20kh2",
    "",
  ])
    assert.throws(() => parseFormula(formula));
});
test("Ordem attributes use a dice pool and zero uses the lower of two dice", () => {
  const s = newSheet("ordem", "c", "u", "Player");
  s.attributes.AGI = 3;
  assert.equal(attributeFormula(s, "AGI", 5), "3d20kh1+5");
  s.attributes.AGI = 0;
  assert.equal(attributeFormula(s, "AGI", 10), "2d20kl1+10");
  const skill = s.skills.find((k) => k.attribute === "AGI");
  skill.bonus = 5;
  const roll = resolveRoll(s, { kind: "skill", id: skill.id }, seq(17, 3));
  assert.equal(roll.total, 8);
  assert.deepEqual(roll.dice, [17, 3]);
});
test("Jujutsu keeps the Ordem mechanics and D&D uses an attribute modifier", () => {
  const j = newSheet("jujutsu", "c", "u", "Player");
  j.attributes.FOR = 3;
  assert.equal(attributeFormula(j, "FOR", 5), "3d20kh1+5");
  const d = newSheet("dnd", "c", "u", "Player");
  d.attributes.FOR = 15;
  assert.equal(attributeFormula(d, "FOR", 3), "1d20+5");
  d.attributes.FOR = 9;
  assert.equal(attributeFormula(d, "FOR"), "1d20-1");
});
test("critical results depend on natural dice, not the modifier", () => {
  assert.equal(evaluateFormula("1d20+10", seq(10)).critical, false);
  assert.equal(evaluateFormula("2d20kh1-5", seq(1, 20)).critical, true);
  assert.equal(evaluateFormula("2d20kl1+9", seq(1, 20)).fumble, true);
  assert.equal(evaluateFormula("2d6+8", seq(6, 6)).critical, false);
});
test("attack hit uses its skill and damage uses its own expression", () => {
  const s = newSheet("ordem", "c", "u", "Player");
  s.attributes.FOR = 2;
  s.skills[0].attribute = "FOR";
  s.skills[0].bonus = 5;
  s.attacks = [
    {
      id: "a",
      name: "Lâmina",
      skillId: s.skills[0].id,
      damage: "2d8+3",
      critical: 19,
      range: "Curto",
      description: "",
    },
  ];
  const hit = resolveRoll(s, { kind: "attack", id: "a" }, seq(19, 4));
  assert.equal(hit.total, 24);
  assert.equal(hit.critical, true);
  const damage = resolveRoll(
    s,
    { kind: "attack", id: "a", damage: true },
    seq(7, 5),
  );
  assert.equal(damage.total, 15);
  assert.equal(damage.formula, "2d8+3");
});
test("percentile rolls compare against the skill target, including the boundary", () => {
  const s = newSheet("cthulhu", "c", "u", "Player");
  s.skills[0].bonus = 45;
  assert.equal(
    resolveRoll(s, { kind: "skill", id: s.skills[0].id }, seq(45)).success,
    true,
  );
  assert.equal(
    resolveRoll(s, { kind: "skill", id: s.skills[0].id }, seq(46)).success,
    false,
  );
  assert.equal(
    resolveRoll(s, { kind: "attribute", id: "FOR" }, seq(50)).target,
    50,
  );
});
test("unknown skill/attack references and invalid attributes fail instead of rolling", () => {
  const s = newSheet("ordem", "c", "u", "Player");
  assert.throws(() => resolveRoll(s, { kind: "skill", id: "other" }));
  assert.throws(() => resolveRoll(s, { kind: "attack", id: "other" }));
  assert.throws(() => resolveRoll(s, { kind: "attribute", id: "other" }));
  assert.throws(() => resolveRoll(null, { kind: "skill", id: "a" }));
});
test("players can edit only their own characters, GMs can manage the full campaign", () => {
  const own = { ownerId: "u", type: "character" },
    other = { ownerId: "other", type: "character" },
    monster = { ownerId: "u", type: "monster" };
  assert.equal(canReadSheet("u", "player", own), true);
  assert.equal(canEditSheet("u", "player", other), false);
  assert.equal(canReadSheet("u", "player", monster), false);
  assert.equal(canReadSheet("u", "gm", other), true);
  assert.equal(canReadSheet("u", null, own), false);
  assert.equal(canCreateMonster("player"), false);
  assert.equal(canCreateMonster("gm"), true);
  assert.equal(
    canSeeRoll("u", "player", { userId: "other", visibility: "gm" }),
    false,
  );
  assert.equal(
    canSeeRoll("u", "gm", { userId: "other", visibility: "gm" }),
    true,
  );
  assert.equal(
    canSeeRoll("u", "player", { userId: "other", visibility: "table" }),
    true,
  );
});
test("all system templates validate; overfull resources and broken attack references fail", () => {
  for (const system of SYSTEMS)
    assert.equal(
      sheetSchema.safeParse(newSheet(system.id, "c", "u", "Player")).success,
      true,
      system.id,
    );
  const s = newSheet("ordem", "c", "u", "Player");
  s.resources.hp.current = 999;
  assert.equal(sheetSchema.safeParse(s).success, false);
  s.resources.hp.current = 1;
  s.attacks = [
    {
      id: "a",
      name: "Arma",
      skillId: "missing",
      damage: "1d6",
      critical: 20,
      range: "",
      description: "",
    },
  ];
  assert.equal(sheetSchema.safeParse(s).success, false);
});
test("secure dice stay within bounds", () => {
  for (const sides of [4, 6, 8, 20, 100, 1000])
    for (let i = 0; i < 100; i++) {
      const value = secureDie(sides);
      assert.ok(Number.isInteger(value) && value >= 1 && value <= sides);
    }
});

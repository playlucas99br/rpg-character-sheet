import test from "node:test";
import assert from "node:assert/strict";
import { newSheet } from "../lib/game/systems.ts";
import {
  MAX_TECHNIQUE_COUNTERS,
  abilityTrackingSchema,
  optionalAbilityTrackingSchema,
  techniqueControlSchema,
  hasTechniqueTracking,
  availabilityWarning,
  useAbility as consumeAbility,
  resetCombatTechniques,
  advanceTechniqueCooldowns,
  adjustTechniqueCounter,
} from "../lib/game/techniques.ts";

function makeSheet(tracking) {
  const sheet = newSheet("jujutsu", "campaign", "owner", "Jogador");
  sheet.resources.ep = { current: 12, max: 20 };
  sheet.abilities = [{
    id: "technique", name: "Espada da sorte", cost: 2, formula: "2d6", description: "",
    ...(tracking === undefined ? {} : { tracking }),
  }];
  return sheet;
}

function tracking() {
  return {
    uses: { current: 3, max: 3 },
    cooldown: { rounds: 2, remaining: 0 },
    counters: [{ id: "luck", name: "Sorte", current: 2, max: 5 }],
  };
}

function freeze(value) {
  Object.freeze(value);
  for (const nested of Object.values(value))
    if (nested && typeof nested === "object" && !Object.isFrozen(nested)) freeze(nested);
  return value;
}

test("tracking accepts omitted or explicitly removed configuration and bounded optional controls", () => {
  assert.equal(optionalAbilityTrackingSchema.parse(undefined), undefined);
  assert.equal(optionalAbilityTrackingSchema.parse(null), null);
  assert.deepEqual(abilityTrackingSchema.parse({}), {});
  assert.deepEqual(abilityTrackingSchema.parse(tracking()), tracking());
  assert.equal(hasTechniqueTracking(makeSheet().abilities[0]), false);
  assert.equal(hasTechniqueTracking(makeSheet(null).abilities[0]), false);
  assert.equal(hasTechniqueTracking(makeSheet({}).abilities[0]), false);
  assert.equal(hasTechniqueTracking(makeSheet(tracking()).abilities[0]), true);
});

test("tracking rejects impossible balances, fractional counts and invalid cooldowns", () => {
  const invalid = [
    { uses: { current: -1, max: 3 } },
    { uses: { current: 4, max: 3 } },
    { uses: { current: 1.5, max: 3 } },
    { uses: { current: 0, max: 0 } },
    { uses: { current: 0, max: 10000 } },
    { cooldown: { rounds: 0, remaining: 0 } },
    { cooldown: { rounds: 2, remaining: 3 } },
    { cooldown: { rounds: 1000, remaining: 0 } },
    { cooldown: { rounds: 2, remaining: -1 } },
    { counters: [{ id: "luck", name: " ", current: 0, max: 1 }] },
    { counters: [{ id: "luck", name: "Sorte", current: 2, max: 1 }] },
    { counters: [{ id: "luck", name: "Sorte", current: 0, max: 0 }] },
  ];
  for (const value of invalid) assert.equal(abilityTrackingSchema.safeParse(value).success, false, JSON.stringify(value));
});

test("custom counters are bounded to eight and duplicate identifiers cannot alias a balance", () => {
  const counters = Array.from({ length: MAX_TECHNIQUE_COUNTERS }, (_, index) => ({
    id: `counter-${index}`, name: `Contador ${index}`, current: 0, max: 9,
  }));
  assert.equal(abilityTrackingSchema.safeParse({ counters }).success, true);
  assert.equal(abilityTrackingSchema.safeParse({ counters: [...counters, { ...counters[0], id: "extra" }] }).success, false);
  assert.equal(abilityTrackingSchema.safeParse({ counters: [counters[0], counters[0]] }).success, false);
});

test("legacy techniques remain unlimited and consume exactly their energy cost", () => {
  const before = freeze(makeSheet());
  const used = consumeAbility(before, "technique");
  assert.equal(used.resources.ep.current, 10);
  assert.equal(before.resources.ep.current, 12);
  assert.equal(Object.hasOwn(used.abilities[0], "tracking"), false);
  assert.deepEqual(used.resources.hp, before.resources.hp);
  assert.deepEqual(used.resources.sanity, before.resources.sanity);
  assert.equal(used.version, before.version, "persistence owns the version increment");
  assert.equal(consumeAbility(consumeAbility(used, "technique"), "technique").resources.ep.current, 6);
});

test("using a configured technique charges energy, one use and cooldown in one immutable transition", () => {
  const before = freeze(makeSheet(tracking()));
  const used = consumeAbility(before, "technique");
  assert.equal(used.resources.ep.current, 10);
  assert.deepEqual(used.abilities[0].tracking.uses, { current: 2, max: 3 });
  assert.deepEqual(used.abilities[0].tracking.cooldown, { rounds: 2, remaining: 2 });
  assert.deepEqual(used.abilities[0].tracking.counters, tracking().counters);
  assert.deepEqual(before.abilities[0].tracking, tracking());
  assert.throws(() => consumeAbility(used, "technique"), /recarga.*2 rodadas/);
});

test("an unavailable technique never charges energy, uses or custom counters", () => {
  for (const reason of ["energy", "uses", "cooldown"]) {
    const sheet = makeSheet(tracking());
    if (reason === "energy") sheet.resources.ep.current = 1;
    if (reason === "uses") sheet.abilities[0].tracking.uses.current = 0;
    if (reason === "cooldown") sheet.abilities[0].tracking.cooldown.remaining = 1;
    const before = structuredClone(sheet);
    freeze(sheet);
    assert.throws(() => consumeAbility(sheet, "technique"));
    assert.deepEqual(sheet, before, reason);
  }
});

test("free techniques still respect configured uses and cooldowns at zero energy", () => {
  const sheet = makeSheet({ uses: { current: 1, max: 1 } });
  sheet.abilities[0].cost = 0;
  sheet.resources.ep.current = 0;
  const used = consumeAbility(sheet, "technique");
  assert.equal(used.resources.ep.current, 0);
  assert.equal(used.abilities[0].tracking.uses.current, 0);
  assert.throws(() => consumeAbility(used, "technique"), /Sem usos/);
});

test("per-combat limits permit exactly the configured number of uses", () => {
  let sheet = makeSheet({ uses: { current: 3, max: 3 } });
  for (let remaining = 2; remaining >= 0; remaining--) {
    sheet = consumeAbility(sheet, "technique");
    assert.equal(sheet.abilities[0].tracking.uses.current, remaining);
  }
  assert.equal(sheet.resources.ep.current, 6);
  assert.throws(() => consumeAbility(sheet, "technique"), /Sem usos/);
});

test("manual cooldown advance affects every running technique once and stops at zero", () => {
  const sheet = consumeAbility(makeSheet(tracking()), "technique");
  sheet.abilities.push({ ...sheet.abilities[0], id: "other", tracking: { cooldown: { rounds: 1, remaining: 1 } } });
  freeze(sheet);
  const next = advanceTechniqueCooldowns(sheet);
  assert.equal(next.abilities[0].tracking.cooldown.remaining, 1);
  assert.equal(next.abilities[1].tracking.cooldown.remaining, 0);
  assert.equal(sheet.abilities[0].tracking.cooldown.remaining, 2);
  assert.deepEqual(next.resources, sheet.resources);
  assert.deepEqual(next.abilities[0].tracking.uses, sheet.abilities[0].tracking.uses);
  assert.deepEqual(next.abilities[0].tracking.counters, sheet.abilities[0].tracking.counters);
  const ready = advanceTechniqueCooldowns(advanceTechniqueCooldowns(next));
  assert.ok(ready.abilities.every((ability) => ability.tracking.cooldown.remaining === 0));
  assert.equal(availabilityWarning(ready, ready.abilities[0]), null);
  assert.equal(consumeAbility(ready, "technique").abilities[0].tracking.cooldown.remaining, 2);
});

test("new combat restores uses and releases cooldowns without restoring energy or counters", () => {
  const used = freeze(consumeAbility(makeSheet(tracking()), "technique"));
  const reset = resetCombatTechniques(used);
  assert.deepEqual(reset.abilities[0].tracking.uses, { current: 3, max: 3 });
  assert.deepEqual(reset.abilities[0].tracking.cooldown, { rounds: 2, remaining: 0 });
  assert.deepEqual(reset.resources, used.resources);
  assert.deepEqual(reset.abilities[0].tracking.counters, used.abilities[0].tracking.counters);
  assert.equal(used.abilities[0].tracking.uses.current, 2);
});

test("counter adjustments accept exact boundaries and preserve other technique balances", () => {
  const before = freeze(makeSheet(tracking()));
  const consumed = adjustTechniqueCounter(before, "technique", "luck", -2);
  assert.equal(consumed.abilities[0].tracking.counters[0].current, 0);
  const filled = adjustTechniqueCounter(consumed, "technique", "luck", 5);
  assert.equal(filled.abilities[0].tracking.counters[0].current, 5);
  assert.equal(before.abilities[0].tracking.counters[0].current, 2);
  assert.deepEqual(filled.resources, before.resources);
  assert.deepEqual(filled.abilities[0].tracking.uses, before.abilities[0].tracking.uses);
  assert.deepEqual(filled.abilities[0].tracking.cooldown, before.abilities[0].tracking.cooldown);
});

test("counter underflow and overflow reject the whole adjustment", () => {
  const sheet = freeze(makeSheet(tracking()));
  const before = structuredClone(sheet);
  assert.throws(() => adjustTechniqueCounter(sheet, "technique", "luck", -3), /insuficiente/);
  assert.throws(() => adjustTechniqueCounter(sheet, "technique", "luck", 4), /máximo/);
  assert.deepEqual(sheet, before);
});

test("counter input rejects nonintegral, unbounded and zero deltas", () => {
  const sheet = freeze(makeSheet(tracking()));
  for (const delta of [0, 0.5, -0.5, NaN, Infinity, 10000, -10000, "1"])
    assert.throws(() => adjustTechniqueCounter(sheet, "technique", "luck", delta));
  assert.equal(techniqueControlSchema.safeParse({ kind: "reset_combat" }).success, true);
  assert.equal(techniqueControlSchema.safeParse({ kind: "advance_cooldown" }).success, true);
  assert.equal(techniqueControlSchema.safeParse({ kind: "invented" }).success, false);
});

test("unknown ability and counter identifiers cannot change another control", () => {
  const sheet = freeze(makeSheet(tracking()));
  const before = structuredClone(sheet);
  assert.throws(() => consumeAbility(sheet, "missing"), (error) => error.status === 404);
  assert.throws(() => adjustTechniqueCounter(sheet, "missing", "luck", 1), (error) => error.status === 404);
  assert.throws(() => adjustTechniqueCounter(sheet, "technique", "missing", 1), (error) => error.status === 404);
  assert.deepEqual(sheet, before);
});

test("counter-only tracking does not limit use or reset a custom resource automatically", () => {
  const sheet = makeSheet({ counters: [{ id: "luck", name: "Sorte", current: 0, max: 3 }] });
  const used = consumeAbility(sheet, "technique");
  assert.equal(used.resources.ep.current, 10);
  assert.equal(used.abilities[0].tracking.counters[0].current, 0);
  assert.deepEqual(resetCombatTechniques(used).abilities, used.abilities);
  assert.deepEqual(advanceTechniqueCooldowns(used).abilities, used.abilities);
});

test("manual controls preserve absent and null legacy tracking instead of adding restrictions", () => {
  for (const value of [undefined, null]) {
    const sheet = freeze(makeSheet(value));
    assert.deepEqual(resetCombatTechniques(sheet).abilities, sheet.abilities);
    assert.deepEqual(advanceTechniqueCooldowns(sheet).abilities, sheet.abilities);
    const used = consumeAbility(sheet, "technique");
    assert.equal(used.abilities[0].tracking, value);
  }
});

test("availability explains the blocked technique and uses singular cooldown wording", () => {
  const sheet = makeSheet(tracking());
  assert.equal(availabilityWarning(sheet, sheet.abilities[0]), null);
  sheet.abilities[0].tracking.cooldown.remaining = 1;
  assert.match(availabilityWarning(sheet, sheet.abilities[0]), /Espada da sorte.*1 rodada\./);
  sheet.abilities[0].tracking.uses.current = 0;
  assert.match(availabilityWarning(sheet, sheet.abilities[0]), /Sem usos.*Espada da sorte/);
  sheet.resources.ep.current = 1;
  assert.match(availabilityWarning(sheet, sheet.abilities[0]), /Energia insuficiente.*Disponível: 1; custo: 2/);
});

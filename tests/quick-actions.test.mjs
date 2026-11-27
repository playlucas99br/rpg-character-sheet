import test from "node:test";
import assert from "node:assert/strict";
import { quickResourceChange } from "../lib/game/quick-actions.ts";

const sheet = {
  resources: {
    hp: { current: 12, max: 20 },
    ep: { current: 7, max: 10 },
    sanity: { current: 20, max: 30 },
  },
};

test("quick actions map damage, healing and energy to the existing resource mutation", () => {
  assert.deepEqual(quickResourceChange(sheet, "damage", 5), { key: "hp", delta: -5, next: 7 });
  assert.deepEqual(quickResourceChange(sheet, "heal", 5), { key: "hp", delta: 5, next: 17 });
  assert.deepEqual(quickResourceChange(sheet, "spend", 3), { key: "ep", delta: -3, next: 4 });
  assert.equal(sheet.resources.hp.current, 12, "a preview never changes the saved sheet");
  assert.equal(sheet.resources.ep.current, 7);
  assert.equal(sheet.resources.sanity.current, 20);
});

test("quick actions preview the same zero and maximum limits used by sheets", () => {
  assert.equal(quickResourceChange(sheet, "damage", 9999).next, 0);
  assert.equal(quickResourceChange(sheet, "heal", 9999).next, 20);
  assert.equal(quickResourceChange(sheet, "spend", 9999).next, 0);
  assert.equal(quickResourceChange({ resources: { ...sheet.resources, hp: { current: 0, max: 20 } } }, "damage", 1).next, 0);
});

test("quick actions reject blank, fractional, nonfinite and out-of-range amounts", () => {
  for (const amount of [0, -1, 0.5, 1.5, 10000, NaN, Infinity, -Infinity]) {
    for (const action of ["damage", "heal", "spend"]) {
      assert.equal(quickResourceChange(sheet, action, amount), null);
    }
  }
  assert.ok(quickResourceChange(sheet, "damage", 1));
  assert.ok(quickResourceChange(sheet, "damage", 9999));
});

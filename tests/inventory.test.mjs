import test from "node:test";
import assert from "node:assert/strict";
import {
  formatInventoryWeight,
  inventoryItemSchema,
  inventoryItemsSchema,
  inventoryWeight,
  MAX_INVENTORY_ITEMS,
  MAX_ITEM_QUANTITY,
  MAX_ITEM_WEIGHT,
} from "../lib/game/inventory.ts";

const item = (overrides = {}) => ({
  id: "item-1",
  name: "Katana",
  quantity: 1,
  weight: 1.25,
  equipped: true,
  ...overrides,
});

test("structured inventory accepts item details, normalizes names and keeps zero quantity", () => {
  assert.deepEqual(inventoryItemSchema.parse(item({ id: " item-1 ", name: " Katana ", description: "Arma herdada" })), item({ description: "Arma herdada" }));
  assert.equal(inventoryItemSchema.parse(item({ quantity: 0, weight: 0, equipped: false })).quantity, 0);
  assert.equal(inventoryItemSchema.parse(item({ quantity: MAX_ITEM_QUANTITY, weight: MAX_ITEM_WEIGHT })).weight, MAX_ITEM_WEIGHT);
  assert.equal(inventoryItemSchema.parse(item({ weight: 0.001 })).weight, 0.001);
  assert.equal(inventoryItemSchema.parse(item({ weight: 0.123 })).weight, 0.123);
  assert.equal(inventoryItemSchema.parse(item({ weight: 9.999 })).weight, 9.999);
});

test("structured inventory rejects invalid amounts, weights, flags and text", () => {
  const invalid = [
    { id: "" }, { id: " " }, { id: "x".repeat(101) },
    { name: "" }, { name: " " }, { name: "x".repeat(101) },
    { description: "x".repeat(2001) },
    ...[-1, 0.5, MAX_ITEM_QUANTITY + 1, NaN, Infinity, "1", null].map((quantity) => ({ quantity })),
    ...[-0.001, 0.0001, 1.2345, MAX_ITEM_WEIGHT + 1, NaN, Infinity, "1", null].map((weight) => ({ weight })),
    ...[0, 1, "true", null, undefined].map((equipped) => ({ equipped })),
  ];
  for (const value of invalid) assert.equal(inventoryItemSchema.safeParse(item(value)).success, false, JSON.stringify(value));
});

test("inventory lists enforce unique normalized identifiers and at most 100 entries", () => {
  assert.deepEqual(inventoryItemsSchema.parse([]), []);
  const full = Array.from({ length: MAX_INVENTORY_ITEMS }, (_, index) => item({ id: `item-${index}` }));
  assert.equal(inventoryItemsSchema.safeParse(full).success, true);
  assert.equal(inventoryItemsSchema.safeParse([...full, item({ id: "extra" })]).success, false);
  const duplicate = inventoryItemsSchema.safeParse([item(), item({ id: " item-1 ", name: "Duplicado" })]);
  assert.equal(duplicate.success, false);
  assert.deepEqual(duplicate.error.issues[0].path, [1, "id"]);
});

test("weight totals multiply physical quantity and round decimal arithmetic without mutating items", () => {
  const first = Object.freeze(item({ quantity: 3, weight: 0.1 }));
  const second = Object.freeze(item({ id: "item-2", quantity: 2, weight: 0.123, equipped: false }));
  const empty = Object.freeze(item({ id: "empty", quantity: 0, weight: 9999 }));
  const entries = Object.freeze([first, second, empty]);
  assert.equal(inventoryWeight(entries), 0.546);
  assert.equal(inventoryWeight([first]), 0.3);
  assert.equal(inventoryWeight([]), 0);
  assert.equal(inventoryWeight(), 0);
  assert.equal(inventoryWeight([item({ quantity: MAX_ITEM_QUANTITY, weight: MAX_ITEM_WEIGHT })]), MAX_ITEM_QUANTITY * MAX_ITEM_WEIGHT);
  assert.equal(first.weight, 0.1);
  assert.equal(second.equipped, false);
  assert.equal(formatInventoryWeight(0.123), "0,123");
});

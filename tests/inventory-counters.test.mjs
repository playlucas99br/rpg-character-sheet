import test from "node:test";
import assert from "node:assert/strict";
import {
  adjustInventoryCounter,
  adjustInventoryCounterSchema,
  inventoryCounterLabel,
  inventoryCounterSchema,
  inventoryCounterWarning,
} from "../lib/game/inventory-counters.ts";

const item = (kind = "ammunition") => ({
  id: "pistol", name: "Pistola", quantity: 2, weight: 1.2, equipped: true,
  description: "Duas unidades físicas; contador manual do carregador atual.",
  counter: { kind, current: 6, max: 10 },
});

test("inventory counters consume and replenish exact amounts without changing equipment or quantity", () => {
  for (const kind of ["ammunition", "charges", "consumable"]) {
    const source = item(kind);
    const before = structuredClone(source);
    const empty = adjustInventoryCounter(source, "consume", 6);
    assert.equal(empty.counter.current, 0);
    assert.notEqual(empty, source);
    assert.notEqual(empty.counter, source.counter);
    assert.equal(empty.quantity, source.quantity);
    assert.equal(empty.equipped, source.equipped);
    assert.equal(empty.description, source.description);
    assert.deepEqual(source, before);
    const full = adjustInventoryCounter(empty, "replenish", 10);
    assert.equal(full.counter.current, 10);
    assert.equal(empty.counter.current, 0);
    const spent = adjustInventoryCounter(full, "consume", 1);
    assert.equal(spent.counter.current, 9);
  }
});

test("insufficient uses and overfilling fail without silently clamping or mutating the item", () => {
  const source = item();
  const before = structuredClone(source);
  assert.match(inventoryCounterWarning(source.counter, "consume", 7), /Saldo insuficiente.*Disponível: 6/);
  assert.match(inventoryCounterWarning(source.counter, "replenish", 5), /supera o máximo.*Espaço disponível: 4/);
  assert.throws(() => adjustInventoryCounter(source, "consume", 7), /Saldo insuficiente/);
  assert.throws(() => adjustInventoryCounter(source, "replenish", 5), /supera o máximo/);
  assert.deepEqual(source, before);
  assert.equal(inventoryCounterWarning(source.counter, "consume", 6), null);
  assert.equal(inventoryCounterWarning(source.counter, "replenish", 4), null);
});

test("counter mutations require a configured counter and bounded positive integers", () => {
  for (const amount of [0, -1, 0.1, NaN, Infinity, 10000, "1", null]) {
    assert.throws(() => adjustInventoryCounter(item(), "consume", amount));
    assert.match(inventoryCounterWarning(item().counter, "consume", amount), /quantidade inteira/);
  }
  assert.throws(() => adjustInventoryCounter(item(), "refill", 1));
  assert.throws(() => adjustInventoryCounter({ ...item(), counter: undefined }, "consume", 1), /não possui/);
  assert.throws(() => adjustInventoryCounter({ ...item(), counter: null }, "consume", 1), /não possui/);
  assert.throws(() => adjustInventoryCounter({ ...item(), counter: { kind: "charges", current: 11, max: 10 } }, "consume", 1));
});

test("counter validation accepts all kinds and rejects invalid balances, sizes and labels", () => {
  for (const kind of ["ammunition", "charges", "consumable"]) {
    assert.equal(inventoryCounterSchema.safeParse({ kind, current: 0, max: 1 }).success, true);
    assert.equal(inventoryCounterSchema.safeParse({ kind, current: 9999, max: 9999, label: "  Cartuchos  " }).success, true);
  }
  for (const counter of [
    { kind: "unknown", current: 0, max: 1 },
    { kind: "charges", current: -1, max: 1 },
    { kind: "charges", current: 2, max: 1 },
    { kind: "charges", current: 0, max: 0 },
    { kind: "charges", current: 0.5, max: 1 },
    { kind: "charges", current: 0, max: 1.5 },
    { kind: "charges", current: 0, max: 10000 },
    { kind: "charges", current: 0, max: 1, label: "x".repeat(81) },
  ]) assert.equal(inventoryCounterSchema.safeParse(counter).success, false);
  assert.equal(inventoryCounterLabel({ kind: "ammunition", current: 0, max: 1 }), "Munição");
  assert.equal(inventoryCounterLabel({ kind: "charges", current: 0, max: 1 }), "Cargas");
  assert.equal(inventoryCounterLabel({ kind: "consumable", current: 0, max: 1, label: "  Poções  " }), "Poções");
  assert.equal(inventoryCounterLabel({ kind: "consumable", current: 0, max: 1, label: " " }), "Usos");
});

test("the action contract requires item identity and an explicit optimistic version", () => {
  const action = { sheetId: "sheet", itemId: "item", version: 3, operation: "consume", amount: 1 };
  assert.deepEqual(adjustInventoryCounterSchema.parse(action), action);
  for (const patch of [{ sheetId: "" }, { itemId: "" }, { version: undefined }, { version: 0 }, { version: 0.5 }, { version: Number.MAX_SAFE_INTEGER + 1 }, { amount: 0 }, { operation: "set" }])
    assert.equal(adjustInventoryCounterSchema.safeParse({ ...action, ...patch }).success, false);
});

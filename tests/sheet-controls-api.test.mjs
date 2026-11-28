import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers" || specifier === "@/lib/runtime-env")
      return { url: new URL("./cloudflare.mjs", import.meta.url).href, shortCircuit: true };
    if (specifier === "next/headers" || specifier === "next/navigation")
      return { url: new URL("./request-context.mjs", import.meta.url).href, shortCircuit: true };
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier))
        return nextResolve(`${specifier}.ts`, context);
      throw error;
    }
  },
});
const { env } = await import("./cloudflare.mjs");
const { fixture } = await import("./request-context.mjs");
const { GET, POST } = await import("../app/api/game/route.ts");

class LocalD1 {
  constructor(sqlite) { this.sqlite = sqlite; }
  prepare(query) {
    const db = this.sqlite;
    return {
      values: [],
      bind(...values) { this.values = values; return this; },
      async first() { return db.prepare(query).get(...this.values) ?? null; },
      async all() { return { success: true, results: db.prepare(query).all(...this.values) }; },
      async run() {
        const result = db.prepare(query).run(...this.values);
        return { success: true, results: [], meta: { changes: Number(result.changes) } };
      },
    };
  }
  async batch(statements) {
    this.sqlite.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

const origin = "https://sheet-controls.example.test";
async function request(userId, body) {
  fixture.headers = new Headers(userId ? {
    "oai-authenticated-user-id": userId,
    "oai-authenticated-user-email": `${userId}@example.test`,
  } : {});
  const response = body ? await POST(new Request(`${origin}/api/game`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  })) : await GET();
  return { status: response.status, data: await response.json() };
}

async function gameFixture(run) {
  const sqlite = new DatabaseSync(":memory:");
  env.DB = new LocalD1(sqlite);
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url)).filter((name) => name.endsWith(".sql")).sort())
    sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  try {
    const created = await request("gm", { action: "create_campaign", campaign: { name: "Equipamento e técnicas", description: "", system: "jujutsu", banner: "shrine" } });
    assert.equal(created.status, 200);
    const campaignId = created.data.result.id;
    const code = created.data.campaigns[0].inviteCode;
    for (const id of ["player", "other-player"]) assert.equal((await request(id, { action: "join", code })).status, 200);
    const result = await request("player", { action: "create_sheet", campaignId, type: "character", name: "Ficha da mesa" });
    assert.equal(result.status, 200);
    await run({ campaignId, sheet: result.data.sheets.find((s) => s.id === result.data.result.id), sqlite });
  } finally { delete env.DB; sqlite.close(); }
}
const savedSheet = (result, id) => result.data.sheets.find((s) => s.id === id);
const edit = (user, sheet) => request(user, { action: "update_sheet", sheetId: sheet.id, version: sheet.version, sheet });

test("structured inventory persists with legacy notes, authorization and optimistic versions", async () => gameFixture(async ({ sheet }) => {
  const item = { id: "sword", name: "Espada", quantity: 2, weight: 1.125, equipped: true, description: "Presente da mesa" };
  const changed = { ...sheet, inventory: "Dinheiro antigo e corda", notes: "Pista intacta", inventoryItems: [item] };
  for (const user of [null, "other-player", "outsider"]) assert.equal((await edit(user, changed)).status, user ? 403 : 401);
  const saved = await edit("player", changed);
  assert.equal(saved.status, 200, saved.data.error);
  const current = savedSheet(saved, sheet.id);
  assert.deepEqual(current.inventoryItems, [item]);
  assert.equal(current.inventory, changed.inventory);
  assert.equal(current.version, sheet.version + 1);
  assert.equal((await edit("gm", changed)).status, 409);
  const fromDatabase = savedSheet(await request("gm"), sheet.id);
  assert.deepEqual(fromDatabase.inventoryItems, [item]);
  const oldClient = { ...current, notes: "Edição de cliente antigo" };
  delete oldClient.inventoryItems;
  const legacyEdit = await edit("player", oldClient);
  assert.equal(legacyEdit.status, 200);
  assert.deepEqual(savedSheet(legacyEdit, sheet.id).inventoryItems, [item], "missing optional inventory cannot erase newer saved items");
  const invalid = { ...savedSheet(legacyEdit, sheet.id), inventoryItems: [{ ...item, quantity: -1 }] };
  assert.equal((await edit("player", invalid)).status, 400);
  const cleared = await edit("gm", { ...savedSheet(legacyEdit, sheet.id), inventoryItems: [] });
  assert.equal(cleared.status, 200);
  assert.deepEqual(savedSheet(cleared, sheet.id).inventoryItems, []);
  assert.equal(savedSheet(cleared, sheet.id).inventory, changed.inventory);
}));

test("inventory counters persist exact changes, reject limits and stale writes, and preserve omitted counters", async () => gameFixture(async ({ sheet }) => {
  const counter = { kind: "ammunition", label: "Balas", current: 6, max: 10 };
  let response = await edit("player", { ...sheet, inventory: "Texto antigo", inventoryItems: [{ id: "gun", name: "Pistola", quantity: 2, weight: 1.2, equipped: true, counter }] });
  assert.equal(response.status, 200);
  let current = savedSheet(response, sheet.id);
  const adjustment = (s, amount, operation = "consume") => ({ action: "adjust_inventory_counter", sheetId: s.id, itemId: "gun", version: s.version, amount, operation });
  for (const actor of [null, "other-player", "outsider"]) assert.equal((await request(actor, adjustment(current, 1))).status, actor ? 403 : 401);
  const badInputs = [adjustment(current, 7), adjustment(current, 5, "replenish"), adjustment(current, -1), adjustment(current, 1.5), { ...adjustment(current, 1), itemId: "missing" }, { ...adjustment(current, 1), version: undefined }];
  for (const input of badInputs) assert.ok([400, 404].includes((await request("player", input)).status));
  assert.deepEqual(savedSheet(await request("player"), sheet.id), current, "rejected requests leave data and version intact");
  response = await request("player", adjustment(current, 6));
  assert.equal(response.status, 200);
  assert.equal(savedSheet(response, sheet.id).inventoryItems[0].counter.current, 0);
  assert.equal((await request("gm", adjustment(current, 1))).status, 409);
  current = savedSheet(response, sheet.id);
  response = await request("gm", adjustment(current, 10, "replenish"));
  assert.equal(response.status, 200);
  current = savedSheet(response, sheet.id);
  assert.equal(current.inventoryItems[0].counter.current, 10);
  assert.equal(current.inventoryItems[0].quantity, 2);
  const legacy = structuredClone(current);
  delete legacy.inventoryItems[0].counter;
  response = await edit("player", legacy);
  current = savedSheet(response, sheet.id);
  assert.equal(current.inventoryItems[0].counter.current, 10, "editing physical items from an older client keeps tracking by stable item ID");
  response = await edit("player", { ...current, inventoryItems: [{ ...current.inventoryItems[0], counter: null }] });
  current = savedSheet(response, sheet.id);
  assert.equal(current.inventoryItems[0].counter, null);
  assert.equal((await request("player", adjustment(current, 1))).status, 400);
  assert.equal(current.inventory, "Texto antigo");
}));

const technique = (formula = "") => ({ id: "technique", name: "Espada da sorte", cost: 2, formula, description: "Regra da mesa", tracking: { uses: { current: 2, max: 2 }, cooldown: { rounds: 2, remaining: 0 }, counters: [{ id: "luck", name: "Sorte", current: 2, max: 3 }] } });
const techniqueAction = (sheet, control) => ({ action: "technique_control", sheetId: sheet.id, version: sheet.version, control });

test("techniques without dice spend once and manual controls preserve energy and custom counters", async () => gameFixture(async ({ sheet }) => {
  let response = await edit("player", { ...sheet, abilities: [technique()] });
  let current = savedSheet(response, sheet.id);
  const energy = current.resources.ep.current;
  const use = (s) => ({ action: "use_ability", sheetId: s.id, version: s.version, abilityId: "technique" });
  for (const actor of [null, "other-player", "outsider"]) {
    assert.equal((await request(actor, use(current))).status, actor ? 403 : 401);
    assert.equal((await request(actor, techniqueAction(current, { kind: "reset_combat" }))).status, actor ? 403 : 401);
  }
  assert.equal((await request("player", { ...use(current), version: undefined })).status, 400);
  response = await request("player", use(current));
  assert.equal(response.status, 200, response.data.error);
  const stale = current;
  current = savedSheet(response, sheet.id);
  assert.equal(current.resources.ep.current, energy - 2);
  assert.equal(current.abilities[0].tracking.uses.current, 1);
  assert.equal(current.abilities[0].tracking.cooldown.remaining, 2);
  assert.equal(response.data.rolls.length, 0);
  assert.equal((await request("player", use(stale))).status, 409);
  assert.equal((await request("player", use(current))).status, 400, "cooldown rejects before any balance changes");
  assert.deepEqual(savedSheet(await request("player"), sheet.id), current);
  for (const remaining of [1, 0]) {
    response = await request("gm", techniqueAction(current, { kind: "advance_cooldown" }));
    assert.equal(response.status, 200);
    current = savedSheet(response, sheet.id);
    assert.equal(current.abilities[0].tracking.cooldown.remaining, remaining);
    assert.equal(current.resources.ep.current, energy - 2);
  }
  response = await request("player", use(current));
  current = savedSheet(response, sheet.id);
  assert.equal(current.abilities[0].tracking.uses.current, 0);
  const exhausted = structuredClone(current);
  assert.equal((await request("player", use(current))).status, 400);
  assert.deepEqual(savedSheet(await request("player"), sheet.id), exhausted);
  assert.equal((await request("player", techniqueAction(current, { kind: "adjust_counter", abilityId: "technique", counterId: "luck", delta: -3 }))).status, 400);
  response = await request("player", techniqueAction(current, { kind: "adjust_counter", abilityId: "technique", counterId: "luck", delta: -1 }));
  current = savedSheet(response, sheet.id);
  assert.equal(current.abilities[0].tracking.counters[0].current, 1);
  response = await request("gm", techniqueAction(current, { kind: "reset_combat" }));
  assert.equal(response.status, 200);
  current = savedSheet(response, sheet.id);
  assert.equal(current.abilities[0].tracking.uses.current, 2);
  assert.equal(current.abilities[0].tracking.cooldown.remaining, 0);
  assert.equal(current.abilities[0].tracking.counters[0].current, 1);
  assert.equal(current.resources.ep.current, energy - 4);
  const legacy = structuredClone(current);
  delete legacy.abilities[0].tracking;
  response = await edit("player", legacy);
  current = savedSheet(response, sheet.id);
  assert.equal(current.abilities[0].tracking.uses.current, 2, "older ability edits keep tracking by stable ID");
  response = await edit("player", { ...current, abilities: [{ ...current.abilities[0], tracking: null }] });
  assert.equal(savedSheet(response, sheet.id).abilities[0].tracking, null);
}));

test("technique rolls commit energy, uses and history together and reject a concurrent version without recording", async () => gameFixture(async ({ sheet, campaignId, sqlite }) => {
  let response = await edit("player", { ...sheet, abilities: [technique("1d6")] });
  let current = savedSheet(response, sheet.id);
  const energy = current.resources.ep.current;
  const roll = (s) => ({ action: "roll", campaignId, sheetId: s.id, version: s.version, request: { kind: "ability", id: "technique" }, visibility: "table" });
  assert.equal((await request("player", { ...roll(current), version: undefined })).status, 400);
  assert.equal((await request("player", { action: "use_ability", sheetId: sheet.id, version: current.version, abilityId: "technique" })).status, 400, "a formula technique cannot bypass its roll");
  response = await request("player", roll(current));
  assert.equal(response.status, 200, response.data.error);
  const stale = current;
  current = savedSheet(response, sheet.id);
  assert.equal(current.resources.ep.current, energy - 2);
  assert.equal(current.abilities[0].tracking.uses.current, 1);
  assert.equal(current.abilities[0].tracking.cooldown.remaining, 2);
  assert.equal(response.data.rolls.length, 1);
  assert.equal((await request("player", roll(stale))).status, 409);
  assert.equal((await request("player", roll(current))).status, 400);
  response = await request("player", techniqueAction(current, { kind: "reset_combat" }));
  current = savedSheet(response, sheet.id);
  const beforeRace = structuredClone(current);
  const originalBatch = env.DB.batch.bind(env.DB);
  env.DB.batch = async (statements) => {
    sqlite.prepare("UPDATE sheets SET version=version+1 WHERE id=?").run(sheet.id);
    env.DB.batch = originalBatch;
    return originalBatch(statements);
  };
  response = await request("player", roll(current));
  assert.equal(response.status, 409, response.data.error);
  response = await request("player");
  current = savedSheet(response, sheet.id);
  assert.equal(current.resources.ep.current, beforeRace.resources.ep.current);
  assert.deepEqual(current.abilities, beforeRace.abilities);
  assert.equal(response.data.rolls.length, 1, "no roll was inserted when its debit lost the optimistic race");
  assert.equal(current.version, beforeRace.version + 1, "only the simulated concurrent operation changed the version");
}));

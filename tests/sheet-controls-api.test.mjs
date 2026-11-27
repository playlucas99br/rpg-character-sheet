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

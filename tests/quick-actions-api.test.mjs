import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { quickResourceChange } from "../lib/game/quick-actions.ts";

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

const origin = "https://quick-actions.example.test";
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

test("master quick actions persist through the real API with resource limits, permissions and stale-edit protection", async () => {
  const sqlite = new DatabaseSync(":memory:");
  env.DB = new LocalD1(sqlite);
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url)).filter((name) => name.endsWith(".sql")).sort())
    sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));

  try {
    const created = await request("gm", {
      action: "create_campaign",
      campaign: { name: "Ações rápidas", description: "", system: "jujutsu", banner: "shrine", status: "active" },
    });
    assert.equal(created.status, 200);
    const campaignId = created.data.result.id;
    const invite = created.data.campaigns[0].inviteCode;
    assert.equal((await request("player", { action: "join", code: invite })).status, 200);
    assert.equal((await request("other-player", { action: "join", code: invite })).status, 200);

    const pcResult = await request("player", { action: "create_sheet", campaignId, type: "character", name: "Personagem" });
    const pc = pcResult.data.sheets.find((sheet) => sheet.id === pcResult.data.result.id);
    const creatureResult = await request("gm", { action: "create_sheet", campaignId, type: "monster", name: "Criatura privada" });
    const creature = creatureResult.data.sheets.find((sheet) => sheet.id === creatureResult.data.result.id);

    async function adjust(userId, sheet, action, amount) {
      const { key, delta } = quickResourceChange(sheet, action, amount);
      return request(userId, { action: "resource", sheetId: sheet.id, key, delta });
    }

    const damaged = await adjust("gm", pc, "damage", 7);
    assert.equal(damaged.status, 200);
    const afterDamage = damaged.data.sheets.find((sheet) => sheet.id === pc.id);
    assert.equal(afterDamage.resources.hp.current, pc.resources.hp.current - 7);
    assert.equal(afterDamage.version, pc.version + 1);
    assert.equal((await request("player")).data.sheets[0].resources.hp.current, afterDamage.resources.hp.current);

    const oldEdit = await request("player", { action: "update_sheet", sheetId: pc.id, sheet: pc, version: pc.version });
    assert.equal(oldEdit.status, 409, "an editor opened before the master's adjustment cannot restore stale resources");
    assert.equal((await request("player")).data.sheets[0].resources.hp.current, afterDamage.resources.hp.current);

    const healed = await adjust("gm", afterDamage, "heal", 9999);
    assert.equal(healed.status, 200);
    assert.equal(healed.data.sheets.find((sheet) => sheet.id === pc.id).resources.hp.current, pc.resources.hp.max);
    const spent = await adjust("gm", pc, "spend", pc.resources.ep.current);
    assert.equal(spent.status, 200);
    assert.equal(spent.data.sheets.find((sheet) => sheet.id === pc.id).resources.ep.current, 0);
    assert.deepEqual(spent.data.sheets.find((sheet) => sheet.id === pc.id).resources.sanity, pc.resources.sanity);
    const defeated = await adjust("gm", creature, "damage", 9999);
    assert.equal(defeated.status, 200);
    assert.equal(defeated.data.sheets.find((sheet) => sheet.id === creature.id).resources.hp.current, 0);

    for (const deniedUser of [null, "other-player", "outsider"]) {
      assert.equal((await adjust(deniedUser, pc, "damage", 1)).status, deniedUser ? 403 : 401);
    }
    assert.equal((await adjust("player", creature, "damage", 1)).status, 403);
    assert.equal((await adjust("player", pc, "damage", 1)).status, 200, "the player's existing own-sheet control remains available");
    assert.ok((await request("player")).data.sheets.every((sheet) => sheet.id !== creature.id), "private creatures stay outside the player's response");

    const otherCampaign = await request("other-gm", {
      action: "create_campaign",
      campaign: { name: "Outra mesa", description: "", system: "jujutsu", banner: "forest", status: "active" },
    });
    assert.equal(otherCampaign.status, 200);
    assert.equal((await request("other-gm", {
      action: "resource", campaignId: otherCampaign.data.result.id, sheetId: pc.id, key: "hp", delta: -1,
    })).status, 403, "being master of another campaign cannot grant access to a foreign sheet");
    assert.equal((await request("gm", { action: "resource", sheetId: pc.id, key: "hp", delta: 1.5 })).status, 400);
    assert.equal((await request("gm", { action: "resource", sheetId: pc.id, key: "hp", delta: -10000 })).status, 400);

    assert.equal((await request("gm", { action: "remove_member", campaignId, memberId: "player" })).status, 200);
    assert.equal((await adjust("player", pc, "damage", 1)).status, 403, "removing participation revokes the player's resource access");
  } finally {
    delete env.DB;
    sqlite.close();
  }
});

test("energy and sanity spending rejects an insufficient balance without changing resources or versions", async () => {
  const sqlite = new DatabaseSync(":memory:");
  env.DB = new LocalD1(sqlite);
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url)).filter((name) => name.endsWith(".sql")).sort())
    sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));

  try {
    const campaign = await request("gm", {
      action: "create_campaign",
      campaign: { name: "Saldos", description: "", system: "jujutsu", banner: "shrine", status: "active" },
    });
    const created = await request("gm", {
      action: "create_sheet", campaignId: campaign.data.result.id, type: "character", name: "Mestre",
    });
    const sheetId = created.data.result.id;

    for (const key of ["ep", "sanity"]) {
      const before = (await request("gm")).data.sheets.find((sheet) => sheet.id === sheetId);
      const unavailable = await request("gm", {
        action: "resource", sheetId, key, delta: -(before.resources[key].current + 1),
      });
      assert.equal(unavailable.status, 400, `${key} cannot be spent beyond the available balance`);
      assert.match(unavailable.data.error, /saldo|insuficiente/i);
      const unchanged = (await request("gm")).data.sheets.find((sheet) => sheet.id === sheetId);
      assert.deepEqual(unchanged.resources, before.resources);
      assert.equal(unchanged.version, before.version, "a rejected spend must not create a saved change");

      const exact = await request("gm", {
        action: "resource", sheetId, key, delta: -before.resources[key].current,
      });
      assert.equal(exact.status, 200, "spending exactly the available balance is valid");
      const depleted = exact.data.sheets.find((sheet) => sheet.id === sheetId);
      assert.equal(depleted.resources[key].current, 0);
      assert.equal(depleted.version, before.version + 1);
      const fromZero = await request("gm", { action: "resource", sheetId, key, delta: -1 });
      assert.equal(fromZero.status, 400, "zero balance still produces an insufficient-balance error");
      assert.equal((await request("gm")).data.sheets.find((sheet) => sheet.id === sheetId).version, depleted.version);
    }
  } finally {
    delete env.DB;
    sqlite.close();
  }
});

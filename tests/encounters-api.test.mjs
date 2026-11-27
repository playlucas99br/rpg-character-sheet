import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers" || specifier === "@/lib/runtime-env") return { url: new URL("./cloudflare.mjs", import.meta.url).href, shortCircuit: true };
  if (specifier === "next/headers" || specifier === "next/navigation") return { url: new URL("./request-context.mjs", import.meta.url).href, shortCircuit: true };
  try { return nextResolve(specifier, context); } catch (error) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const { env } = await import("./cloudflare.mjs");
const { fixture } = await import("./request-context.mjs");
const { GET, POST } = await import("../app/api/game/route.ts");

class LocalD1 {
  constructor(sqlite) { this.sqlite = sqlite; }
  prepare(query) {
    const db = this.sqlite;
    return {
      values: [], bind(...values) { this.values = values; return this; },
      async first() { return db.prepare(query).get(...this.values) ?? null; },
      async all() { return { success: true, results: db.prepare(query).all(...this.values) }; },
      async run() { const result = db.prepare(query).run(...this.values); return { success: true, results: [], meta: { changes: Number(result.changes) } }; },
    };
  }
  async batch(statements) {
    this.sqlite.exec("BEGIN");
    try { const result = []; for (const statement of statements) result.push(await statement.run()); this.sqlite.exec("COMMIT"); return result; }
    catch (error) { this.sqlite.exec("ROLLBACK"); throw error; }
  }
}
const origin = "https://encounters.example.test";
async function request(userId, body) {
  fixture.headers = new Headers(userId ? { "oai-authenticated-user-id": userId, "oai-authenticated-user-email": `${userId}@example.test` } : {});
  const response = body ? await POST(new Request(`${origin}/api/game`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) })) : await GET();
  return { status: response.status, data: await response.json() };
}

test("encounters persist private GM initiative and turn state with campaign isolation, versions and reload", async () => {
  const directory = mkdtempSync(join(tmpdir(), "nexo-encounters-"));
  const filename = join(directory, "game.sqlite");
  let sqlite = new DatabaseSync(filename);
  env.DB = new LocalD1(sqlite);
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url)).filter((name) => name.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  try {
    const campaign = await request("gm", { action: "create_campaign", campaign: { name: "Mesa A", description: "", system: "ordem", banner: "shrine" } });
    assert.equal(campaign.status, 200);
    const campaignId = campaign.data.result.id;
    assert.equal((await request("player", { action: "join", code: campaign.data.campaigns[0].inviteCode })).status, 200);
    const pc = await request("player", { action: "create_sheet", campaignId, type: "character", name: "Personagem canônico" });
    const monster = await request("gm", { action: "create_sheet", campaignId, type: "monster", name: "Criatura privada" });
    const pcId = pc.data.result.id, monsterId = monster.data.result.id;
    const other = await request("other-gm", { action: "create_campaign", campaign: { name: "Mesa B", description: "", system: "ordem", banner: "forest" } });
    const otherCampaignId = other.data.result.id;
    const foreign = await request("other-gm", { action: "create_sheet", campaignId: otherCampaignId, type: "monster", name: "Segredo estrangeiro" });
    const draft = { action: "create_encounter", campaignId, name: "  Encontro privado  ", participants: [{ sheetId: pcId, initiative: 10, name: "Nome forjado" }, { sheetId: monsterId, initiative: 20 }] };
    for (const userId of [null, "player", "outsider", "other-gm"]) assert.equal((await request(userId, draft)).status, userId ? 403 : 401);
    assert.equal((await request("gm", { ...draft, participants: [{ sheetId: foreign.data.result.id, initiative: 1 }] })).status, 403);
    assert.equal((await request("gm", { ...draft, participants: [{ sheetId: pcId, initiative: 1 }, { sheetId: pcId, initiative: 2 }] })).status, 400);
    assert.equal(sqlite.prepare("SELECT count(*) AS count FROM encounters").get().count, 0);

    const created = await request("gm", draft);
    assert.equal(created.status, 200, JSON.stringify(created.data));
    const id = created.data.result.id;
    let encounter = created.data.encounters.find((item) => item.id === id);
    assert.equal(encounter.name, "Encontro privado");
    assert.equal(encounter.status, "draft");
    assert.equal(encounter.version, 1);
    assert.equal(encounter.round, 0);
    assert.equal(encounter.participants[0].name, "Personagem canônico");
    assert.deepEqual((await request("player")).data.encounters, []);
    assert.deepEqual((await request("other-gm")).data.encounters, []);
    assert.ok(!JSON.stringify((await request("player")).data).includes("Encontro privado"));

    const updated = await request("gm", { ...draft, action: "update_encounter", encounterId: id, version: encounter.version, participants: [{ sheetId: pcId, initiative: 20 }, { sheetId: monsterId, initiative: 20 }] });
    assert.equal(updated.status, 200);
    encounter = updated.data.encounters.find((item) => item.id === id);
    assert.equal(encounter.version, 2);
    const payload = (action) => ({ action, campaignId, encounterId: id, version: encounter.version });
    const staleStart = payload("start_encounter");
    for (const userId of ["player", "outsider", "other-gm"]) assert.equal((await request(userId, staleStart)).status, 403);
    assert.equal((await request("gm", { ...staleStart, campaignId: otherCampaignId })).status, 403);
    const started = await request("gm", staleStart);
    assert.equal(started.status, 200);
    encounter = started.data.encounters.find((item) => item.id === id);
    assert.equal(encounter.currentParticipantId, pcId, "manual draft order breaks equal initiative");
    assert.equal(encounter.round, 1);
    assert.equal((await request("gm", staleStart)).status, 409, "repeated stale command cannot restart or advance a turn");
    assert.equal((await request("gm", { ...draft, action: "update_encounter", encounterId: id, version: encounter.version })).status, 400);

    const replayedAdvance = payload("advance_turn");
    const advanced = await request("gm", replayedAdvance);
    assert.equal(advanced.status, 200);
    encounter = advanced.data.encounters.find((item) => item.id === id);
    assert.equal(encounter.currentParticipantId, monsterId);
    assert.equal(encounter.round, 1);
    assert.equal((await request("gm", replayedAdvance)).status, 409);
    const nextRound = await request("gm", payload("advance_turn"));
    encounter = nextRound.data.encounters.find((item) => item.id === id);
    assert.equal(encounter.currentParticipantId, pcId);
    assert.equal(encounter.round, 2);
    const snapshot = structuredClone(encounter);
    sqlite.close();
    sqlite = new DatabaseSync(filename);
    env.DB = new LocalD1(sqlite);
    assert.deepEqual((await request("gm")).data.encounters.find((item) => item.id === id), snapshot);

    assert.equal((await request("gm", { action: "delete_sheet", sheetId: monsterId })).status, 200);
    const afterDeletion = (await request("gm")).data.encounters.find((item) => item.id === id);
    assert.equal(afterDeletion.participants.find((participant) => participant.sheetId === monsterId).name, "Criatura privada", "a removed sheet keeps its encounter snapshot");
    const finished = await request("gm", payload("finish_encounter"));
    assert.equal(finished.status, 200);
    encounter = finished.data.encounters.find((item) => item.id === id);
    assert.equal(encounter.status, "finished");
    assert.equal(encounter.currentParticipantId, null);
    assert.equal(encounter.round, 2);
    for (const action of ["advance_turn", "start_encounter", "finish_encounter"]) assert.equal((await request("gm", payload(action))).status, 400);

    const another = await request("gm", { ...draft, name: "Outro encontro", participants: [{ sheetId: pcId, initiative: -1 }] });
    assert.equal(another.status, 200, "finished encounters do not prevent creating another encounter");
    const anotherId = another.data.result.id;
    const sameVersion = { action: "start_encounter", campaignId, encounterId: anotherId, version: 1 };
    const raced = await Promise.all([request("gm", sameVersion), request("gm", sameVersion)]);
    assert.deepEqual(raced.map((result) => result.status).sort(), [200, 409]);
    assert.equal((await request("gm")).data.encounters.find((item) => item.id === anotherId).version, 2);
    assert.equal((await request("gm", { action: "remove_member", campaignId, memberId: "player" })).status, 200);
    assert.equal((await request("player", { ...sameVersion, version: 2 })).status, 403);
    assert.deepEqual((await request("player")).data.encounters, []);
  } finally {
    delete env.DB;
    sqlite.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

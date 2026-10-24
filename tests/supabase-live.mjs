// Explicit live verification: reads a short-lived configuration from hidden stdin.
// Never put tokens in shell arguments, files, logs, or the public repository.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createInterface } from "node:readline";

registerHooks({ resolve(specifier, context, next) {
  if ((specifier === "cloudflare:workers" || specifier === "@/lib/runtime-env")) return { url: new URL("./cloudflare.mjs", import.meta.url).href, shortCircuit: true };
  if (specifier === "next/headers" || specifier === "next/navigation") return { url: new URL("./request-context.mjs", import.meta.url).href, shortCircuit: true };
  try { return next(specifier, context); }
  catch (error) { if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context); throw error; }
} });

console.log("Ready for private Supabase verification configuration.");
const reader = createInterface({ input: process.stdin, terminal: false });
const [line] = await new Promise((resolve) => reader.once("line", (value) => resolve([value])));
reader.close();
const config = JSON.parse(line);
const { env } = await import("./cloudflare.mjs");
const { fixture } = await import("./request-context.mjs");
const { GET, POST } = await import("../app/api/game/route.ts");
const { SupabaseDatabase } = await import("../lib/game/supabase-database.ts");
const prefix = `verify-${crypto.randomUUID().slice(0, 12)}`;
const actors = ["gm", "player", "player2", "outsider"].map((role) => `${prefix}-${role}`);
const [gm, player, player2, outsider] = actors;
const source = `${prefix}:empty-d1`;
Object.assign(env, { NEXO_DATABASE_PROVIDER: "supabase", SUPABASE_DATABASE_GATEWAY_URL: config.url, NEXO_DATABASE_TOKEN: config.token, NEXO_DATABASE_SOURCE_ID: source });
console.log(JSON.stringify({ verification: prefix, actors, source }));
const origin = "https://nexo-verification.example.test";
async function call(actor, input) {
  fixture.headers = new Headers(actor ? { "oai-authenticated-user-id": actor, "oai-authenticated-user-email": `${actor}@example.invalid` } : {});
  const result = input ? await POST(new Request(`${origin}/api/game`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, "X-Nexo-Account": actor || "" }, body: JSON.stringify(input) })) : await GET();
  return { status: result.status, data: await result.json() };
}
assert.equal((await call(null)).status, 401);
assert.equal((await fetch(config.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"operation":"query","statements":[]}' })).status, 401);
console.log("Anonymous access rejected by API and Supabase gateway.");
assert.equal((await call(gm)).status, 200);
let response = await call(gm, { action: "create_campaign", campaign: { name: `${prefix} Mesa`, description: "Verificação de gravação real", system: "jujutsu", banner: "shrine" } });
assert.equal(response.status, 200, response.data.error);
const campaignId = response.data.result.id, invite = response.data.campaigns[0].inviteCode;
assert.equal((await call(player, { action: "join", code: invite })).status, 200);
assert.equal((await call(player2, { action: "join", code: invite })).status, 200);
await call(outsider);
response = await call(player, { action: "create_sheet", campaignId, type: "character", name: "Personagem da verificação" });
assert.equal(response.status, 200, response.data.error);
let sheet = response.data.sheets[0];
const notes = "Texto com apóstrofo ' e interrogação ?; DROP TABLE nexo.profiles; -- continua sendo apenas texto.";
sheet.notes = notes;
sheet.inventory = "Inventário gravado no PostgreSQL";
sheet.abilities = [{ id: "live-ability", name: "Técnica de verificação", cost: 2, formula: "1d6+1", description: "Teste controlado" }];
response = await call(player, { action: "update_sheet", sheetId: sheet.id, version: sheet.version, sheet });
assert.equal(response.status, 200, response.data.error);
sheet = response.data.sheets[0];
assert.equal((await call(player, { action: "update_sheet", sheetId: sheet.id, version: sheet.version - 1, sheet })).status, 409);
response = await call(player, { action: "resource", sheetId: sheet.id, key: "hp", delta: -3 });
assert.equal(response.status, 200, response.data.error);
const hp = response.data.sheets[0].resources.hp.current;
const energy = response.data.sheets[0].resources.ep.current;
response = await call(player, { action: "roll", campaignId, sheetId: sheet.id, request: { kind: "ability", id: "live-ability" }, visibility: "table" });
assert.equal(response.status, 200, response.data.error);
assert.equal(response.data.sheets[0].resources.ep.current, energy - 2);
assert.equal(response.data.rolls.length, 1);
assert.equal(response.data.sheets[0].notes, notes);
assert.equal(response.data.sheets[0].resources.hp.current, hp);
console.log("Campaign, character, notes, HP, energy cost and roll saved and read back from Supabase.");
response = await call(player2, { action: "create_sheet", campaignId, type: "character", name: "Segundo jogador" });
const otherId = response.data.result.id;
assert.equal((await call(player, { action: "resource", sheetId: otherId, key: "hp", delta: -1 })).status, 403);
assert.equal((await call(player)).data.sheets.length, 1);
assert.equal((await call(outsider)).data.sheets.length, 0);
response = await call(gm, { action: "create_sheet", campaignId, type: "monster", name: "Criatura privada" });
const monsterId = response.data.result.id;
assert.equal((await call(gm)).data.sheets.length, 3);
assert.equal((await call(player, { action: "delete_sheet", sheetId: monsterId })).status, 403);
assert.equal((await call(player, { action: "create_sheet", campaignId, type: "monster", name: "Não permitir" })).status, 403);
console.log("Player isolation and private GM creatures verified against the real database.");

// Two batches race using the same version. Exactly one roll and one energy
// charge may commit, including when PostgreSQL uses concurrent connections.
sheet = (await call(player)).data.sheets[0];
const db = new SupabaseDatabase(config.url, config.token);
const rollTemplate = (await call(player)).data.rolls[0];
function competingBatch() {
  const id = crypto.randomUUID();
  const updated = structuredClone(sheet);
  updated.resources.ep.current -= 2;
  return db.batch([
    db.prepare("INSERT INTO rolls (id,campaign_id,user_id,sheet_id,visibility,data,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM sheets WHERE id=? AND version=?)")
      .bind(id, campaignId, player, sheet.id, "table", JSON.stringify({ ...rollTemplate, id }), new Date().toISOString(), sheet.id, sheet.version),
    db.prepare("UPDATE sheets SET data=?,version=version+1,updated_at=? WHERE id=? AND version=?")
      .bind(JSON.stringify(updated), new Date().toISOString(), sheet.id, sheet.version),
  ]);
}
const raced = await Promise.all([competingBatch(), competingBatch()]);
assert.deepEqual(raced.map((result) => result[1].meta.changes).sort(), [0, 1]);
response = await call(player);
assert.equal(response.data.rolls.length, 2, "a losing transaction must not create a ghost roll");
assert.equal(response.data.sheets[0].resources.ep.current, sheet.resources.ep.current - 2);
await assert.rejects(db.prepare("SELECT * FROM auth.users").all());
await call(gm, { action: "remove_member", campaignId, memberId: player2 });
assert.equal((await call(player2, { action: "resource", sheetId: otherId, key: "hp", delta: 1 })).status, 403);
console.log("Concurrent ability transactions, query allowlist and access revocation verified.");
console.log(JSON.stringify({ success: true, campaignId, sheetId: sheet.id, actors, source, expectedHp: hp, expectedRolls: 2 }));

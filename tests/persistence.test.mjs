import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "cloudflare:workers") return { url: new URL("./cloudflare.mjs", import.meta.url).href, shortCircuit: true };
  try { return next(specifier, context); }
  catch (error) { if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context); throw error; }
} });
const { env } = await import("./cloudflare.mjs");
const { database, preparePersistence } = await import("../lib/game/persistence.ts");
const { SupabaseDatabase } = await import("../lib/game/supabase-database.ts");
const gateway = "https://verification.supabase.co/functions/v1/nexo-database";

test("a missing Supabase secret cannot silently switch an account back to D1", () => {
  env.DB = { prepare() { throw new Error("Do not use the old database"); } };
  env.NEXO_DATABASE_PROVIDER = "supabase";
  try { assert.throws(database, (error) => error.status === 503); }
  finally { delete env.NEXO_DATABASE_PROVIDER; delete env.DB; }
});

test("uncertain Supabase writes are not automatically retried; JSON and versions survive transport", async () => {
  const original = globalThis.fetch;
  const db = new SupabaseDatabase(gateway, "test-only-token");
  let requests = 0;
  try {
    globalThis.fetch = async (_url, init) => {
      requests++;
      assert.equal(init.headers["X-Nexo-Token"], "test-only-token");
      const body = JSON.parse(init.body);
      assert.equal(body.operation, "query");
      assert.deepEqual(body.statements[0].params, ["Question ? and quote '"]);
      throw new TypeError("Response lost after commit");
    };
    await assert.rejects(db.prepare("test statement").bind("Question ? and quote '").run(), (error) => error.status === 503);
    assert.equal(requests, 1);
    globalThis.fetch = async () => Response.json({ data: [{ success: true, results: [{ version: 7, data: { notes: "kept" } }], meta: { changes: 1 } }] });
    const row = await db.prepare("test statement").first();
    assert.equal(row.version, 7);
    assert.deepEqual(JSON.parse(row.data), { notes: "kept" });
    await assert.rejects(db.batch([new SupabaseDatabase(gateway, "another-token").prepare("test")]), (error) => error.status === 500);
  } finally { globalThis.fetch = original; }
});

test("a lost import response is reconciled by its marker without duplicating or deleting the D1 snapshot", async () => {
  const original = globalThis.fetch;
  let imported = false, snapshotReads = 0, imports = 0;
  const rows = [{ id: "legacy", name: "Preserved", created_at: "2026-10-23T00:00:00Z" }];
  Object.assign(env, {
    NEXO_DATABASE_PROVIDER: "supabase", SUPABASE_DATABASE_GATEWAY_URL: gateway,
    NEXO_DATABASE_TOKEN: "test-only-token", NEXO_DATABASE_SOURCE_ID: "verification-import-response",
    DB: { prepare(sql) { assert.ok(sql.startsWith("SELECT * FROM ")); return sql; }, async batch() { snapshotReads++; return [{ results: rows }, ...Array.from({ length: 4 }, () => ({ results: [] }))]; } },
  });
  try {
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(init.body);
      if (body.operation === "import_status") return Response.json({ data: { imported } });
      assert.equal(body.operation, "import");
      assert.deepEqual(body.snapshot.profiles, rows);
      imports++; imported = true;
      throw new TypeError("Import committed, response lost");
    };
    await assert.rejects(preparePersistence(), (error) => error.status === 503);
    await preparePersistence();
    assert.equal(imports, 1);
    assert.equal(snapshotReads, 1);
    assert.equal(rows.length, 1);
  } finally {
    globalThis.fetch = original;
    for (const key of ["DB", "NEXO_DATABASE_PROVIDER", "SUPABASE_DATABASE_GATEWAY_URL", "NEXO_DATABASE_TOKEN", "NEXO_DATABASE_SOURCE_ID"]) delete env[key];
  }
});

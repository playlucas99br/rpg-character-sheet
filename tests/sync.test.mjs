import test from "node:test";
import assert from "node:assert/strict";
import { draftKey, hasDraftChanges, parseDraft, reconcileDraft } from "../lib/game/drafts.ts";
import { GameApiError, requestGame } from "../lib/game/client-sync.ts";
import { newSheet } from "../lib/game/systems.ts";

test("draft recovery preserves new resource values and merges independent note edits", () => {
  const base = newSheet("jujutsu", "campaign", "player", "Jogador");
  const value = structuredClone(base);
  value.notes = "Informação escrita antes de recarregar.";
  const current = structuredClone(base);
  current.resources.hp.current -= 5;
  current.version += 1;
  const saved = { base, value, savedAt: new Date().toISOString() };
  const recovered = reconcileDraft(parseDraft(JSON.stringify(saved), current), current);
  assert.deepEqual(recovered.conflicts, []);
  assert.equal(recovered.value.notes, value.notes);
  assert.deepEqual(recovered.value.resources, current.resources);
  assert.equal(recovered.value.version, current.version);
  assert.ok(hasDraftChanges(current, recovered.value));
});

test("drafts never silently overwrite concurrent changes and remain scoped to account and sheet", () => {
  const base = newSheet("ordem", "campaign", "player", "Jogador");
  const value = { ...base, notes: "Minha edição", name: "Nome novo" };
  const current = { ...base, notes: "Outra janela", version: 2 };
  const saved = { base, value, savedAt: new Date().toISOString() };
  const recovered = reconcileDraft(saved, current);
  assert.deepEqual(recovered.conflicts, ["notes"]);
  assert.equal(recovered.value.notes, current.notes);
  assert.equal(recovered.value.name, value.name);
  assert.notEqual(draftKey("player", base.id), draftKey("gm", base.id));
  assert.notEqual(draftKey("demo", base.id), draftKey("player", base.id));
  assert.equal(parseDraft(JSON.stringify(saved), { ...base, id: "other" }), null);
  assert.equal(parseDraft(JSON.stringify(saved), { ...base, ownerId: "other" }), null);
  assert.equal(parseDraft('{"base":null}', base), null);
  assert.equal(parseDraft(JSON.stringify({ ...saved, value: { ...value, resources: null } }), base), null);
  assert.equal(hasDraftChanges(base, { ...base, version: 10, updatedAt: "new" }), false);
});

test("client confirms saves only on a valid API response and never retries a write", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async (_url, options) => {
      calls += 1;
      assert.equal(options.headers["X-Nexo-Account"], "player");
      assert.equal(options.redirect, "error");
      return Response.json({ error: "Sessão encerrada" }, { status: 401 });
    };
    await assert.rejects(requestGame({ action: "resource" }, "player"), (error) => error instanceof GameApiError && error.status === 401);
    assert.equal(calls, 1);
    globalThis.fetch = async () => { calls += 1; throw new TypeError("Connection interrupted"); };
    await assert.rejects(requestGame({ action: "roll" }, "player"));
    assert.equal(calls, 2, "uncertain resource or roll operations must not be retried");
    globalThis.fetch = async () => new Response("<html>login wall</html>");
    await assert.rejects(requestGame(), GameApiError);
    globalThis.fetch = async () => Response.json({ campaigns: [], sheets: [], rolls: [] });
    await assert.rejects(requestGame(), (error) => error.status === 502);
    const state = { user: { id: "player", name: "Jogador" }, campaigns: [], sheets: [], rolls: [] };
    globalThis.fetch = async () => Response.json(state);
    assert.deepEqual(await requestGame(), state);
  } finally { globalThis.fetch = original; }
});

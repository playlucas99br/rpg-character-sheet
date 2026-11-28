import test from "node:test";
import assert from "node:assert/strict";
import { parseSheetImport, validateSheetImport, makeImportedSheet, importCampaigns, MAX_SHEET_IMPORT_BYTES } from "../lib/game/sheet-import.ts";
import { newSheet, SYSTEMS } from "../lib/game/systems.ts";
import { sheetSchema } from "../lib/game/validation.ts";

const exported = (sheet = newSheet("ordem", "old-campaign", "old-owner", "Anterior")) => ({ format: "nexo-sheet", schemaVersion: 1, exportedAt: "2026-11-26T21:00:00.000Z", sheet });

test("current JSON exports restore all six systems as new sheets with current resources and selected ownership", () => {
  for (const system of SYSTEMS) for (const type of ["character", "monster"]) {
    const source = newSheet(system.id, "old-campaign", "old-owner", "Anterior", type);
    source.version = 9;
    source.resources.hp.current = 2;
    source.notes = "Pista: D'água ? 🎲";
    source.inventory = "Equipamento salvo";
    source.portraitAssetId = "private-asset-from-another-campaign";
    const before = structuredClone(source);
    const document = parseSheetImport(JSON.stringify(exported(source), null, 2));
    const restored = makeImportedSheet(document, "new-campaign", { id: "new-owner", name: "Novo dono" }, "Ficha recuperada");
    assert.notEqual(restored.id, source.id);
    assert.equal(restored.campaignId, "new-campaign");
    assert.equal(restored.ownerId, "new-owner");
    assert.equal(restored.ownerName, "Novo dono");
    assert.equal(restored.version, 1);
    assert.equal(restored.type, type);
    assert.equal(restored.system, system.id);
    assert.equal(restored.portraitAssetId, undefined);
    for (const field of ["resources", "attributes", "skills", "attacks", "rituals", "abilities", "inventory", "notes", "defense"])
      assert.deepEqual(restored[field], source[field], `${system.id}: ${field}`);
    assert.equal(sheetSchema.safeParse(restored).success, true);
    restored.resources.hp.current = 1;
    assert.deepEqual(source, before);
  }
});

test("imports preserve validated ritual details and support BOM and older exports without rituals", () => {
  const file = exported();
  file.sheet.rituals = [{ id: "ritual", name: "Ritual", element: "Sangue", circle: 1, summary: "Resumo", sourcePage: 1, details: { execution: "Padrão", range: "Curto", description: ["Primeiro parágrafo", "Segundo parágrafo"] } }];
  const doc = parseSheetImport("\uFEFF" + JSON.stringify(file));
  assert.deepEqual(doc.sheet.rituals, file.sheet.rituals);
  assert.deepEqual(sheetSchema.parse(doc.sheet).rituals, file.sheet.rituals, "a later edit retains imported details");
  delete file.sheet.rituals;
  assert.deepEqual(validateSheetImport(file).sheet.rituals, []);
});

test("invalid JSON, unsupported envelopes and invalid game data are rejected before insertion", () => {
  for (const text of ["", "not json", "<html>wrong</html>", "[]", "null"])
    assert.throws(() => parseSheetImport(text));
  for (const changes of [{ format: "other" }, { schemaVersion: 2 }, { schemaVersion: "1" }, { exportedAt: "yesterday" }, { sheet: null }])
    assert.throws(() => validateSheetImport({ ...exported(), ...changes }));
  const cases = [
    (s) => { s.resources.hp.current = s.resources.hp.max + 1; },
    (s) => { delete s.attributes.FOR; },
    (s) => { s.attributes.FOR = 11; },
    (s) => { s.attributes.EXTRA = 1; },
    (s) => { s.skills[0].attribute = "toString"; },
    (s) => { s.skills[1].id = s.skills[0].id; },
    (s) => { s.attacks = [{ id: "bad", name: "Invalid", skillId: "missing", damage: "1d6", range: "", critical: 20, description: "" }]; },
    (s) => { s.abilities = [{ id: "bad", name: "Invalid", cost: 0, formula: "fetch('https://invalid')", description: "" }]; },
    (s) => { s.rituals = [{ id: "bad", name: "Invalid", element: "Sangue", circle: 1, summary: "", sourcePage: 1, details: { description: "not an array" } }]; },
    (s) => { s.system = "unsupported"; },
    (s) => { s.type = "gm"; },
  ];
  for (const change of cases) { const file = exported(); change(file.sheet); assert.throws(() => validateSheetImport(file)); }
  const malicious = JSON.parse(JSON.stringify(exported()).replace('"sheet":{', '"__proto__":{"polluted":true},"sheet":{'));
  assert.equal(validateSheetImport(malicious).polluted, undefined);
  assert.equal({}.polluted, undefined);
});

test("the import budget is measured in UTF-8 bytes for both files and direct API objects", () => {
  assert.throws(() => parseSheetImport(" ".repeat(MAX_SHEET_IMPORT_BYTES + 1)), /128 KB/);
  const huge = { ...exported(), padding: "界".repeat(Math.ceil(MAX_SHEET_IMPORT_BYTES / 3)) };
  assert.throws(() => validateSheetImport(huge), /128 KB/);
  const manyNotes = exported();
  manyNotes.sheet.notes = "x".repeat(20001);
  assert.throws(() => validateSheetImport(manyNotes), /notes/);
});

test("destination choices match the file's system and restrict creature imports to GMs", () => {
  const campaigns = [{ id: "own", system: "ordem", role: "player" }, { id: "gm", system: "ordem", role: "gm" }, { id: "different", system: "jujutsu", role: "gm" }];
  const doc = validateSheetImport(exported());
  assert.deepEqual(importCampaigns(doc, campaigns).map((c) => c.id), ["own", "gm"]);
  doc.sheet.type = "monster";
  assert.deepEqual(importCampaigns(doc, campaigns).map((c) => c.id), ["gm"]);
  assert.deepEqual(importCampaigns(doc, []), []);
});

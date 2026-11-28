import test from "node:test";
import assert from "node:assert/strict";
import { makeSheetCopy, suggestedCopyName } from "../lib/game/duplicate-sheet.ts";
import { newSheet, SYSTEMS } from "../lib/game/systems.ts";
import { sheetSchema } from "../lib/game/validation.ts";

test("copies preserve every system's saved content with independent identity and nested values", () => {
  for (const system of SYSTEMS) {
    const source = newSheet(system.id, "campaign", "owner", "Dono");
    source.version = 8;
    source.portraitAssetId = "shared-private-portrait";
    source.resources.hp.current = 3;
    source.notes = "Pista original";
    source.inventory = "Equipamento";
    const before = structuredClone(source);
    const copy = makeSheetCopy(source, "Nova ficha", "2026-10-29T12:00:00Z");
    assert.notEqual(copy.id, source.id);
    assert.notEqual(makeSheetCopy(source, "Outra cópia").id, copy.id);
    assert.equal(copy.version, 1);
    assert.equal(copy.updatedAt, "2026-10-29T12:00:00Z");
    assert.equal(copy.ownerId, source.ownerId);
    assert.equal(copy.campaignId, source.campaignId);
    assert.equal(copy.portraitAssetId, source.portraitAssetId);
    assert.equal(sheetSchema.safeParse(copy).success, true, system.id);
    copy.resources.hp.current = 1;
    copy.skills[0].bonus = 50;
    copy.attributes.FOR = 9;
    copy.notes = "Anotação da cópia";
    assert.deepEqual(source, before);
  }
  const monster = newSheet("ordem", "campaign", "gm", "Mestre", "monster");
  monster.rituals = [{ id: "ritual", name: "Teste", element: "Sangue", circle: 1, summary: "Ritual", sourcePage: 1, details: { description: ["Detalhes preservados"] } }];
  const copy = makeSheetCopy(monster, "Ameaça 2");
  assert.equal(copy.type, "monster");
  assert.deepEqual(copy.rituals, monster.rituals);
  copy.rituals[0].details.description[0] = "Alterado";
  assert.equal(monster.rituals[0].details.description[0], "Detalhes preservados");
});

test("copy names avoid visible collisions, repeated suffixes and broken Unicode at the name limit", () => {
  assert.equal(suggestedCopyName("Abissal", []), "Abissal (cópia)");
  assert.equal(suggestedCopyName("Abissal (cópia)", ["Abissal", "ABISSAL (CÓPIA)"]), "Abissal (cópia 2)");
  assert.equal(suggestedCopyName("Abissal (cópia 2)", ["Abissal (cópia)", "Abissal (cópia 2)"]), "Abissal (cópia 3)");
  for (const value of ["x".repeat(100), "🎲".repeat(50), "x".repeat(91) + "🎲"]) {
    const name = suggestedCopyName(value, []);
    assert.ok(name.length <= 100);
    assert.equal(JSON.parse(JSON.stringify(name)), name);
    assert.ok(name.isWellFormed());
  }
});

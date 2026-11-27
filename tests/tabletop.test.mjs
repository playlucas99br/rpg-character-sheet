import test from "node:test";
import assert from "node:assert/strict";
import { applyFrame, distance, editWall, entityFrame, lanternAngle, LIGHT_PRESETS, mapFrame, newLight, resizeFrame, rotatedAngle, snapPoint, tokenFrame, visibilityPolygon, visionTokens, newScene, newToken, projectSchema, starterProject } from "../lib/tabletop/model.ts";
import { descendants, folderPath, pasteLibrary } from "../lib/tabletop/library.ts";
import { referencedAssets, tabletopKey } from "../lib/tabletop/storage.ts";
import { EFFECTS, effectSize, stepLight, toggleFlashlight } from "../lib/tabletop/model.ts";
import { removeSceneObject, duplicateSceneObject, patchSceneObject } from "../lib/tabletop/objects.ts";
import { placedLibraryFile } from "../lib/tabletop/files.ts";
import { updateViewportBounds, viewportBounds } from "../lib/tabletop/viewport.ts";
import { createTabletopBackup, readTabletopBackup } from "../lib/tabletop/backup.ts";
import { MAX_CUTSCENE_VIDEO_BYTES } from "../lib/tabletop/model.ts";

test("backup binário mantém mídias e restaura mesas antigas sem base64 na cópia nova", async () => {
  const project = starterProject([]), scene = project.scenes[0];
  scene.cutscenes.push({ id: "cutscene:video", title: "Abertura", x: 50, y: 50, size: 48, rotation: 0, asset: "video", mime: "video/mp4", loop: true, locked: false });
  project.files.push({ id: "doc", asset: "img", name: "Foto", kind: "document", folderId: null, mime: "image/png" });
  const blobs = new Map([["video", new Blob([new Uint8Array([0, 255, 1, 128, 10])], { type: "video/mp4" })], ["img", new Blob(["PNG original"], { type: "image/png" })]]);
  const backup = await createTabletopBackup(project, async id => blobs.get(id));
  const restored = await readTabletopBackup(backup);
  assert.equal(restored.project.scenes[0].cutscenes[0].loop, true);
  assert.deepEqual([...new Uint8Array(await restored.assets.get("video").arrayBuffer())], [0, 255, 1, 128, 10]);
  assert.equal(await restored.assets.get("img").text(), "PNG original");
  assert.equal(backup.size - [...blobs.values()].reduce((n, b) => n + b.size, 0) < 100000, true);
  await assert.rejects(readTabletopBackup(backup.slice(0, backup.size - 1)));
  await assert.rejects(createTabletopBackup(project, async id => id === "video" ? { size: MAX_CUTSCENE_VIDEO_BYTES + 1, type: "video/mp4" } : blobs.get(id)));
  const oldAssets = Object.fromEntries(await Promise.all([...blobs].map(async ([id, b]) => [id, { type: b.type, data: Buffer.from(await b.arrayBuffer()).toString("base64") }])));
  const old = await readTabletopBackup(new Blob([JSON.stringify({ project, assets: oldAssets })], { type: "application/json" }));
  assert.deepEqual([...new Uint8Array(await old.assets.get("video").arrayBuffer())], [0, 255, 1, 128, 10]);
});

test("máscaras acompanham cada quadro de zoom rápido inclusive fora da área anterior", () => {
  const size = { width: 1920, height: 1080 };
  const elements = Array.from({ length: 7 }, () => ({ attributes: {}, setAttribute(name, value) { this.attributes[name] = Number(value); } }));
  const root = { querySelectorAll(selector) { assert.equal(selector, "[data-vtt-viewport-bounds]"); return elements; } };
  const views = [{ x: -4000, y: -2000, zoom: 4 }, { x: -1000, y: -500, zoom: 1 }, { x: 300, y: 100, zoom: .03 }, { x: -260, y: 70, zoom: .16 }, { x: -800, y: -200, zoom: 3 }];
  for (const view of views) {
    const bounds = viewportBounds(view, size);
    updateViewportBounds(root, bounds);
    for (const element of elements) {
      assert.deepEqual(element.attributes, bounds);
      assert.ok(element.attributes.x <= -view.x / view.zoom);
      assert.ok(element.attributes.y <= -view.y / view.zoom);
      assert.ok(element.attributes.x + element.attributes.width >= (size.width - view.x) / view.zoom);
      assert.ok(element.attributes.y + element.attributes.height >= (size.height - view.y) / view.zoom);
    }
  }
});

test("imagens guardadas como documentos aparecem como imagens no tabuleiro", () => {
  const image = { id: "file", asset: "img", name: "Print", kind: "document", folderId: null, mime: "image/png", width: 800, height: 400 };
  const item = placedLibraryFile(image, { x: 200, y: 300 });
  assert.equal(item.kind, "image"); assert.equal(item.asset, "img"); assert.equal(item.width / item.height, 2);
  assert.equal(placedLibraryFile({ ...image, mime: "image/gif" }, { x: 0, y: 0 }).kind, "image");
  assert.equal(placedLibraryFile({ ...image, mime: "application/pdf" }, { x: 0, y: 0 }).kind, "document");
  const project = starterProject([]); project.scenes[0].items.push(item); project.files.push(image);
  assert.equal(projectSchema.parse(JSON.parse(JSON.stringify(project))).scenes[0].items[0].kind, "image");
});

test("recursos de NPCs e loop preservam projetos antigos e exportações", () => {
  const project = starterProject([]), scene = project.scenes[0];
  const token = newToken("NPC", { x: 100, y: 100 });
  scene.tokens.push(token);
  scene.cutscenes.push({ id: "cutscene:old", title: "Antiga", x: 50, y: 50, size: 48, rotation: 0, locked: false });
  const old = JSON.parse(JSON.stringify(project)); delete old.scenes[0].tokens[0].resources;
  const migrated = projectSchema.parse(old);
  assert.deepEqual(migrated.scenes[0].tokens[0].resources.hp, { current: 10, max: 10 });
  assert.equal(migrated.scenes[0].cutscenes[0].loop, false);
  migrated.scenes[0].tokens[0].resources.ep = { current: 4, max: 8 };
  migrated.scenes[0].cutscenes[0].loop = true;
  const restored = projectSchema.parse(JSON.parse(JSON.stringify(migrated)));
  assert.deepEqual(restored.scenes[0].tokens[0].resources.ep, { current: 4, max: 8 });
  assert.equal(restored.scenes[0].cutscenes[0].loop, true);
  restored.scenes[0].tokens[0].resources.hp.current = -1;
  assert.equal(projectSchema.safeParse(restored).success, false);
});

test("atalho de lanterna ativa o preset, desliga e religa sem afetar a orientação", () => {
  const token = { ...newToken("Agente", { x: 80, y: 80 }), rotation: 90, lanternDirection: "right" };
  const on = { ...token, ...toggleFlashlight(token) };
  assert.equal(on.lightKind, "flashlight"); assert.ok(on.light > 0); assert.equal(on.rotation, 90); assert.equal(on.lanternDirection, "right");
  const off = { ...on, ...toggleFlashlight(on) }; assert.equal(off.light, 0);
  assert.equal(toggleFlashlight(off).light, LIGHT_PRESETS.flashlight.radius);
});

test("legacy scenes migrate collections and cutscenes while media references survive", () => {
  const legacy = JSON.parse(JSON.stringify(starterProject([])));
  delete legacy.sceneGroups; delete legacy.tokenGroups; delete legacy.scenes[0].groupId; delete legacy.scenes[0].cutscenes;
  const project = projectSchema.parse(legacy);
  assert.deepEqual(project.sceneGroups, []); assert.deepEqual(project.tokenGroups, []);
  assert.equal(project.scenes[0].groupId, null); assert.deepEqual(project.scenes[0].cutscenes, []);
  project.sceneGroups.push({ id: "chapter", name: "Capítulo" }); project.tokenGroups.push({ id: "enemies", name: "Inimigos" });
  project.scenes[0].groupId = "chapter"; project.scenes[0].tokens.push({ ...newToken("X", { x: 100, y: 100 }), groupId: "enemies" });
  project.scenes[0].cutscenes.push({ id: "cutscene:one", title: "Entrada", x: 100, y: 100, size: 48, rotation: 0, asset: "movie", mime: "video/mp4", locked: false });
  const restored = projectSchema.parse(JSON.parse(JSON.stringify(project)));
  assert.equal(restored.scenes[0].tokens[0].groupId, "enemies");
  assert.ok(referencedAssets(restored).includes("movie"));
  const copied = duplicateSceneObject(restored.scenes[0], "cutscene:one");
  assert.equal(copied.cutscenes.length, 2); assert.equal(copied.cutscenes[1].asset, "movie");
  assert.equal(removeSceneObject(copied, "cutscene:one").cutscenes.length, 1);
});

test("wheel steps adjust radius and intensity together, bounded", () => {
  assert.deepEqual(stepLight(200, 1, 1), { radius: 232, intensity: 1.1 });
  assert.deepEqual(stepLight(200, 1, -1), { radius: 168, intensity: .9 });
  assert.deepEqual(stepLight(1000, 2, 1), { radius: 1000, intensity: 2 });
  assert.deepEqual(stepLight(32, .05, -1), { radius: 32, intensity: .05 });
});
test("horizontal mirroring reflects flashlight before token rotation", () => {
  const t = { ...newToken("Luz", { x: 0, y: 0 }), lanternDirection: "right", flipX: true, rotation: 45 };
  assert.equal(lanternAngle(t), 315);
  assert.equal(lanternAngle({ ...t, flipX: false }), 135);
  assert.equal(lanternAngle({ ...t, rotation: 0, lanternDirection: "up", flipY: true }), 180);
});
test("all eleven effects and legacy note defaults survive serialization", () => {
  const p = starterProject([]), s = p.scenes[0];
  s.effects = Object.keys(EFFECTS).map(kind => ({ id: kind, kind, x: 50, y: 50, ...effectSize(kind), rotation: 0, locked: false, hidden: false, intensity: 1 }));
  s.notes = [{ id: "note:n", x: 100, y: 100, title: "N", text: "Texto" }];
  const restored = projectSchema.parse(JSON.parse(JSON.stringify(p))).scenes[0];
  assert.equal(restored.effects.length, 11); assert.equal(restored.notes[0].size, 34);
  const resized = applyFrame(restored, "note:n", { ...entityFrame(restored, "note:n"), width: 120, height: 120, rotation: 45 });
  assert.equal(resized.notes[0].size, 120); assert.equal(resized.notes[0].rotation, 45);
});
test("unified deletion handles every board object and protects locks", () => {
  const p = starterProject([]), s = p.scenes[0];
  s.tokens = [newToken("A", { x: 50, y: 50 })];
  s.notes = [{ id: "note:n", x: 50, y: 50, size: 34, rotation: 0, title: "N", text: "", hidden: true, locked: false }];
  s.effects = [{ id: "fx", kind: "water", x: 50, y: 50, ...effectSize("water"), rotation: 0, locked: false, hidden: false, intensity: 1 }];
  s.drawings = [{ id: "d", color: "#ffffff", width: 3, points: [{ x: 0, y: 0 }], locked: false, hidden: false }];
  s.items = [{ id: "i", asset: "blob", kind: "image", name: "Item", x: 1, y: 1, width: 80, height: 80, rotation: 0, locked: false, hidden: false, flipX: false, flipY: false, showName: false }];
  s.walls = [{ id: "w", a: { x: 0, y: 0 }, b: { x: 80, y: 80 }, door: false, open: false, locked: false }];
  s.lights = [newLight("point", { x: 50, y: 50 })];
  s.fogStrokes = [{ mode: "reveal", radius: 30, points: [{ x: 0, y: 0 }] }];
  for (const [id, key] of [[s.tokens[0].id, "tokens"], ["note:n", "notes"], ["fx", "effects"], ["drawing:d", "drawings"], ["i", "items"], ["wall:w", "walls"], [`light:${s.lights[0].id}`, "lights"], ["fog:0", "fogStrokes"]]) assert.equal(removeSceneObject(s, id)[key].length, 0, id);
  assert.equal(removeSceneObject(patchSceneObject(s, "note:n", { locked: true }), "note:n").notes.length, 1);
  assert.equal(duplicateSceneObject(s, "fx").effects.length, 2);
  assert.equal(removeSceneObject(patchSceneObject(s, "__map__", { locked: false }), "__map__").template, false);
});

test("custom tokens retain vision alongside sheet-bound tokens; hidden or opted-out tokens do not reveal mist", () => {
  const custom = newToken("PNG", { x: 40, y: 80 }), sheet = { ...newToken("Ficha", { x: 400, y: 800 }), sheetId: "sheet" };
  assert.deepEqual(visionTokens([custom, sheet]).map(t => t.id), [custom.id, sheet.id]);
  assert.deepEqual(visionTokens([{ ...custom, hidden: true }, { ...sheet, vision: false }]), []);
});
test("lantern cardinal direction is independent of image orientation and persists", () => {
  const t = newToken("Lanterna", { x: 0, y: 0 });
  for (const [direction, angle] of Object.entries({ up: 0, right: 90, down: 180, left: 270 })) assert.equal(lanternAngle({ ...t, lanternDirection: direction, rotation: 45 }), (angle + 45) % 360);
  const p = starterProject([]); p.scenes[0].tokens = [{ ...t, lanternDirection: "left" }];
  assert.equal(projectSchema.parse(JSON.parse(JSON.stringify(p))).scenes[0].tokens[0].lanternDirection, "left");
});
test("wall translation and endpoint editing preserve doors and respect locking", () => {
  const s = newScene(); s.walls = [{ id: "w", a: { x: 10, y: 20 }, b: { x: 80, y: 90 }, door: true, open: false, locked: false }];
  const moved = editWall(s, "w", { x: 0, y: 0 }, { x: 30, y: 40 }, "move");
  assert.deepEqual(moved.walls[0].a, { x: 40, y: 60 }); assert.deepEqual(moved.walls[0].b, { x: 110, y: 130 });
  const resized = editWall(moved, "w", { x: 0, y: 0 }, { x: 500, y: 200 }, "b");
  assert.deepEqual(resized.walls[0].a, moved.walls[0].a); assert.equal(resized.walls[0].door, true);
  resized.walls[0].locked = true; assert.deepEqual(editWall(resized, "w", { x: 0, y: 0 }, { x: 0, y: 0 }, "a"), resized);
});
test("copying a folder duplicates its entire hierarchy without duplicating original image bytes", () => {
  const p = starterProject([]); p.folders = [{ id: "a", name: "A", parentId: null }, { id: "b", name: "B", parentId: "a" }];
  p.files = [{ id: "f", name: "Original", folderId: "b", asset: "blob", kind: "token", mime: "image/png" }];
  const copy = pasteLibrary(p, { kind: "folder", id: "a", cut: false }, null);
  assert.equal(copy.folders.length, 4); assert.equal(copy.files.length, 2); assert.equal(copy.files[1].asset, "blob"); assert.notEqual(copy.files[1].id, "f");
  assert.equal(descendants(copy, copy.folders[2].id).size, 2); assert.equal(folderPath(p, "b"), "Arquivos / A / B");
  assert.ok(projectSchema.safeParse(copy).success);
  assert.equal(pasteLibrary(p, { kind: "folder", id: "a", cut: true }, "b"), p);
});
test("cut and paste keeps file identity; copying creates a new reference; invalid destinations are ignored", () => {
  const p = starterProject([]); p.folders = [{ id: "dest", name: "Destino", parentId: null }]; p.files = [{ id: "f", name: "Pista", folderId: null, asset: "doc", kind: "document", mime: "text/plain" }];
  const moved = pasteLibrary(p, { kind: "file", id: "f", cut: true }, "dest"); assert.equal(moved.files.length, 1); assert.equal(moved.files[0].folderId, "dest"); assert.equal(moved.files[0].id, "f");
  assert.equal(pasteLibrary(p, { kind: "file", id: "f", cut: true }, "missing"), p);
  assert.equal(pasteLibrary(p, { kind: "file", id: "missing", cut: false }, null), p);
  assert.equal(pasteLibrary(p, { kind: "file", id: "f", cut: false }, null).files.length, 2);
});
test("scene notes and animated effects survive export and support object transforms", () => {
  const p = starterProject([]), s = p.scenes[0];
  s.notes = [{ id: "note:a", x: 80, y: 90, title: "Segredo", text: "Texto\ncom parágrafos.", hidden: true, locked: false }];
  s.effects = [{ id: "fx", x: 120, y: 140, width: 300, height: 80, rotation: 90, locked: false, kind: "laser", intensity: 1.5, hidden: false }];
  const parsed = projectSchema.parse(JSON.parse(JSON.stringify(p))); assert.equal(parsed.scenes[0].notes[0].hidden, true); assert.equal(parsed.scenes[0].effects[0].kind, "laser");
  const moved = applyFrame(s, "fx", { ...entityFrame(s, "fx"), x: 500, rotation: 180 }); assert.equal(moved.effects[0].x, 500); assert.equal(moved.effects[0].rotation, 180);
  assert.equal(applyFrame(s, "note:a", { ...entityFrame(s, "note:a"), x: 600 }).notes[0].x, 600);
});

test("tabletop grid and measurement use world units, independently of display zoom", () => {
  assert.deepEqual(snapPoint({ x: 94, y: 131 }, 64), { x: 64, y: 128 });
  assert.equal(distance({ x: 0, y: 0 }, { x: 192, y: 256 }) / 64 * 1.5, 7.5);
});
test("lighting reaches its radius with no walls and stops at closed walls", () => {
  const origin = { x: 0, y: 0 }, wall = { id: "wall", a: { x: 40, y: -60 }, b: { x: 40, y: 60 }, door: false, open: false };
  const clear = visibilityPolygon(origin, 100, []);
  assert.ok(clear.every(p => Math.abs(distance(origin, p) - 100) < .001));
  const blocked = visibilityPolygon(origin, 100, [wall]);
  const right = blocked.filter(p => Math.abs(p.y) < .01 && p.x > 0);
  assert.ok(right.length > 0); assert.ok(right.every(p => p.x <= 40.001));
});
test("open doors let light through while closed doors block it", () => {
  const door = { id: "door", a: { x: 40, y: -60 }, b: { x: 40, y: 60 }, door: true, open: true };
  assert.ok(visibilityPolygon({ x: 0, y: 0 }, 100, [door]).some(p => p.x > 99));
  assert.ok(!visibilityPolygon({ x: 0, y: 0 }, 100, [{ ...door, open: false }]).some(p => p.x > 40.001 && Math.abs(p.y) < 1));
});
test("light polygons keep angular order across the negative-angle seam and ignore distant walls", () => {
  const wall = { id: "left", a: { x: -40, y: -60 }, b: { x: -40, y: 60 }, door: false, open: false };
  const turn = Math.PI * 2;
  const polygon = visibilityPolygon({ x: 0, y: 0 }, 100, [wall]);
  const angles = polygon.map(p => (Math.atan2(p.y, p.x) + turn) % turn);
  assert.ok(angles.every((a, i) => i === 0 || a + 1e-9 >= angles[i - 1]));
  const far = { ...wall, a: { x: 1000, y: 1000 }, b: { x: 1200, y: 1200 } };
  assert.deepEqual(visibilityPolygon({ x: 0, y: 0 }, 100, [far]), visibilityPolygon({ x: 0, y: 0 }, 100, []));
});
test("starter boards bind campaign characters without sharing mutable token state", () => {
  const project = starterProject([{ id: "sheet", name: "Kaori", ownerId: "player" }]);
  assert.equal(project.scenes[0].tokens[0].sheetId, "sheet");
  assert.equal(project.scenes[0].tokens[0].ownerId, "player");
  assert.ok(projectSchema.safeParse(project).success);
  const second = newScene(); assert.notEqual(second.id, project.active); assert.equal(second.tokens.length, 0);
});
test("scene imports reject broken active scenes, unsafe coordinates and expensive payloads", () => {
  const project = starterProject([]);
  assert.equal(projectSchema.safeParse({ ...project, active: "missing" }).success, false);
  assert.equal(projectSchema.safeParse({ ...project, scenes: [{ ...project.scenes[0], width: Infinity }] }).success, false);
  assert.equal(projectSchema.safeParse({ ...project, scenes: [{ ...project.scenes[0], width: 100000 }] }).success, false);
  assert.equal(projectSchema.safeParse({ ...project, scenes: [{ ...project.scenes[0], tokens: Array.from({ length: 501 }, () => newToken("Too many", { x: 0, y: 0 })) }] }).success, false);
});
test("asset exports include every token variant and map without duplicates", () => {
  const scene = newScene(); scene.map = "map-image";
  scene.tokens = [{ ...newToken("Hero", { x: 0, y: 0 }), variants: [{ name: "Normal", asset: "token-normal" }, { name: "Wounded", asset: "token-wounded" }] }];
  assert.deepEqual(referencedAssets({ version: 1, active: scene.id, scenes: [scene, { ...scene, id: "second" }] }).sort(), ["map-image", "token-normal", "token-wounded"]);
});
test("local boards are isolated by account, campaign and demonstration context", () => {
  assert.equal(new Set([tabletopKey("a", "one", false), tabletopKey("a", "two", false), tabletopKey("b", "one", false), tabletopKey("a", "one", true)]).size, 4);
});
test("older scenes migrate to hidden token names, soft light defaults and empty folders", () => {
  const old = starterProject([{ id: "sheet", name: "Hero", ownerId: "owner" }]);
  delete old.files; delete old.folders;
  const s = old.scenes[0], t = s.tokens[0];
  for (const field of ["showName", "flipX", "flipY", "aspect", "lightKind", "lightIntensity", "lightColor"]) delete t[field];
  for (const field of ["weatherIntensity", "visionRadius", "items"]) delete s[field];
  for (const field of ["kind", "intensity", "rotation"]) delete s.lights[0][field];
  const restored = projectSchema.parse(old);
  assert.equal(restored.scenes[0].tokens[0].showName, false);
  assert.equal(restored.scenes[0].tokens[0].flipX, false);
  assert.equal(restored.scenes[0].lights[0].intensity, 1);
  assert.equal(restored.scenes[0].weatherIntensity, .5);
  assert.deepEqual(restored.folders, []); assert.deepEqual(restored.files, []);
});
test("image transforms preserve token state and move the attached light origin immediately", () => {
  const scene = newScene(), token = { ...newToken("Cutout", { x: 64, y: 64 }), size: 128, aspect: .5, light: 256, flipX: true, condition: "wounded", variants: [{ name: "Original", asset: "png" }] };
  scene.tokens = [token];
  const frame = tokenFrame(token); assert.equal(frame.width, 64); assert.equal(frame.height, 128);
  const changed = applyFrame(scene, token.id, { ...frame, x: 320, y: 448, width: 128, height: 256, rotation: 90 });
  assert.equal(changed.tokens[0].x, 320); assert.equal(changed.tokens[0].y, 448);
  assert.equal(changed.tokens[0].aspect, .5); assert.equal(changed.tokens[0].light, 256);
  assert.equal(changed.tokens[0].flipX, true); assert.equal(changed.tokens[0].condition, "wounded");
  assert.equal(scene.tokens[0].x, 64); assert.equal(changed.tokens[0].variants[0].asset, "png");
});
test("resize and rotation handles work in the rotated object's coordinate space", () => {
  const frame = { x: 0, y: 0, width: 64, height: 128, rotation: 90, locked: false };
  const resized = resizeFrame(frame, { x: -128, y: 64 });
  assert.ok(Math.abs(resized.width - 128) < .001); assert.ok(Math.abs(resized.height - 256) < .001);
  assert.equal(rotatedAngle({ x: 0, y: 0 }, { x: 0, y: -10 }), 0);
  assert.equal(rotatedAngle({ x: 0, y: 0 }, { x: 10, y: 0 }), 90);
  assert.equal(rotatedAngle({ x: 0, y: 0 }, { x: 10, y: -2 }, true) % 15, 0);
});
test("map transforms are independent from the scene grid and original asset reference", () => {
  const scene = newScene(); scene.map = "original-map";
  const frame = mapFrame(scene); assert.equal(frame.locked, true);
  const changed = applyFrame(scene, "__map__", { ...frame, width: 3000, height: 2000, rotation: 30, locked: false });
  assert.equal(changed.map, "original-map"); assert.equal(changed.width, scene.width);
  assert.equal(changed.cell, scene.cell); assert.equal(entityFrame(changed, "__map__").width, 3000);
});
test("light presets, intensity and mist controls survive serialization", () => {
  const project = starterProject([]), s = project.scenes[0];
  s.lights = Object.keys(LIGHT_PRESETS).map(kind => newLight(kind, { x: 0, y: 0 }));
  s.lights[0].intensity = 0; s.lights[1].intensity = 2;
  s.weather = "mist"; s.weatherIntensity = .9; s.visionRadius = 480;
  const restored = projectSchema.parse(JSON.parse(JSON.stringify(project)));
  assert.deepEqual(restored.scenes[0].lights.map(l => l.kind), ["point", "torch", "fire", "flashlight"]);
  assert.equal(restored.scenes[0].lights[0].intensity, 0); assert.equal(restored.scenes[0].weatherIntensity, .9);
});
test("folders reject cycles and missing parents; exports include documents and placed items", () => {
  const project = starterProject([]);
  project.folders = [{ id: "root", name: "Campaign", parentId: null }, { id: "tokens", name: "Tokens", parentId: "root" }];
  project.files = [{ id: "file", asset: "document", name: "Clue", kind: "document", folderId: "root", mime: "application/pdf" }];
  project.scenes[0].items = [{ id: "item", asset: "item-image", name: "Sword", kind: "image", x: 0, y: 0, width: 80, height: 140, rotation: 0, locked: false, hidden: false, flipX: false, flipY: false, showName: false }];
  assert.equal(projectSchema.safeParse(project).success, true);
  assert.deepEqual(referencedAssets(project).sort(), ["document", "item-image"]);
  assert.equal(projectSchema.safeParse({ ...project, folders: [{ ...project.folders[0], parentId: "tokens" }, project.folders[1]] }).success, false);
  assert.equal(projectSchema.safeParse({ ...project, files: [{ ...project.files[0], folderId: "missing" }] }).success, false);
});

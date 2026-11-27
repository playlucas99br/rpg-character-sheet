import { EFFECTS, mapFrame, uid, type Scene } from "./model.ts";
export type ObjectKind = "map" | "token" | "item" | "note" | "cutscene" | "effect" | "light" | "wall" | "drawing" | "fog";
export type ObjectInfo = { id: string; kind: ObjectKind; name: string; locked: boolean; hidden: boolean };
export function sceneObject(scene: Scene, id: string): ObjectInfo | undefined {
  if (id === "__map__") return { id, kind: "map", name: "Mapa de fundo", locked: mapFrame(scene).locked, hidden: !scene.layers.map };
  const token = scene.tokens.find(t => t.id === id); if (token) return { ...token, kind: "token" };
  const item = scene.items.find(i => i.id === id); if (item) return { ...item, kind: "item" };
  const note = scene.notes.find(n => n.id === id); if (note) return { ...note, kind: "note", name: note.title || "Nota de cena" };
  const cutscene = scene.cutscenes.find(n => n.id === id); if (cutscene) return { ...cutscene, kind: "cutscene", name: cutscene.title || "Cutscene", hidden: true };
  const effect = scene.effects.find(e => e.id === id); if (effect) return { ...effect, kind: "effect", name: EFFECTS[effect.kind] };
  if (id.startsWith("light:")) { const light = scene.lights.find(l => l.id === id.slice(6)); if (light) return { id, kind: "light", name: "Fonte de luz", locked: false, hidden: false }; }
  if (id.startsWith("wall:")) { const wall = scene.walls.find(w => w.id === id.slice(5)); if (wall) return { id, kind: "wall", name: wall.door ? "Porta" : "Parede", locked: wall.locked, hidden: false }; }
  if (id.startsWith("drawing:")) { const drawing = scene.drawings.find(d => d.id === id.slice(8)); if (drawing) return { ...drawing, id, kind: "drawing", name: "Desenho" }; }
  if (/^fog:\d+$/.test(id) && scene.fogStrokes[Number(id.slice(4))]) return { id, kind: "fog", name: "Pincelada de névoa de guerra", locked: false, hidden: false };
}
export function removeSceneObject(scene: Scene, id: string): Scene {
  const object = sceneObject(scene, id); if (!object || object.locked) return scene;
  switch (object.kind) {
    case "map": return { ...scene, map: undefined, mapTransform: undefined, template: false };
    case "token": return { ...scene, tokens: scene.tokens.filter(t => t.id !== id) };
    case "item": return { ...scene, items: scene.items.filter(t => t.id !== id) };
    case "note": return { ...scene, notes: scene.notes.filter(t => t.id !== id) };
    case "cutscene": return { ...scene, cutscenes: scene.cutscenes.filter(t => t.id !== id) };
    case "effect": return { ...scene, effects: scene.effects.filter(t => t.id !== id) };
    case "light": return { ...scene, lights: scene.lights.filter(t => t.id !== id.slice(6)) };
    case "wall": return { ...scene, walls: scene.walls.filter(t => t.id !== id.slice(5)) };
    case "drawing": return { ...scene, drawings: scene.drawings.filter(t => t.id !== id.slice(8)) };
    case "fog": return { ...scene, fogStrokes: scene.fogStrokes.filter((_, index) => index !== Number(id.slice(4))) };
  }
}
export function patchSceneObject(scene: Scene, id: string, patch: { locked?: boolean; hidden?: boolean }): Scene {
  const object = sceneObject(scene, id); if (!object) return scene;
  switch (object.kind) {
    case "map": return { ...scene, mapTransform: { ...mapFrame(scene), locked: patch.locked ?? object.locked }, layers: { ...scene.layers, map: patch.hidden === undefined ? scene.layers.map : !patch.hidden } };
    case "token": return { ...scene, tokens: scene.tokens.map(t => t.id === id ? { ...t, ...patch } : t) };
    case "item": return { ...scene, items: scene.items.map(t => t.id === id ? { ...t, ...patch } : t) };
    case "note": return { ...scene, notes: scene.notes.map(t => t.id === id ? { ...t, ...patch } : t) };
    case "cutscene": return { ...scene, cutscenes: scene.cutscenes.map(t => t.id === id ? { ...t, locked: patch.locked ?? t.locked } : t) };
    case "effect": return { ...scene, effects: scene.effects.map(t => t.id === id ? { ...t, ...patch } : t) };
    case "drawing": return { ...scene, drawings: scene.drawings.map(t => t.id === id.slice(8) ? { ...t, ...patch } : t) };
    case "wall": return { ...scene, walls: scene.walls.map(t => t.id === id.slice(5) ? { ...t, locked: patch.locked ?? t.locked } : t) };
    default: return scene;
  }
}
export function duplicateSceneObject(scene: Scene, id: string): Scene {
  const object = sceneObject(scene, id); if (!object) return scene;
  const offset = { id: uid(), locked: false };
  switch (object.kind) {
    case "token": { const t = scene.tokens.find(t => t.id === id)!; return { ...scene, tokens: [...scene.tokens, { ...t, ...offset, x: t.x + scene.cell, y: t.y + scene.cell, variants: t.variants.map(v => ({ ...v })) }] }; }
    case "note": { const t = scene.notes.find(t => t.id === id)!; return { ...scene, notes: [...scene.notes, { ...t, ...offset, id: `note:${offset.id}`, x: t.x + scene.cell, y: t.y + scene.cell }] }; }
    case "cutscene": { const t = scene.cutscenes.find(t => t.id === id)!; return { ...scene, cutscenes: [...scene.cutscenes, { ...t, ...offset, id: `cutscene:${offset.id}`, x: t.x + scene.cell, y: t.y + scene.cell }] }; }
    case "effect": { const t = scene.effects.find(t => t.id === id)!; return { ...scene, effects: [...scene.effects, { ...t, ...offset, x: t.x + scene.cell, y: t.y + scene.cell }] }; }
    case "item": { const t = scene.items.find(t => t.id === id)!; return { ...scene, items: [...scene.items, { ...t, ...offset, x: t.x + scene.cell, y: t.y + scene.cell }] }; }
    case "light": { const t = scene.lights.find(t => t.id === id.slice(6))!; return { ...scene, lights: [...scene.lights, { ...t, id: offset.id, x: t.x + scene.cell, y: t.y + scene.cell }] }; }
    case "wall": { const t = scene.walls.find(t => t.id === id.slice(5))!; return { ...scene, walls: [...scene.walls, { ...t, ...offset, a: { x: t.a.x + scene.cell, y: t.a.y + scene.cell }, b: { x: t.b.x + scene.cell, y: t.b.y + scene.cell } }] }; }
    case "drawing": { const t = scene.drawings.find(t => t.id === id.slice(8))!; return { ...scene, drawings: [...scene.drawings, { ...t, ...offset, points: t.points.map(p => ({ x: p.x + scene.cell, y: p.y + scene.cell })) }] }; }
    default: return scene;
  }
}

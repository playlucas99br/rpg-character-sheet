import { z } from "zod";

export const CELL = 64;
export const MAX_IMAGE_BYTES = 80 * 1024 * 1024;
export const MAX_CUTSCENE_VIDEO_BYTES = 1024 * 1024 * 1024;
const number = z.number().finite();
const point = z.object({ x: number, y: number });
export type Point = z.infer<typeof point>;
const id = z.string().min(1).max(120);
const color = z.string().regex(/^#[a-fA-F0-9]{6}$/);
export const lightKindSchema = z.enum(["point", "torch", "fire", "flashlight"]);
export type LightKind = z.infer<typeof lightKindSchema>;
export const LANTERN_DIRECTIONS = { up: { label: "Cima", angle: 0 }, right: { label: "Direita", angle: 90 }, down: { label: "Baixo", angle: 180 }, left: { label: "Esquerda", angle: 270 } } as const;
export const EFFECTS = { flame: "Chama", laser: "Laser", lightning: "Raios", smoke: "Fumaça", portal: "Portal", vortex: "Vórtice", embers: "Fagulhas", frost: "Geada", poison: "Nuvem tóxica", water: "Ondulações", sacred: "Aura de luz" } as const;
export const effectKindSchema = z.enum(["flame", "laser", "lightning", "smoke", "portal", "vortex", "embers", "frost", "poison", "water", "sacred"]);
export const LIGHT_PRESETS: Record<LightKind, { name: string; color: string; radius: number; intensity: number }> = {
  point: { name: "Ponto de luz", color: "#fff0cc", radius: 256, intensity: 1 },
  torch: { name: "Tocha", color: "#ffc078", radius: 256, intensity: 1.15 },
  fire: { name: "Fogo", color: "#ff9550", radius: 320, intensity: 1.4 },
  flashlight: { name: "Lanterna", color: "#dcecff", radius: 448, intensity: 1.3 },
};
export const lightSchema = z.object({ id, x: number, y: number, radius: number.min(16).max(4000), color, kind: lightKindSchema.default("point"), intensity: number.min(0).max(2).default(1), rotation: number.default(0) });
export type Light = z.infer<typeof lightSchema>;
export const frameSchema = z.object({ x: number, y: number, width: number.min(8).max(50000), height: number.min(8).max(50000), rotation: number.default(0), locked: z.boolean().default(false) });
export type Frame = z.infer<typeof frameSchema>;
export const effectSchema = frameSchema.extend({ id, kind: effectKindSchema, intensity: number.min(0).max(2).default(1), hidden: z.boolean().default(false) });
export type BoardEffect = z.infer<typeof effectSchema>;
export const noteSchema = z.object({ id, x: number, y: number, size: number.min(16).max(1000).default(34), rotation: number.default(0), title: z.string().max(100), text: z.string().max(12000), hidden: z.boolean().default(true), locked: z.boolean().default(false) });
export const cutsceneSchema = z.object({ id, x: number, y: number, size: number.min(16).max(1000).default(48), rotation: number.default(0), title: z.string().max(100), asset: id.optional(), mime: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm"]).optional(), loop: z.boolean().default(false), locked: z.boolean().default(false) });
export type Cutscene = z.infer<typeof cutsceneSchema>;
export const placedItemSchema = frameSchema.extend({ id, asset: id, name: z.string().max(160), kind: z.enum(["image", "document"]), hidden: z.boolean().default(false), flipX: z.boolean().default(false), flipY: z.boolean().default(false), showName: z.boolean().default(false) });
export type PlacedItem = z.infer<typeof placedItemSchema>;
export const libraryFileSchema = z.object({ id, asset: id, name: z.string().min(1).max(160), kind: z.enum(["map", "token", "item", "document"]), folderId: id.nullable().default(null), mime: z.string().max(160), width: number.positive().max(50000).optional(), height: number.positive().max(50000).optional() });
export type LibraryFile = z.infer<typeof libraryFileSchema>;
export const LIBRARY_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "text/plain", "text/markdown", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
export const DRAG_MIME = "application/x-nexo-tabletop";
export type BoardDrag = { kind: "file" | "token" | "character"; id: string } | { kind: "tool"; tool: string } | { kind: "light"; lightKind: LightKind } | { kind: "weather"; weather: string } | { kind: "effect"; effect: keyof typeof EFFECTS };
export const tokenSchema = z.object({
  resources: z.object({ hp: z.object({ current: z.number().int().min(0).max(1000000), max: z.number().int().min(0).max(1000000) }), ep: z.object({ current: z.number().int().min(0).max(1000000), max: z.number().int().min(0).max(1000000) }), sanity: z.object({ current: z.number().int().min(0).max(1000000), max: z.number().int().min(0).max(1000000) }) }).default({ hp: { current: 10, max: 10 }, ep: { current: 0, max: 0 }, sanity: { current: 0, max: 0 } }),
  groupId: id.nullable().default(null),
  id, name: z.string().max(100), x: number, y: number,
  size: number.min(8).max(10000), rotation: number,
  aspect: number.min(.02).max(50).default(1), flipX: z.boolean().default(false), flipY: z.boolean().default(false), showName: z.boolean().default(false),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  variants: z.array(z.object({ name: z.string().max(100), asset: id })).max(12),
  variant: z.number().int().min(0).max(11),
  sheetId: id.optional(), ownerId: id.optional(),
  hidden: z.boolean(), locked: z.boolean(), light: number.min(0).max(1000),
  lightKind: lightKindSchema.default("torch"), lightIntensity: number.min(0).max(2).default(1), lightColor: color.default("#ffc078"),
  vision: z.boolean().default(true), lanternDirection: z.enum(["up", "down", "left", "right"]).default("up"),
  condition: z.enum(["none", "wounded", "prone", "concentrating", "dead"]),
});
export type Token = z.infer<typeof tokenSchema>;
export const sceneSchema = z.object({
  groupId: id.nullable().default(null),
  id, name: z.string().min(1).max(100), width: number.min(320).max(50000), height: number.min(320).max(50000),
  map: id.optional(), template: z.boolean().default(true), grid: z.boolean(), snap: z.boolean(), cell: number.min(16).max(256),
  unit: number.min(0.1).max(100), ambient: z.enum(["day", "dusk", "night"]),
  weather: z.enum(["none", "rain", "snow", "embers", "mist"]), weatherIntensity: number.min(0).max(1).default(.5), visionRadius: number.min(32).max(2000).default(320),
  mapTransform: frameSchema.optional(), items: z.array(placedItemSchema).max(500).default([]),
  notes: z.array(noteSchema).max(500).default([]), cutscenes: z.array(cutsceneSchema).max(100).default([]), effects: z.array(effectSchema).max(100).default([]),
  fog: z.boolean(), fogStrokes: z.array(z.object({ mode: z.enum(["reveal", "hide"]), radius: number.min(8).max(640), points: z.array(point).min(1).max(5000) })).max(1000),
  walls: z.array(z.object({ id, a: point, b: point, door: z.boolean(), open: z.boolean(), locked: z.boolean().default(false) })).max(2000),
  lights: z.array(lightSchema).max(100),
  drawings: z.array(z.object({ id, color: z.string().regex(/^#[a-fA-F0-9]{6}$/), points: z.array(point).min(1).max(5000), locked: z.boolean().default(false), hidden: z.boolean().default(false) })).max(1000),
  tokens: z.array(tokenSchema).max(500),
  layers: z.object({ map: z.boolean(), drawings: z.boolean(), tokens: z.boolean(), effects: z.boolean() }),
});
export type Scene = z.infer<typeof sceneSchema>;
const groupSchema = z.object({ id, name: z.string().trim().min(1).max(100) });
export const projectSchema = z.object({ version: z.literal(1), active: id, scenes: z.array(sceneSchema).min(1).max(30), sceneGroups: z.array(groupSchema).max(100).default([]), tokenGroups: z.array(groupSchema).max(100).default([]), libraryIndexed: z.boolean().default(false), folders: z.array(z.object({ id, name: z.string().min(1).max(100), parentId: id.nullable() })).max(500).default([]), files: z.array(libraryFileSchema).max(2000).default([]) }).refine(p => p.scenes.some(s => s.id === p.active), "Cena ativa não encontrada.").refine(p => {
  const parents = new Map(p.folders.map(f => [f.id, f.parentId]));
  if (parents.size !== p.folders.length) return false;
  for (const folder of p.folders) { const visited = new Set<string>(); let current: string | null = folder.id; while (current) { if (visited.has(current) || !parents.has(current)) return false; visited.add(current); current = parents.get(current) ?? null; } }
  return p.files.every(f => !f.folderId || parents.has(f.folderId));
}, "A organização das pastas é inválida.");
export type TabletopProject = z.infer<typeof projectSchema>;
export const uid = () => crypto.randomUUID();
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function snapPoint(p: Point, cell: number): Point {
  return { x: Math.round(p.x / cell) * cell, y: Math.round(p.y / cell) * cell };
}
export function newScene(name = "Nova cena"): Scene {
  return sceneSchema.parse({ id: uid(), name, width: 1792, height: 1152, template: false, grid: true, snap: true, cell: CELL, unit: 1.5, ambient: "day", weather: "none", fog: false, fogStrokes: [], walls: [], lights: [], drawings: [], tokens: [], layers: { map: true, drawings: true, tokens: true, effects: true } });
}
export function newToken(name: string, p: Point, color = "#c5dba6"): Token {
  return tokenSchema.parse({ id: uid(), name, ...p, color, size: CELL, rotation: 0, variants: [], variant: 0, hidden: false, locked: false, light: 0, condition: "none" });
}
export function starterProject(characters: { id: string; name: string; ownerId: string }[]): TabletopProject {
  const scene = newScene("O refúgio esquecido");
  scene.template = true;
  scene.tokens = characters.slice(0, 4).map((c, i) => ({ ...newToken(c.name, { x: 704 + i * CELL, y: 768 }, ["#c5dba6", "#dbb48a", "#a6c9dc", "#c2addc"][i]), sheetId: c.id, ownerId: c.ownerId }));
  scene.lights = [newLight("torch", { x: 896, y: 448 })];
  return { version: 1, active: scene.id, scenes: [scene], sceneGroups: [], tokenGroups: [], folders: [], files: [], libraryIndexed: true };
}
export function newLight(kind: LightKind, point: Point): Light { return lightSchema.parse({ id: uid(), ...point, ...LIGHT_PRESETS[kind], kind, rotation: 0 }); }
export function mapFrame(scene: Scene): Frame { return scene.mapTransform ?? { x: scene.width / 2, y: scene.height / 2, width: scene.width, height: scene.height, rotation: 0, locked: true }; }
export function tokenFrame(token: Token): Frame { return { x: token.x, y: token.y, width: token.size * token.aspect, height: token.size, rotation: token.rotation, locked: token.locked }; }
export function resizeFrame(frame: Frame, pointer: Point, limit = 50000): Frame {
  const angle = -frame.rotation * Math.PI / 180, dx = pointer.x - frame.x, dy = pointer.y - frame.y;
  const x = dx * Math.cos(angle) - dy * Math.sin(angle), y = dx * Math.sin(angle) + dy * Math.cos(angle);
  const scale = Math.max(8 / Math.min(frame.width, frame.height), Math.min(limit / Math.max(frame.width, frame.height), Math.max(x * 2 / frame.width, y * 2 / frame.height)));
  return { ...frame, width: frame.width * scale, height: frame.height * scale };
}
export function rotatedAngle(center: Point, pointer: Point, snap = false) { const degrees = (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180 / Math.PI + 450) % 360; return snap ? Math.round(degrees / 15) * 15 % 360 : Math.round(degrees * 10) / 10; }
export function entityFrame(scene: Scene, id: string): Frame | undefined {
  if (id === "__map__") return mapFrame(scene);
  if (id.startsWith("light:")) { const l = scene.lights.find(l => l.id === id.slice(6)); return l ? { x: l.x, y: l.y, width: 32, height: 32, rotation: l.rotation, locked: false } : undefined; }
  const token = scene.tokens.find(t => t.id === id); if (token) return tokenFrame(token);
  const note = scene.notes.find(n => n.id === id); if (note) return { ...note, width: note.size ?? 34, height: note.size ?? 34, rotation: note.rotation ?? 0 };
  const cutscene = scene.cutscenes.find(n => n.id === id); if (cutscene) return { ...cutscene, width: cutscene.size, height: cutscene.size };
  const effect = scene.effects.find(e => e.id === id); if (effect) return effect;
  return scene.items.find(item => item.id === id);
}
export function applyFrame(scene: Scene, id: string, frame: Frame): Scene {
  if (id === "__map__") return { ...scene, mapTransform: frame };
  if (id.startsWith("light:")) return { ...scene, lights: scene.lights.map(l => l.id === id.slice(6) ? { ...l, x: frame.x, y: frame.y, rotation: frame.rotation } : l) };
  if (scene.tokens.some(t => t.id === id)) return { ...scene, tokens: scene.tokens.map(t => t.id === id ? { ...t, x: frame.x, y: frame.y, size: Math.min(10000, frame.height), aspect: Math.min(50, Math.max(.02, frame.width / frame.height)), rotation: frame.rotation, locked: frame.locked } : t) };
  if (scene.notes.some(n => n.id === id)) return { ...scene, notes: scene.notes.map(n => n.id === id ? { ...n, x: frame.x, y: frame.y, size: Math.max(16, Math.min(1000, frame.width)), rotation: frame.rotation, locked: frame.locked } : n) };
  if (scene.cutscenes.some(n => n.id === id)) return { ...scene, cutscenes: scene.cutscenes.map(n => n.id === id ? { ...n, x: frame.x, y: frame.y, size: Math.max(16, Math.min(1000, frame.width)), rotation: frame.rotation, locked: frame.locked } : n) };
  if (scene.effects.some(e => e.id === id)) return { ...scene, effects: scene.effects.map(e => e.id === id ? { ...e, ...frame } : e) };
  return { ...scene, items: scene.items.map(item => item.id === id ? { ...item, ...frame } : item) };
}
export function visionTokens(tokens: Token[]) { return tokens.filter(t => !t.hidden && t.vision); }
export function lanternAngle(token: Token) {
  let angle: number = LANTERN_DIRECTIONS[token.lanternDirection].angle;
  if (token.flipX) angle = -angle;
  if (token.flipY) angle = 180 - angle;
  return ((token.rotation + angle) % 360 + 360) % 360;
}
export function toggleFlashlight(token: Token): Partial<Token> {
  if (token.lightKind === "flashlight") return { light: token.light > 0 ? 0 : LIGHT_PRESETS.flashlight.radius };
  const preset = LIGHT_PRESETS.flashlight;
  return { lightKind: "flashlight", light: preset.radius, lightIntensity: preset.intensity, lightColor: preset.color };
}
export function stepLight(radius: number, intensity: number, direction: number) {
  const step = Math.sign(direction);
  return { radius: Math.max(32, Math.min(1000, Math.round(radius + step * 32))), intensity: Math.round(Math.max(.05, Math.min(2, intensity + step * .1)) * 100) / 100 };
}
export function effectSize(kind: keyof typeof EFFECTS) { return kind === "flame" ? { width: 160, height: 224 } : kind === "laser" || kind === "lightning" ? { width: 360, height: 100 } : { width: 256, height: 256 }; }
export function editWall(scene: Scene, id: string, from: Point, to: Point, mode: "move" | "a" | "b"): Scene {
  return { ...scene, walls: scene.walls.map(w => w.id !== id || w.locked ? w : mode === "move" ? { ...w, a: { x: w.a.x + to.x - from.x, y: w.a.y + to.y - from.y }, b: { x: w.b.x + to.x - from.x, y: w.b.y + to.y - from.y } } : { ...w, [mode]: to }) };
}
/** Ray/segment intersection in world coordinates. Doors only block while closed. */
export function visibilityPolygon(origin: Point, radius: number, walls: Scene["walls"]): Point[] {
  const blockers = walls.filter(w => {
    if (w.door && w.open) return false;
    const dx = w.b.x - w.a.x, dy = w.b.y - w.a.y;
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((origin.x - w.a.x) * dx + (origin.y - w.a.y) * dy) / length)) : 0;
    return distance(origin, { x: w.a.x + dx * t, y: w.a.y + dy * t }) <= radius;
  });
  const angles = Array.from({ length: 96 }, (_, i) => i * Math.PI * 2 / 96);
  for (const wall of blockers) for (const p of [wall.a, wall.b]) {
    const a = Math.atan2(p.y - origin.y, p.x - origin.x);
    angles.push(a - 0.0001, a, a + 0.0001);
  }
  const turn = Math.PI * 2;
  return angles.map(a => (a + turn) % turn).sort((a, b) => a - b).map(angle => {
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    let nearest = radius;
    for (const wall of blockers) {
      const sx = wall.b.x - wall.a.x, sy = wall.b.y - wall.a.y;
      const cross = direction.x * sy - direction.y * sx;
      if (Math.abs(cross) < 1e-9) continue;
      const qx = wall.a.x - origin.x, qy = wall.a.y - origin.y;
      const t = (qx * sy - qy * sx) / cross;
      const u = (qx * direction.y - qy * direction.x) / cross;
      if (t >= 0 && u >= 0 && u <= 1) nearest = Math.min(nearest, t);
    }
    return { x: origin.x + direction.x * nearest, y: origin.y + direction.y * nearest };
  });
}
export function pathPoints(points: Point[]) { return points.map(p => `${p.x},${p.y}`).join(" "); }

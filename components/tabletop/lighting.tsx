import { lanternAngle, visionTokens, pathPoints, visibilityPolygon, type Light, type Point, type Scene, type Token } from "../../lib/tabletop/model";
import type { WorldBounds } from "../../lib/tabletop/viewport";

export type RenderLight = Light & { polygon: Point[] | null };
export type { WorldBounds } from "../../lib/tabletop/viewport";
// A changing mask URL makes browsers repaint SVG masks while an object rotates.
export function flashlightMaskId(id: string, light: Light) { return `${id}-cone-${light.id}-${light.x}-${light.y}-${light.radius}-${light.rotation}`; }
const geometry = new WeakMap<Scene["walls"], Map<string, Point[]>>();
function cachedPolygon(light: Light, walls: Scene["walls"]) {
  let cache = geometry.get(walls); if (!cache) { cache = new Map(); geometry.set(walls, cache); }
  const key = `${light.x}:${light.y}:${light.radius}`;
  let polygon = cache.get(key);
  if (!polygon) { polygon = visibilityPolygon(light, light.radius, walls); if (cache.size > 256) cache.clear(); cache.set(key, polygon); }
  return polygon;
}
export function sceneLights(scene: Scene, tokens: Token[], playerView: boolean): RenderLight[] {
  const lights = [...scene.lights, ...tokens.filter(t => t.light > 0 && (!playerView || !t.hidden)).map(t => ({ id: t.id, x: t.x, y: t.y, radius: t.light, color: t.lightColor, kind: t.lightKind, intensity: t.lightIntensity, rotation: lanternAngle(t) }))];
  const hasBlockers = scene.walls.some(wall => !wall.door || !wall.open);
  return lights.map(l => ({ ...l, polygon: hasBlockers ? cachedPolygon(l, scene.walls) : null }));
}
function cone(light: Light) {
  const angle = (light.rotation - 90) * Math.PI / 180, spread = 32 * Math.PI / 180;
  return pathPoints([{ x: light.x, y: light.y }, ...Array.from({ length: 33 }, (_, i) => { const a = angle - spread + i / 32 * spread * 2; return { x: light.x + Math.cos(a) * light.radius, y: light.y + Math.sin(a) * light.radius }; })]);
}
export function LightingDefs({ id, lights, scene, tokens, bounds }: { id: string; lights: RenderLight[]; scene: Scene; tokens: Token[]; bounds: WorldBounds }) {
  const mistVisible = scene.layers.effects && scene.weather === "mist" && scene.weatherIntensity > 0;
  return <>
    {lights.map(l => <g key={l.id}>
      <radialGradient id={`${id}-glow-${l.id}`} gradientUnits="userSpaceOnUse" cx={l.x} cy={l.y} r={l.radius}>
        <stop offset="0" stopColor={l.color} stopOpacity={Math.min(.8, l.intensity * .38)} /><stop offset=".18" stopColor={l.color} stopOpacity={Math.min(.6, l.intensity * .28)} /><stop offset=".5" stopColor={l.color} stopOpacity={l.intensity * .12} /><stop offset=".8" stopColor={l.color} stopOpacity={l.intensity * .025} /><stop offset="1" stopColor={l.color} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${id}-cut-${l.id}`} gradientUnits="userSpaceOnUse" cx={l.x} cy={l.y} r={l.radius}>
        <stop offset="0" stopColor="black" stopOpacity={Math.min(1, l.intensity)} /><stop offset=".15" stopColor="black" stopOpacity={Math.min(1, l.intensity * .96)} /><stop offset=".45" stopColor="black" stopOpacity={Math.min(1, l.intensity * .65)} /><stop offset=".75" stopColor="black" stopOpacity={Math.min(.8, l.intensity * .2)} /><stop offset="1" stopColor="black" stopOpacity="0" />
      </radialGradient>
      {l.polygon && <clipPath id={`${id}-walls-${l.id}`}><polygon points={pathPoints(l.polygon)} /></clipPath>}
      {l.kind === "flashlight" && <><filter id={`${id}-cone-blur-${l.id}`} filterUnits="userSpaceOnUse" x={l.x - l.radius * 1.25} y={l.y - l.radius * 1.25} width={l.radius * 2.5} height={l.radius * 2.5}><feGaussianBlur stdDeviation={Math.max(2, l.radius * .045)} /></filter><mask key={flashlightMaskId(id, l)} id={flashlightMaskId(id, l)} maskUnits="userSpaceOnUse" x={l.x - l.radius * 1.25} y={l.y - l.radius * 1.25} width={l.radius * 2.5} height={l.radius * 2.5} style={{ maskType: "luminance" }}><polygon points={cone(l)} fill="white" filter={`url(#${id}-cone-blur-${l.id})`} /></mask></>}
    </g>)}
    {scene.ambient !== "day" && <mask data-vtt-viewport-bounds="" id={`${id}-darkness`} maskUnits="userSpaceOnUse" {...bounds} style={{ maskType: "luminance" }}>
      <rect data-vtt-viewport-bounds="" {...bounds} fill="white" />
      {lights.map(l => <g key={l.id} clipPath={l.polygon ? `url(#${id}-walls-${l.id})` : undefined}><g mask={l.kind === "flashlight" ? `url(#${flashlightMaskId(id, l)})` : undefined}><circle cx={l.x} cy={l.y} r={l.radius} fill={`url(#${id}-cut-${l.id})`} /></g></g>)}
    </mask>}
    {mistVisible && <><radialGradient id={`${id}-vision`}><stop offset="0" stopColor="black" /><stop offset=".35" stopColor="black" stopOpacity=".98" /><stop offset=".7" stopColor="black" stopOpacity=".45" /><stop offset="1" stopColor="black" stopOpacity="0" /></radialGradient>
    <mask data-vtt-viewport-bounds="" id={`${id}-mist`} maskUnits="userSpaceOnUse" {...bounds} style={{ maskType: "luminance" }}>
      <rect data-vtt-viewport-bounds="" {...bounds} fill="white" />
      {visionTokens(tokens).map(t => <circle key={t.id} cx={t.x} cy={t.y} r={scene.visionRadius} fill={`url(#${id}-vision)`} />)}
    </mask></>}
  </>;
}
export function LightingLayer({ id, lights, scene, bounds, phase = "all" }: { id: string; lights: RenderLight[]; scene: Scene; bounds: WorldBounds; phase?: "all" | "glow" | "environment" }) {
  return <g pointerEvents="none">
    {phase !== "glow" && scene.ambient !== "day" && <rect data-vtt-viewport-bounds="" data-environment="darkness" {...bounds} fill="#060d18" opacity={scene.ambient === "night" ? .93 : .63} mask={`url(#${id}-darkness)`} />}
    {phase !== "environment" && lights.map(l => <g key={l.id} clipPath={l.polygon ? `url(#${id}-walls-${l.id})` : undefined}><g mask={l.kind === "flashlight" ? `url(#${flashlightMaskId(id, l)})` : undefined} className={`vtt-flame-${l.kind}`}><circle data-light-glow={l.id} cx={l.x} cy={l.y} r={l.radius} fill={`url(#${id}-glow-${l.id})`} style={{ mixBlendMode: "screen" }} /></g></g>)}
    {phase !== "glow" && scene.layers.effects && scene.weather === "mist" && scene.weatherIntensity > 0 && <g data-environment="mist" mask={`url(#${id}-mist)`} opacity={scene.weatherIntensity}><rect data-vtt-viewport-bounds="" {...bounds} fill="#a9b8b2" opacity=".94" /><rect data-vtt-viewport-bounds="" {...bounds} fill="#364943" opacity=".3" className="vtt-mist-breathe" /></g>}
  </g>;
}

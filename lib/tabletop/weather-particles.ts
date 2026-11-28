import type { WorldBounds } from "./viewport";

export type WeatherParticle = { id: string; x: number; y: number; depth: number; delay: number };
const random = (x: number, y: number, salt: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
};

/** Distribute a bounded number of particles across the entire visible area. */
export function weatherParticles(bounds: WorldBounds, cell: number, intensity: number): WeatherParticle[] {
  const limit = 60 + Math.round(Math.max(0, Math.min(1, intensity)) * 120);
  const minX = Math.floor(bounds.x / cell), maxX = Math.ceil((bounds.x + bounds.width) / cell);
  const minY = Math.floor(bounds.y / cell), maxY = Math.ceil((bounds.y + bounds.height) / cell);
  const columns = maxX - minX + 1, rows = maxY - minY + 1, perCell = 3;
  let step = 1;
  while (Math.ceil(columns / step) * Math.ceil(rows / step) * perCell > limit) step++;
  const list: WeatherParticle[] = [];
  for (let y = minY; y <= maxY; y += step) for (let x = minX; x <= maxX; x += step) for (let k = 0; k < perCell; k++) {
    const spanX = Math.min(step, maxX - x + 1), spanY = Math.min(step, maxY - y + 1);
    list.push({ id: `${x}:${y}:${k}`, x: (x + random(x, y, k) * spanX) * cell, y: (y + random(y, x, k + 9) * spanY) * cell, depth: random(x, y, k + 33), delay: -random(x, y, k + 81) * 12 });
  }
  return list;
}

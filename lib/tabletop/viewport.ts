import type { Point } from "./model";

export type Viewport = Point & { zoom: number };
export type ViewportSize = { width: number; height: number };
export type WorldBounds = Point & ViewportSize;

/** Visible world area, with two screen pixels of overscan to avoid seams. */
export function viewportBounds(view: Viewport, size: ViewportSize): WorldBounds {
  const padding = 2 / view.zoom;
  return { x: -view.x / view.zoom - padding, y: -view.y / view.zoom - padding, width: size.width / view.zoom + padding * 2, height: size.height / view.zoom + padding * 2 };
}

/** Keep masks and their background rectangles in sync with the fast SVG transform. */
export function updateViewportBounds(root: Pick<SVGSVGElement, "querySelectorAll">, bounds: WorldBounds) {
  const values = { x: String(bounds.x), y: String(bounds.y), width: String(bounds.width), height: String(bounds.height) };
  for (const element of root.querySelectorAll("[data-vtt-viewport-bounds]")) {
    for (const [name, value] of Object.entries(values)) element.setAttribute(name, value);
  }
}

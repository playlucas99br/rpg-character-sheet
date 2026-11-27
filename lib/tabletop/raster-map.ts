import type { Frame } from "./model";
import type { Viewport, ViewportSize } from "./viewport";

/** Animated images keep the normal SVG renderer. Unknown or malformed formats also fall back. */
export async function isStaticRaster(blob: Blob): Promise<boolean> {
  if (blob.type === "image/jpeg") return true;
  if (blob.type !== "image/png" && blob.type !== "image/webp") return false;
  const bytes = new Uint8Array(await blob.slice(0, 1024 * 1024).arrayBuffer());
  if (blob.type === "image/webp") {
    if (bytes.length < 20 || String.fromCharCode(...bytes.subarray(0, 4)) !== "RIFF" || String.fromCharCode(...bytes.subarray(8, 12)) !== "WEBP") return false;
    const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const type = String.fromCharCode(...bytes.subarray(offset, offset + 4));
      const length = data.getUint32(offset + 4, true);
      if (type === "ANIM" || type === "ANMF") return false;
      if (type === "VP8X") {
        if (length < 10 || offset + 18 > bytes.length) return false;
        if ((bytes[offset + 8] & 2) !== 0) return false;
      }
      if (type === "VP8 " || type === "VP8L") return true;
      const end = offset + 8 + length + (length % 2);
      if (end > bytes.length) return false;
      offset = end;
    }
    return false;
  }
  if (bytes.length < 8 || ![137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = view.getUint32(offset), end = offset + 12 + length;
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (type === "acTL") return false;
    if (type === "IDAT") return true;
    if (end > bytes.length) return false;
    offset = end;
  }
  return false;
}

/** Render the original map into a viewport-sized surface, independently of token updates. */
export function paintRasterMap(canvas: HTMLCanvasElement, image: CanvasImageSource, size: ViewportSize, view: Viewport, frame: Frame, scene: ViewportSize, pixelRatio: number) {
  const width = Math.max(1, Math.round(size.width * pixelRatio));
  const height = Math.max(1, Math.round(size.height * pixelRatio));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return false;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  context.setTransform(pixelRatio * view.zoom, 0, 0, pixelRatio * view.zoom, pixelRatio * view.x, pixelRatio * view.y);
  context.fillStyle = "#111b17";
  context.fillRect(-5, -5, scene.width + 10, scene.height + 10);
  context.translate(frame.x, frame.y);
  context.rotate(frame.rotation * Math.PI / 180);
  context.drawImage(image, -frame.width / 2, -frame.height / 2, frame.width, frame.height);
  return true;
}

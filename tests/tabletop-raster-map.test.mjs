import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isStaticRaster, paintRasterMap } from "../lib/tabletop/raster-map.ts";

const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const chunk = name => Uint8Array.from([0, 0, 0, 0, ...[...name].map(c => c.charCodeAt(0)), 0, 0, 0, 0]);
const webp = (...data) => new Blob([Uint8Array.from([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP"), ...data])], { type: "image/webp" });
test("only static supported formats use the large-map renderer", async () => {
  assert.equal(await isStaticRaster(new Blob([signature, chunk("IHDR"), chunk("IDAT")], { type: "image/png" })), true);
  assert.equal(await isStaticRaster(new Blob([signature, chunk("IHDR"), chunk("acTL"), chunk("IDAT")], { type: "image/png" })), false);
  assert.equal(await isStaticRaster(new Blob([signature], { type: "image/png" })), false);
  assert.equal(await isStaticRaster(new Blob(["x"], { type: "image/jpeg" })), true);
  assert.equal(await isStaticRaster(new Blob(["x"], { type: "image/gif" })), false);
  assert.equal(await isStaticRaster(new Blob(["x"], { type: "image/webp" })), false);
  assert.equal(await isStaticRaster(webp(...Buffer.from("VP8 "), 0, 0, 0, 0)), true);
  assert.equal(await isStaticRaster(webp(...Buffer.from("VP8X"), 10, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0)), false);
});

test("draws the original image onto a display-sized canvas with camera and map transforms", () => {
  const calls = [];
  const context = { setTransform: (...args) => calls.push(["transform", ...args]), clearRect: (...args) => calls.push(["clear", ...args]), fillRect: (...args) => calls.push(["fill", ...args]), translate: (...args) => calls.push(["translate", ...args]), rotate: (...args) => calls.push(["rotate", ...args]), drawImage: (...args) => calls.push(["image", ...args]) };
  const canvas = { width: 0, height: 0, getContext: () => context }, image = {};
  const frame = { x: 500, y: 400, width: 8000, height: 6000, rotation: 90, locked: false };
  assert.equal(paintRasterMap(canvas, image, { width: 1920, height: 1080 }, { x: -10, y: 25, zoom: 3 }, frame, { width: 8000, height: 6000 }, 2), true);
  assert.deepEqual([canvas.width, canvas.height], [3840, 2160]);
  assert.deepEqual(calls[2], ["transform", 6, 0, 0, 6, -20, 50]);
  assert.deepEqual(calls.at(-3), ["translate", 500, 400]);
  assert.deepEqual(calls.at(-2), ["rotate", Math.PI / 2]);
  assert.deepEqual(calls.at(-1), ["image", image, -4000, -3000, 8000, 6000]);
  assert.equal(paintRasterMap({ width: 0, height: 0, getContext: () => null }, image, { width: 1, height: 1 }, { x: 0, y: 0, zoom: 1 }, frame, { width: 1, height: 1 }, 1), false);
});

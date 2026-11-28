import { strict as assert } from "node:assert";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Stage from "../components/tabletop/stage.tsx";
import { newScene, newToken } from "../lib/tabletop/model.ts";
import { weatherParticles } from "../lib/tabletop/weather-particles.ts";

test("weather particle count remains bounded and covers 1080p and 4K viewports", () => {
  for (const width of [1920, 3840]) {
    const height = width * 9 / 16, bounds = { x: 0, y: 0, width, height };
    for (const intensity of [.2, 1, 2]) {
      const particles = weatherParticles(bounds, 110, intensity);
      assert.ok(particles.length > 0 && particles.length <= 180);
      assert.ok(particles.some(p => p.x < width * .25));
      assert.ok(particles.some(p => p.x > width * .75));
      assert.ok(particles.some(p => p.y < height * .25));
      assert.ok(particles.some(p => p.y > height * .75));
      assert.deepEqual(particles, weatherParticles(bounds, 110, intensity));
    }
  }
});

test("rendering tokens and cutscene markers does not generate React title warnings", () => {
  const scene = newScene("Cena"), noop = () => {};
  scene.tokens = [newToken("Agente", { x: 50, y: 50 })];
  scene.cutscenes = [{ id: "cutscene:1", title: "Introdução", x: 50, y: 50, size: 48, rotation: 0, loop: false, locked: false }];
  const messages = [], original = console.error;
  console.error = (...args) => messages.push(args.join(" "));
  try {
    renderToStaticMarkup(React.createElement(Stage, { scene, selected: null, tool: "select", lightKind: "torch", brush: 96, color: "#fff", playerView: false, assets: {}, onSelect: noop, onCommit: noop, onZoom: noop, onDropItem: noop, onDropFiles: noop, onTokenMenu: noop, onCutscene: noop }));
  } finally { console.error = original; }
  assert.deepEqual(messages, []);
});

test("manual fog is limited to the viewport and clipped to the scene", () => {
  const scene = newScene("Mapa grande"), noop = () => {};
  scene.width = 50000; scene.height = 50000; scene.fog = true;
  scene.fogStrokes = [{ mode: "reveal", radius: 50, points: [{ x: 40, y: 60 }] }];
  const markup = renderToStaticMarkup(React.createElement(Stage, { scene, selected: null, tool: "select", lightKind: "torch", brush: 96, color: "#fff", playerView: true, assets: {}, onSelect: noop, onCommit: noop, onZoom: noop, onDropItem: noop, onDropFiles: noop, onTokenMenu: noop, onCutscene: noop }));
  assert.match(markup, /<clipPath id="fog-[^"]+-scene"><rect width="50000" height="50000"/);
  assert.match(markup, /<mask data-vtt-viewport-bounds="" id="fog-[^"]+" maskUnits="userSpaceOnUse" x="[^"]+" y="[^"]+" width="2008" height="1368"/);
  assert.match(markup, /<circle cx="40" cy="60" r="50" fill="black"/);
  assert.match(markup, /clip-path="url\(#fog-[^"]+-scene\)"/);
});

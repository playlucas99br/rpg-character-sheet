import { strict as assert } from "node:assert";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createPreviewScheduler } from "../lib/tabletop/preview-scheduler.ts";
import { newLight, newScene } from "../lib/tabletop/model.ts";
import { LightingDefs, LightingLayer, sceneLights } from "../components/tabletop/lighting.tsx";

test("TV receives the newest preview at a limited rate and clears immediately on release", () => {
  let time = 0, task, cancelled = 0;
  const sent = [];
  const scheduler = createPreviewScheduler(value => sent.push(value), 40, () => time,
    (callback, delay) => { task = { callback, delay }; return 1; },
    () => { cancelled++; task = null; });
  scheduler.push("start");
  time = 10; scheduler.push("older");
  time = 20; scheduler.push("newest");
  assert.deepEqual(sent, ["start"]);
  assert.equal(task.delay, 30);
  time = 40; task.callback();
  assert.deepEqual(sent, ["start", "newest"]);
  time = 45; scheduler.push("pending");
  scheduler.clear();
  assert.equal(cancelled, 1);
  assert.deepEqual(sent, ["start", "newest", null]);
  time = 46; scheduler.push("next gesture");
  assert.equal(sent.at(-1), "next gesture");
});

test("lights skip wall geometry only when nothing can block them", () => {
  const scene = newScene("Cena"), light = newLight("torch", { x: 0, y: 0 });
  scene.lights = [light];
  scene.walls = [];
  assert.equal(sceneLights(scene, [], true)[0].polygon, null);
  scene.walls = [{ id: "door", a: { x: 40, y: -80 }, b: { x: 40, y: 80 }, door: true, open: true, locked: false }];
  assert.equal(sceneLights(scene, [], true)[0].polygon, null);
  scene.walls = [{ ...scene.walls[0], open: false }];
  assert.ok(sceneLights(scene, [], true)[0].polygon.length >= 96);
});

test("only active darkness and mist create full-screen masks; light glow keeps flickering", () => {
  const scene = newScene("Cena");
  scene.lights = [newLight("torch", { x: 100, y: 100 })];
  const bounds = { x: 0, y: 0, width: 500, height: 500 };
  const render = () => {
    const lights = sceneLights(scene, [], true);
    return {
      defs: renderToStaticMarkup(React.createElement(LightingDefs, { id: "test", scene, tokens: [], lights, bounds })),
      glow: renderToStaticMarkup(React.createElement(LightingLayer, { id: "test", scene, lights, bounds, phase: "glow" })),
    };
  };
  let result = render();
  assert.doesNotMatch(result.defs, /test-darkness|test-mist/);
  assert.match(result.glow, /vtt-flame-torch/);
  scene.ambient = "night"; scene.weather = "mist"; scene.weatherIntensity = 0.5; scene.layers.effects = true;
  result = render();
  assert.match(result.defs, /test-darkness/);
  assert.match(result.defs, /test-mist/);
  assert.doesNotMatch(result.defs, /vtt-flame-torch/);
});

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createFrameScheduler } from "../lib/tabletop/frame-scheduler.ts";

test("coalesces pointer updates and uses the most recent position", () => {
  let frame, requested = 0, position = 0;
  const rendered = [];
  const scheduler = createFrameScheduler(() => rendered.push(position), callback => { frame = callback; return ++requested; }, () => {});
  position = 10; scheduler.schedule();
  position = 20; scheduler.schedule();
  position = 30; scheduler.schedule();
  assert.equal(requested, 1);
  frame(0);
  assert.deepEqual(rendered, [30]);
  scheduler.schedule();
  assert.equal(requested, 2);
});

test("cancels a pending update when a gesture finishes", () => {
  let cancelled, updated = false;
  const scheduler = createFrameScheduler(() => { updated = true; }, () => 42, handle => { cancelled = handle; });
  scheduler.schedule();
  scheduler.cancel();
  assert.equal(cancelled, 42);
  assert.equal(updated, false);
  scheduler.cancel();
});

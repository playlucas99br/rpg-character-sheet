/** Coalesces rapid interaction events into one update per animation frame. */
export function createFrameScheduler(
  update: () => void,
  request: (callback: FrameRequestCallback) => number = callback => requestAnimationFrame(callback),
  cancel: (handle: number) => void = handle => cancelAnimationFrame(handle),
) {
  let pending: number | null = null;
  return {
    schedule() {
      if (pending !== null) return;
      pending = request(() => { pending = null; update(); });
    },
    cancel() {
      if (pending !== null) cancel(pending);
      pending = null;
    },
  };
}

/** Limit expensive secondary-display previews while retaining the newest scene. */
export function createPreviewScheduler<T>(
  deliver: (value: T | null) => void,
  interval: number,
  now: () => number = () => performance.now(),
  schedule: (callback: () => void, delay: number) => ReturnType<typeof setTimeout> = (callback, delay) => setTimeout(callback, delay),
  cancel: (handle: ReturnType<typeof setTimeout>) => void = handle => clearTimeout(handle),
) {
  let last = -Infinity;
  let pending: T | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    timer = null;
    if (pending === null) return;
    const value = pending;
    pending = null;
    last = now();
    deliver(value);
  };
  const cancelPending = () => {
    if (timer !== null) cancel(timer);
    timer = null;
    pending = null;
    last = -Infinity;
  };
  return {
    push(value: T) {
      pending = value;
      const remaining = interval - (now() - last);
      if (remaining <= 0 && timer === null) flush();
      else if (timer === null) timer = schedule(flush, Math.max(0, remaining));
    },
    clear() { cancelPending(); deliver(null); },
    dispose: cancelPending,
  };
}

"use client";
import { useEffect, useRef, type ButtonHTMLAttributes } from "react";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { scrollActive: boolean; onStep: (direction: number) => void };
export default function WheelButton({ scrollActive, onStep, onKeyDown, ...props }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const lastStep = useRef(0), callback = useRef(onStep), pending = useRef(0), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { callback.current = onStep; }, [onStep]);
  useEffect(() => {
    const element = ref.current; if (!element || !scrollActive || props.disabled) return;
    const flush = () => { timer.current = undefined; const step = Math.sign(pending.current); pending.current = 0; if (step) { lastStep.current = performance.now(); callback.current(step); } };
    const wheel = (event: WheelEvent) => {
      if (!event.deltaY || event.ctrlKey) return; event.preventDefault(); event.stopPropagation();
      pending.current = -Math.sign(event.deltaY);
      if (performance.now() - lastStep.current >= 75) { clearTimeout(timer.current); flush(); }
      else if (!timer.current) timer.current = setTimeout(flush, 75);
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => { element.removeEventListener("wheel", wheel); clearTimeout(timer.current); timer.current = undefined; pending.current = 0; };
  }, [scrollActive, props.disabled]);
  return <button {...props} ref={ref} onKeyDown={event => { onKeyDown?.(event); if (!event.defaultPrevented && scrollActive && !props.disabled && ["ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); event.stopPropagation(); onStep(event.key === "ArrowUp" ? 1 : -1); } }} />;
}

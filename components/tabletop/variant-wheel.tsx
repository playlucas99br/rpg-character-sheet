"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { PersonStanding, Skull, Swords } from "lucide-react";
import type { Point, Scene } from "../../lib/tabletop/model";

type Wheel = { id: string; anchor: Point; points: Point[]; selected: number; names: string[]; images: (string | undefined)[] };
export default function VariantWheel({ host, scene, playerView, assets, onCommit }: { host: RefObject<HTMLDivElement | null>; scene: Scene; playerView: boolean; assets: Record<string, string>; onCommit: (update: (scene: Scene) => Scene) => void }) {
  const hover = useRef<{ id: string; point: Point } | null>(null), wheelRef = useRef<Wheel | null>(null);
  const [wheel, setWheel] = useState<Wheel | null>(null);
  useEffect(() => {
    let pointerArmed = false;
    const show = (value: Wheel | null) => { wheelRef.current = value; setWheel(value); };
    const move = (event: PointerEvent) => {
      const node = host.current; if (!node) return;
      const rect = node.getBoundingClientRect(), point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const active = wheelRef.current;
      if (active) { let selected = -1, nearest = 42; active.points.forEach((p, i) => { const d = Math.hypot(point.x - p.x, point.y - p.y); if (d < nearest) { nearest = d; selected = i; } }); if (selected !== active.selected) show({ ...active, selected }); return; }
      const target = event.target instanceof Element ? event.target.closest("[data-token]") : null;
      const id = target && node.contains(target) ? target.getAttribute("data-token") : null;
      hover.current = id ? { id, point } : null;
    };
    const finish = (apply: boolean) => { const active = wheelRef.current; if (apply && active && active.selected >= 0) onCommit(s => ({ ...s, tokens: s.tokens.map(t => t.id === active.id && active.selected < t.variants.length ? { ...t, variant: active.selected } : t) })); show(null); };
    const down = (event: KeyboardEvent) => {
      if (event.key === "Escape" && wheelRef.current) { event.preventDefault(); event.stopImmediatePropagation(); finish(false); return; }
      if (event.key.toLowerCase() !== "t" || event.repeat || event.ctrlKey || event.metaKey || event.altKey || playerView || !hover.current || (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable=true], .vtt-floating-window, .vtt-token-menu"))) return;
      const token = scene.tokens.find(t => t.id === hover.current?.id); const node = host.current;
      if (!token?.variants.length || !node) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const radius = Math.min(180, Math.max(92, token.variants.length * 22)), rect = node.getBoundingClientRect();
      const anchor = { x: Math.max(radius + 40, Math.min(rect.width - radius - 40, hover.current.point.x)), y: Math.max(radius + 45, Math.min(rect.height - 45, hover.current.point.y)) };
      const points = token.variants.map((_, i) => { const angle = token.variants.length === 1 ? -Math.PI / 2 : -Math.PI + Math.PI * i / (token.variants.length - 1); return { x: anchor.x + Math.cos(angle) * radius, y: anchor.y + Math.sin(angle) * radius }; });
      show({ id: token.id, anchor, points, selected: -1, names: token.variants.map((v, i) => v.name || `Variação ${i + 1}`), images: token.variants.map(v => assets[v.asset]) });
    };
    const up = (event: KeyboardEvent) => { if (event.key.toLowerCase() === "t" && wheelRef.current) { event.preventDefault(); event.stopImmediatePropagation(); finish(true); } };
    const pointerDown = (event: PointerEvent) => { if (wheelRef.current && event.button === 0) { pointerArmed = true; event.preventDefault(); event.stopImmediatePropagation(); } };
    const pointerUp = (event: PointerEvent) => { if (wheelRef.current && event.button === 0 && pointerArmed) { pointerArmed = false; event.preventDefault(); event.stopImmediatePropagation(); finish(true); } };
    const blur = () => finish(false);
    window.addEventListener("pointermove", move, true); window.addEventListener("pointerdown", pointerDown, true); window.addEventListener("pointerup", pointerUp, true); window.addEventListener("keydown", down, true); window.addEventListener("keyup", up, true); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("pointermove", move, true); window.removeEventListener("pointerdown", pointerDown, true); window.removeEventListener("pointerup", pointerUp, true); window.removeEventListener("keydown", down, true); window.removeEventListener("keyup", up, true); window.removeEventListener("blur", blur); };
  }, [host, scene.tokens, playerView, assets, onCommit]);
  if (!wheel) return null;
  return <div className="vtt-variant-wheel" aria-label="Variações do token"><div className="vtt-variant-wheel-hint" style={{ left: wheel.anchor.x, top: wheel.anchor.y }}>Mova o cursor e solte T</div>{wheel.points.map((point, i) => { const Icon = i === 0 ? PersonStanding : i === 2 ? Skull : Swords; return <div key={i} className={`vtt-variant-wheel-option ${wheel.selected === i ? "is-active" : ""}`} style={{ left: point.x, top: point.y }}><span>{wheel.images[i] ? <img src={wheel.images[i]} alt="" /> : <Icon size={23} />}</span><i aria-hidden="true"><Icon size={13} /></i><small>{wheel.names[i]}</small></div>; })}</div>;
}

"use client";
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { applyFrame, editWall, distance, DRAG_MIME, entityFrame, mapFrame, newLight, pathPoints, resizeFrame, rotatedAngle, snapPoint, type BoardDrag, type Frame, type LightKind, type Point, type Scene } from "../../lib/tabletop/model";
import { LightingDefs, LightingLayer, sceneLights } from "./lighting";
import BoardEffects from "./board-effects";
import WeatherLayer from "./weather-layer";
import VariantWheel from "./variant-wheel";
import { updateViewportBounds, viewportBounds } from "../../lib/tabletop/viewport";
import { createFrameScheduler } from "../../lib/tabletop/frame-scheduler";
import { isStaticRaster, paintRasterMap } from "../../lib/tabletop/raster-map";
import type { Viewport } from "../../lib/tabletop/viewport";

export type Tool = "select" | "pan" | "measure" | "draw" | "reveal" | "hide" | "wall" | "door" | "light" | "note" | "cutscene";
export type StageHandle = { fit: () => void; zoom: (factor: number) => void };
type Gesture = { type: Tool | "entity" | "wall-edit"; start: Point; last: Point; points: Point[]; entityId?: string; wallMode?: "move" | "a" | "b"; frame?: Frame; nextFrame?: Frame; mode?: "move" | "resize" | "rotate"; view?: Point; moved?: boolean };
type Props = { scene: Scene; selected: string | null; tool: Tool; lightKind: LightKind; brush: number; color: string; playerView: boolean; assets: Record<string, string>; onSelect: (id: string | null) => void; onCommit: (update: (scene: Scene) => Scene) => void; onZoom: (zoom: number) => void; onDropItem: (data: BoardDrag, point: Point) => void; onDropFiles: (files: File[], point: Point) => void; onTokenMenu: (id: string, point: Point) => void; onCutscene: (id: string) => void; onPreview?: (scene: Scene | null) => void };

function ManorMap({ width, height }: { width: number; height: number }) {
  return <g>
    <rect width={width} height={height} fill="#252f2c" />
    {Array.from({ length: 65 }, (_, i) => {
      const x = ((i * 397 + 41) % 1792) / 1792 * width, y = ((i * 263 + 83) % 1152) / 1152 * height;
      return <g key={i} opacity={0.25 + (i % 3) * 0.08}><circle cx={x} cy={y} r={28 + i % 30} fill="#3b5143" /><circle cx={x - 9} cy={y - 8} r={18 + i % 20} fill="#465e4b" /></g>;
    })}
    <path d="M 768 1152 L 736 832 L 768 704 L 1024 704 L 1056 832 L 1024 1152" fill="#727263" opacity=".4" />
    <rect x="364" y="224" width="1076" height="624" rx="12" fill="#111917" opacity=".6" transform="translate(12,18)" />
    <rect x="352" y="208" width="1088" height="640" rx="8" fill="#646458" stroke="#8b8a76" strokeWidth="10" />
    <rect x="376" y="232" width="1040" height="592" fill="#3d423b" />
    {Array.from({ length: 16 * 9 }, (_, i) => <rect key={i} x={384 + i % 16 * 64} y={240 + Math.floor(i / 16) * 64} width="61" height="61" rx="2" fill={["#484d43", "#454940", "#4e5046", "#42483e"][i % 4]} />)}
    <path d="M640 232V592H376 M1152 232V592H1416 M640 592H800 M992 592H1152 M640 704V824 M1152 704V824" fill="none" stroke="#777967" strokeWidth="16" />
    <rect x="752" y="304" width="288" height="224" rx="4" fill="#334e47" stroke="#7c8971" strokeWidth="6" />
    <rect x="772" y="324" width="248" height="184" fill="none" stroke="#818b69" strokeWidth="2" opacity=".5" />
    <circle cx="896" cy="416" r="60" fill="none" stroke="#a2a17c" strokeWidth="2" opacity=".6" />
    <path d="M896 360L945 448H847Z" stroke="#a2a17c" fill="none" opacity=".6" />
    {[448, 1248].map(x => <g key={x}><rect x={x} y="300" width="96" height="180" rx="6" fill="#2a302b" stroke="#7b7664" strokeWidth="4" /><rect x={x + 10} y="312" width="76" height="40" fill="#888573" opacity=".5" /></g>)}
    {[432, 1328].map(x => <g key={x}><rect x={x} y="670" width="48" height="92" fill="#756d55" stroke="#a59b7d" strokeWidth="3" /><path d={`M${x + 4} 680h40m-40 12h40m-40 12h40`} stroke="#383d32" strokeWidth="5" /></g>)}
    <path d="M800 848H992" stroke="#a59b7d" strokeWidth="10" />
    <text x="896" y="999" textAnchor="middle" fill="#b7bc9f" opacity=".4" fontSize="18" letterSpacing="8">O REFÚGIO ESQUECIDO</text>
  </g>;
}

const Stage = forwardRef<StageHandle, Props>(function Stage({ scene, selected, tool, lightKind, brush, color, playerView, assets, onSelect, onCommit, onZoom, onDropItem, onDropFiles, onTokenMenu, onCutscene, onPreview }, ref) {
  const host = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null), worldLayer = useRef<SVGGElement>(null), mapCanvas = useRef<HTMLCanvasElement>(null);
  const paintMap = useRef<(view: Viewport) => void>(() => {});
  const [rasterMap, setRasterMap] = useState<{ src: string; image: HTMLImageElement } | null>(null);
  const navigationFrame = useRef(0), navigationTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [size, setSize] = useState({ width: 1000, height: 680 });
  const sizeRef = useRef(size);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 0.5 });
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);
  const gesture = useRef<Gesture | null>(null);
  const [draft, setDraft] = useState<Gesture | null>(null);
  const draftScheduler = useMemo(() => createFrameScheduler(() => {
      const current = gesture.current;
      if (current) setDraft({ ...current, points: [...current.points] });
  }), []);
  useEffect(() => () => draftScheduler.cancel(), [draftScheduler]);
  const [hoverNote, setHoverNote] = useState<{ id: string; x: number; y: number } | null>(null);
  const touches = useRef(new Map<number, Point>()), pinch = useRef<{ distance: number; zoom: number; anchor: Point } | null>(null);
  const rawId = useId().replaceAll(":", ""), fogId = `fog-${rawId}`, gridId = `grid-${rawId}`;
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const owner = node.ownerDocument.defaultView;
    const measure = () => { const { width, height } = node.getBoundingClientRect(); if (width > 0 && height > 0) { sizeRef.current = { width, height }; setSize(previous => previous.width === width && previous.height === height ? previous : { width, height }); } };
    const Observer = owner?.ResizeObserver ?? ResizeObserver;
    const observer = new Observer(measure);
    observer.observe(node); owner?.addEventListener("resize", measure); node.ownerDocument.addEventListener("fullscreenchange", measure); measure();
    return () => { observer.disconnect(); owner?.removeEventListener("resize", measure); node.ownerDocument.removeEventListener("fullscreenchange", measure); };
  }, []);
  const fit = useCallback(() => {
    const zoom = Math.max(.03, Math.min((size.width - 80) / scene.width, (size.height - 80) / scene.height, 1));
    setView({ x: (size.width - scene.width * zoom) / 2, y: (size.height - scene.height * zoom) / 2, zoom });
  }, [size.width, size.height, scene.width, scene.height]);
  useEffect(() => { const frame = requestAnimationFrame(fit); return () => cancelAnimationFrame(frame); }, [scene.id, fit]);
  useEffect(() => { onZoom(view.zoom); }, [view.zoom, onZoom]);
  const zoomAt = useCallback((factor: number, p: Point) => {
    const v = viewRef.current, zoom = Math.max(.03, Math.min(6, v.zoom * factor));
    viewRef.current = { zoom, x: p.x - (p.x - v.x) * zoom / v.zoom, y: p.y - (p.y - v.y) * zoom / v.zoom };
    // Update the transform and viewport-sized masks together, at most once per
    // frame. Defer the expensive React/particle reconciliation until idle.
    host.current?.classList.add("vtt-navigating");
    if (!navigationFrame.current) navigationFrame.current = requestAnimationFrame(() => {
      navigationFrame.current = 0; const next = viewRef.current;
      if (svg.current) updateViewportBounds(svg.current, viewportBounds(next, sizeRef.current));
      worldLayer.current?.setAttribute("transform", `translate(${next.x} ${next.y}) scale(${next.zoom})`);
      paintMap.current(next);
    });
    clearTimeout(navigationTimer.current);
    navigationTimer.current = setTimeout(() => { setView({ ...viewRef.current }); host.current?.classList.remove("vtt-navigating"); }, 120);
  }, []);
  useEffect(() => () => { cancelAnimationFrame(navigationFrame.current); clearTimeout(navigationTimer.current); }, []);
  useImperativeHandle(ref, () => ({ fit, zoom: factor => zoomAt(factor, { x: size.width / 2, y: size.height / 2 }) }), [fit, zoomAt, size]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * .0015), { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [zoomAt]);
  const local = (e: ReactPointerEvent) => { const r = svg.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const world = (p: Point) => ({ x: (p.x - viewRef.current.x) / viewRef.current.zoom, y: (p.y - viewRef.current.y) / viewRef.current.zoom });
  function down(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0 && e.button !== 1) return;
    e.currentTarget.focus(); e.preventDefault();
    // Keep the original target for click/double-click while still receiving drag events.
    const capture = (e.target as Element).closest("[data-cutscene]") ?? e.currentTarget;
    capture.setPointerCapture(e.pointerId);
    const p = local(e), w = world(p);
    touches.current.set(e.pointerId, p);
    if (touches.current.size === 2) {
      const [a, b] = [...touches.current.values()];
      pinch.current = { distance: distance(a, b), zoom: view.zoom, anchor: world({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }) };
      gesture.current = null; draftScheduler.cancel(); setDraft(null); return;
    }
    const target = e.target as Element;
    if (tool === "pan" || e.button === 1 || playerView) {
      gesture.current = { type: "pan", start: p, last: p, points: [], view: { x: view.x, y: view.y } }; return;
    }
    const handle = target.closest("[data-transform]");
    const wallNode = target.closest("[data-wall]"), wallId = wallNode?.getAttribute("data-wall"), wall = scene.walls.find(w => w.id === wallId);
    if (tool === "select" && wall) { onSelect(`wall:${wall.id}`); if (!wall.locked) gesture.current = { type: "wall-edit", entityId: wall.id, wallMode: wallNode?.getAttribute("data-wall-point") as "a" | "b" || "move", start: w, last: w, points: [] }; return; }
    const entityId = handle?.getAttribute("data-entity") || target.closest("[data-token]")?.getAttribute("data-token") || target.closest("[data-cutscene]")?.getAttribute("data-cutscene") || target.closest("[data-note]")?.getAttribute("data-note") || target.closest("[data-effect]")?.getAttribute("data-effect") || target.closest("[data-drawing]")?.getAttribute("data-drawing") || target.closest("[data-item]")?.getAttribute("data-item") || target.closest("[data-light]")?.getAttribute("data-light") || (target.closest("[data-map]") && (!mapFrame(scene).locked || selected === "__map__") ? "__map__" : null);
    if (tool === "select" && entityId) {
      const frame = entityFrame(scene, entityId);
      onSelect(entityId);
      if (frame && !frame.locked) gesture.current = { type: "entity", start: w, last: w, points: [], entityId, frame, nextFrame: frame, mode: handle?.getAttribute("data-transform") as "resize" | "rotate" || "move" };
      return;
    }
    onSelect(null);
    if (tool === "select") return;
    if (tool === "light") { onCommit(s => ({ ...s, lights: [...s.lights, newLight(lightKind, w)] })); return; }
    if (tool === "note") { const note = { id: `note:${crypto.randomUUID()}`, ...w, size: 34, rotation: 0, title: "Nota de cena", text: "Escreva aqui os detalhes que ajudam a narrar esta cena.", hidden: true, locked: false }; onCommit(s => ({ ...s, notes: [...s.notes, note] })); onSelect(note.id); return; }
    if (tool === "cutscene") { const marker = { id: `cutscene:${crypto.randomUUID()}`, ...w, size: 48, rotation: 0, title: "Cutscene", loop: false, locked: false }; onCommit(s => ({ ...s, cutscenes: [...s.cutscenes, marker] })); onSelect(marker.id); return; }
    const start = (tool === "wall" || tool === "door") && scene.snap ? snapPoint(w, scene.cell) : w;
    gesture.current = { type: tool, start, last: start, points: [start] };
    setDraft({ ...gesture.current });
  }
  function move(e: ReactPointerEvent<SVGSVGElement>) {
    const p = local(e);
    if (touches.current.has(e.pointerId)) touches.current.set(e.pointerId, p);
    if (pinch.current && touches.current.size === 2) {
      const [a, b] = [...touches.current.values()], z = Math.max(.03, Math.min(6, pinch.current.zoom * distance(a, b) / Math.max(1, pinch.current.distance)));
      setView({ zoom: z, x: (a.x + b.x) / 2 - pinch.current.anchor.x * z, y: (a.y + b.y) / 2 - pinch.current.anchor.y * z }); return;
    }
    const g = gesture.current;
    if (!g) return;
    if (g.type === "pan") { setView(v => ({ ...v, x: g.view!.x + p.x - g.start.x, y: g.view!.y + p.y - g.start.y })); return; }
    const w = world(p);
    if (g.type === "wall-edit") { g.last = scene.snap ? snapPoint(w, scene.cell) : w; g.moved = distance(g.start, w) > 1; draftScheduler.schedule(); return; }
    if (g.type === "entity" && g.frame) {
      g.last = w; g.moved = distance(g.start, w) > 1;
      g.nextFrame = g.mode === "resize" ? resizeFrame(g.frame, w, scene.tokens.some(t => t.id === g.entityId) ? 10000 : 50000) : g.mode === "rotate" ? { ...g.frame, rotation: rotatedAngle(g.frame, w, e.shiftKey) } : { ...g.frame, x: g.frame.x + w.x - g.start.x, y: g.frame.y + w.y - g.start.y };
      draftScheduler.schedule(); return;
    }
    g.last = (g.type === "wall" || g.type === "door") && scene.snap ? snapPoint(w, scene.cell) : w;
    g.moved = distance(g.start, w) > 3;
    if (["draw", "reveal", "hide"].includes(g.type) && distance(g.points.at(-1)!, w) > 4) g.points.push(w);
    draftScheduler.schedule();
  }
  function finish(e: ReactPointerEvent<SVGSVGElement>, cancel = false) {
    touches.current.delete(e.pointerId);
    if (pinch.current) { if (touches.current.size < 2) pinch.current = null; gesture.current = null; return; }
    const g = gesture.current;
    gesture.current = null; draftScheduler.cancel(); setDraft(null);
    if (!g || cancel) return;
    if (g.type === "entity" && g.entityId && g.nextFrame && g.moved) {
      const next = g.mode === "move" && scene.snap ? { ...g.nextFrame, ...snapPoint(g.nextFrame, scene.cell) } : g.nextFrame;
      onCommit(s => applyFrame(s, g.entityId!, next));
    } else if (g.type === "wall-edit" && g.entityId && g.moved) onCommit(s => editWall(s, g.entityId!, g.start, g.last, g.wallMode!));
    else if (g.type === "draw") onCommit(s => ({ ...s, drawings: [...s.drawings, { id: crypto.randomUUID(), color, points: g.points, hidden: false, locked: false }] }));
    else if (g.type === "reveal" || g.type === "hide") onCommit(s => ({ ...s, fog: true, fogStrokes: [...s.fogStrokes, { mode: g.type as "reveal" | "hide", radius: brush, points: g.points }] }));
    else if ((g.type === "wall" || g.type === "door") && distance(g.start, g.last) > 8) onCommit(s => ({ ...s, walls: [...s.walls, { id: crypto.randomUUID(), a: g.start, b: g.last, door: g.type === "door", open: false, locked: false }] }));
  }
  const displayed = useMemo(() => draft?.type === "wall-edit" && draft.entityId ? editWall(scene, draft.entityId, draft.start, draft.last, draft.wallMode!) : draft?.type === "entity" && draft.entityId && draft.nextFrame ? applyFrame(scene, draft.entityId, draft.nextFrame) : scene, [scene, draft]);
  useEffect(() => { onPreview?.(draft && (draft.type === "entity" || draft.type === "wall-edit") ? displayed : null); }, [displayed, draft, onPreview]);
  const illumination = useMemo(() => sceneLights(displayed, displayed.tokens, playerView), [displayed, playerView]);
  const bounds = useMemo(() => viewportBounds(view, size), [view, size]);
  const selectedFrame = selected ? entityFrame(displayed, selected) : undefined;
  const background = mapFrame(displayed);
  const mapSrc = scene.layers.map && scene.map ? assets[scene.map] : undefined;
  const rasterActive = Boolean(mapSrc && rasterMap?.src === mapSrc);
  useEffect(() => {
    setRasterMap(null);
    if (!mapSrc) return;
    let cancelled = false;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(mapSrc, { signal: controller.signal });
        if (!response.ok) return;
        const blob = await response.blob();
        if (!await isStaticRaster(blob) || cancelled) return;
        const image = document.createElement("img");
        image.decoding = "async";
        image.src = mapSrc;
        await image.decode();
        if (!cancelled && image.naturalWidth * image.naturalHeight >= 12000000) setRasterMap({ src: mapSrc, image });
      } catch { /* Keep the original SVG renderer when decoding is unavailable. */ }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [mapSrc]);
  const drawMap = useCallback((next: Viewport) => {
    const canvas = mapCanvas.current;
    if (!canvas || !rasterActive || !rasterMap) return;
    try {
      const dpr = canvas.ownerDocument.defaultView?.devicePixelRatio || 1;
      if (!paintRasterMap(canvas, rasterMap.image, size, next, background, { width: scene.width, height: scene.height }, dpr)) setRasterMap(null);
    } catch { setRasterMap(null); }
  }, [rasterActive, rasterMap, size, background.x, background.y, background.width, background.height, background.rotation, background.locked, scene.width, scene.height]);
  useLayoutEffect(() => { paintMap.current = drawMap; drawMap(view); return () => { paintMap.current = () => {}; }; }, [drawMap, view]);
  const strokePath = (points: Point[]) => `M${points.map(p => `${p.x},${p.y}`).join(" L")}`;
  return <div className={`vtt-stage tool-${playerView ? "pan" : tool}`} ref={host} onDragOver={e => { if (!playerView) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } }} onDrop={e => {
    if (playerView) return;
    e.preventDefault(); const rect = svg.current!.getBoundingClientRect(), point = world({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (raw && raw.length < 2000) { try { onDropItem(JSON.parse(raw), point); } catch { /* Ignore unrelated drag payloads. */ } }
    else if (e.dataTransfer.files.length) onDropFiles(Array.from(e.dataTransfer.files), point);
  }} onPointerMove={e => { const noteId = (e.target as Element).closest("[data-note]")?.getAttribute("data-note"); if (noteId) { const r = e.currentTarget.getBoundingClientRect(); setHoverNote({ id: noteId, x: Math.min(Math.max(8, size.width - 310), e.clientX - r.left + 18), y: Math.max(8, Math.min(size.height - 230, e.clientY - r.top + 14)) }); } else if (!(e.target as Element).closest("[data-note-overlay]")) setHoverNote(null); }} onPointerLeave={() => setHoverNote(null)}>
    <canvas ref={mapCanvas} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", visibility: rasterActive ? "visible" : "hidden" }} />
    <svg ref={svg} style={{ position: "relative" }} width="100%" height="100%" tabIndex={0} role="application" aria-label="Mapa interativo. Use a roda para ampliar, H para mover e V para selecionar." onPointerDown={down} onPointerMove={move} onPointerUp={e => finish(e)} onPointerCancel={e => finish(e, true)} onContextMenu={e => {
      e.preventDefault(); const target = e.target as Element;
      const wall = target.closest("[data-wall]")?.getAttribute("data-wall");
      const id = target.closest("[data-token]")?.getAttribute("data-token") || target.closest("[data-cutscene]")?.getAttribute("data-cutscene") || target.closest("[data-note]")?.getAttribute("data-note") || target.closest("[data-effect]")?.getAttribute("data-effect") || target.closest("[data-item]")?.getAttribute("data-item") || target.closest("[data-light]")?.getAttribute("data-light") || target.closest("[data-drawing]")?.getAttribute("data-drawing") || (wall ? `wall:${wall}` : "__map__");
      if (!playerView || scene.tokens.some(t => t.id === id)) onTokenMenu(id, { x: e.clientX, y: e.clientY });
    }} onDoubleClick={e => { if (playerView) return; const cutscene = (e.target as Element).closest("[data-cutscene]")?.getAttribute("data-cutscene"); if (cutscene) { onCutscene(cutscene); return; } const id = (e.target as Element).closest("[data-wall]")?.getAttribute("data-wall"); if (id) onCommit(s => ({ ...s, walls: s.walls.map(w => w.id === id && w.door && !w.locked ? { ...w, open: !w.open } : w) })); }}>
      <defs>
        <pattern id={gridId} width={scene.cell} height={scene.cell} patternUnits="userSpaceOnUse"><path d={`M${scene.cell} 0H0V${scene.cell}`} fill="none" stroke="#c8d8bf" strokeOpacity=".16" strokeWidth="1" /></pattern>
        {scene.fog && <><clipPath id={`${fogId}-scene`}><rect width={scene.width} height={scene.height} /></clipPath>
        <mask data-vtt-viewport-bounds="" id={fogId} maskUnits="userSpaceOnUse" {...bounds}>
          <rect data-vtt-viewport-bounds="" {...bounds} fill="white" />
          {[...scene.fogStrokes, ...(draft && (draft.type === "reveal" || draft.type === "hide") ? [{ mode: draft.type, radius: brush, points: draft.points }] : [])].map((s, i) => s.points.length === 1 ? <circle key={i} cx={s.points[0].x} cy={s.points[0].y} r={s.radius} fill={s.mode === "reveal" ? "black" : "white"} /> : <path key={i} d={strokePath(s.points)} fill="none" stroke={s.mode === "reveal" ? "black" : "white"} strokeWidth={s.radius * 2} strokeLinecap="round" strokeLinejoin="round" />)}
        </mask></>}
        <LightingDefs id={rawId} lights={illumination} scene={displayed} tokens={displayed.tokens} bounds={bounds} />
      </defs>
      <g ref={worldLayer} transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
        <rect x="-5" y="-5" width={scene.width + 10} height={scene.height + 10} rx="8" fill={rasterActive ? "none" : "#111b17"} stroke="#607264" strokeWidth="2" />
        {scene.layers.map && <g data-map="true" transform={`translate(${background.x} ${background.y}) rotate(${background.rotation}) translate(${-background.width / 2} ${-background.height / 2})`}>
          {scene.map && assets[scene.map] ? rasterActive ? <rect width={background.width} height={background.height} fill="transparent" /> : <image href={assets[scene.map]} width={background.width} height={background.height} preserveAspectRatio="none" /> : !scene.map ? scene.template ? <g transform={`scale(${background.width / scene.width} ${background.height / scene.height})`}><ManorMap width={scene.width} height={scene.height} /></g> : <rect width={background.width} height={background.height} fill="#29362e" /> : <text x="32" y="64" fill="#dbe7cf">Carregando mapa original…</text>}
        </g>}
        {scene.grid && <rect width={scene.width} height={scene.height} fill={`url(#${gridId})`} pointerEvents="none" />}
        {scene.layers.drawings && scene.drawings.filter(d => !playerView || !d.hidden).map(d => <g key={d.id} data-drawing={`drawing:${d.id}`} opacity={d.hidden ? .35 : 1}><polyline points={pathPoints(d.points)} fill="none" stroke="transparent" strokeWidth={14 / view.zoom} pointerEvents="stroke" /><polyline points={pathPoints(d.points)} fill="none" stroke={selected === `drawing:${d.id}` ? "#f2efb7" : d.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" /></g>)}
        {draft?.type === "draw" && <polyline points={pathPoints(draft.points)} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />}
        {displayed.items.filter(item => !playerView || !item.hidden).map(item => <g key={item.id} data-item={item.id} transform={`translate(${item.x} ${item.y})`} opacity={item.hidden ? .4 : 1} style={{ cursor: item.locked ? "not-allowed" : "grab" }}><title>{item.name}</title><g transform={`rotate(${item.rotation}) scale(${item.flipX ? -1 : 1} ${item.flipY ? -1 : 1})`}>{item.kind === "image" && assets[item.asset] ? <image href={assets[item.asset]} x={-item.width / 2} y={-item.height / 2} width={item.width} height={item.height} preserveAspectRatio="none" /> : <g><rect x={-item.width / 2} y={-item.height / 2} width={item.width} height={item.height} rx="6" fill="#dce2ca" stroke="#5b6b50" strokeWidth="2" /><path d={`M${-item.width * .3} ${-item.height * .2}h${item.width * .6}m${-item.width * .6} ${item.height * .12}h${item.width * .6}m${-item.width * .6} ${item.height * .12}h${item.width * .4}`} stroke="#617056" strokeWidth="3" /><text x="0" y={item.height * .25} textAnchor="middle" fill="#35432c" fontSize={Math.min(14, item.width / 12)}>{item.name.slice(0, 18)}</text></g>}</g>{item.showName && <text y={item.height / 2 + 22} textAnchor="middle" fill="#e0e8d8" fontSize="12">{item.name}</text>}</g>)}
        <LightingLayer id={rawId} lights={illumination} scene={displayed} bounds={bounds} phase="glow" />
        {scene.layers.tokens && displayed.tokens.filter(t => !playerView || !t.hidden).map(t => {
          const r = t.size / 2 - 3, image = t.variants[t.variant]?.asset, custom = Boolean(image && assets[image]);
          return <g key={t.id} data-token={t.id} transform={`translate(${t.x} ${t.y})`} opacity={t.hidden ? .45 : 1} style={{ cursor: t.locked ? "not-allowed" : "grab" }}>
            <title>{`${t.name}${t.locked ? " · Bloqueado" : ""}`}</title>
            <g transform={`rotate(${t.rotation}) scale(${t.flipX ? -1 : 1} ${t.flipY ? -1 : 1})`}>
              {custom ? <image href={assets[image!]} x={-t.size * t.aspect / 2} y={-t.size / 2} width={t.size * t.aspect} height={t.size} preserveAspectRatio="xMidYMid meet" opacity={t.condition === "dead" ? .5 : 1} /> : <><circle r={r + 3} fill="#0e1712" stroke={t.color} strokeWidth="3" /><circle r={r} fill="#24352c" /><text textAnchor="middle" dominantBaseline="central" fill={t.color} fontSize={r * .85} fontWeight="600" pointerEvents="none">{t.name.split(" ").slice(0, 2).map(w => w[0]).join("")}</text></>}
            </g>
            {t.condition !== "none" && <circle cx={t.size * t.aspect / 2} cy={t.size / 2} r="6" fill={t.condition === "wounded" ? "#db7770" : "#d6bd76"} pointerEvents="none" />}
            {t.showName && <g data-token-label="true"><rect x={-Math.max(t.size, t.name.length * 4.3) / 2} y={t.size / 2 + 8} width={Math.max(t.size, t.name.length * 4.3)} height="22" rx="5" fill="#111b17df" pointerEvents="none" /><text y={t.size / 2 + 23} textAnchor="middle" fill="#e0e8d8" fontSize="12" pointerEvents="none">{t.name}</text></g>}
          </g>;
        })}
        <LightingLayer id={rawId} lights={illumination} scene={displayed} bounds={bounds} phase="environment" />
        {scene.layers.effects && <BoardEffects effects={displayed.effects} playerView={playerView} />}
        {scene.fog && <rect data-vtt-viewport-bounds="" {...bounds} fill="#101816" opacity={playerView ? 1 : .72} mask={`url(#${fogId})`} clipPath={`url(#${fogId}-scene)`} pointerEvents="none" />}
        {scene.layers.effects && <WeatherLayer weather={scene.weather} intensity={scene.weatherIntensity} bounds={bounds} zoom={view.zoom} frame={background} />}
        {!playerView && displayed.walls.map(w => <g key={w.id} data-wall={w.id} style={{ cursor: w.locked ? "not-allowed" : "move" }}><line x1={w.a.x} y1={w.a.y} x2={w.b.x} y2={w.b.y} stroke="transparent" strokeWidth={16 / view.zoom} /><line x1={w.a.x} y1={w.a.y} x2={w.b.x} y2={w.b.y} stroke={selected === `wall:${w.id}` ? "#f1efbc" : w.door ? "#dfb87a" : "#a4cfca"} strokeWidth={w.door ? 6 : 3} strokeDasharray={w.open ? "8 8" : undefined} opacity={w.open ? .5 : .8} pointerEvents="none" />{selected === `wall:${w.id}` && !w.locked && (["a", "b"] as const).map(end => <circle key={end} data-wall={w.id} data-wall-point={end} cx={w[end].x} cy={w[end].y} r={7 / view.zoom} fill="#d9e8b5" stroke="#23301f" strokeWidth={2 / view.zoom} style={{ cursor: "crosshair" }} />)}</g>)}
        {displayed.notes.filter(n => !playerView || !n.hidden).map(n => <g key={n.id} data-note={n.id} transform={`translate(${n.x} ${n.y}) rotate(${n.rotation})`} style={{ cursor: n.locked ? "help" : "grab" }}><title>{n.title}</title><circle r={n.size / 2} fill="#182a22" stroke="#b6d29e" strokeWidth={Math.max(1, n.size / 17)} /><text dominantBaseline="central" textAnchor="middle" fill="#dcebc7" fontSize={n.size * .65} fontFamily="serif" fontWeight="bold" pointerEvents="none">i</text></g>)}
        {!playerView && displayed.cutscenes.map(c => <g key={c.id} data-cutscene={c.id} transform={`translate(${c.x} ${c.y}) rotate(${c.rotation})`} style={{ cursor: "pointer" }}><title>{`${c.title} · clique duplo para exibir`}</title><circle r={c.size / 2} fill="#23352a" stroke="#c9dea6" strokeWidth={Math.max(1, c.size / 18)} /><path d={`M${-c.size*.09} ${-c.size*.2}L${c.size*.22} 0L${-c.size*.09} ${c.size*.2}Z`} fill="#d6e9b6" pointerEvents="none" /></g>)}
        {!playerView && displayed.lights.map(l => <g key={l.id} data-light={`light:${l.id}`} style={{ cursor: "grab" }}><title>{l.kind === "flashlight" ? "Lanterna" : "Fonte de luz"}</title><circle cx={l.x} cy={l.y} r="10" fill={l.color} stroke="#fff2d2" strokeWidth="2" /><path d={`M${l.x - 16} ${l.y}h-6m44 0h-6m-16 -16v-6m0 44v-6`} stroke={l.color} strokeWidth="2" pointerEvents="none" /></g>)}
        {!playerView && selected && selectedFrame && <g transform={`translate(${selectedFrame.x} ${selectedFrame.y}) rotate(${selectedFrame.rotation})`} data-selection={selected}>
          <rect x={-selectedFrame.width / 2 - 5 / view.zoom} y={-selectedFrame.height / 2 - 5 / view.zoom} width={selectedFrame.width + 10 / view.zoom} height={selectedFrame.height + 10 / view.zoom} fill="none" stroke="#d6e8b9" strokeWidth={1.2 / view.zoom} strokeDasharray={`${4 / view.zoom} ${4 / view.zoom}`} pointerEvents="none" />
          {!selectedFrame.locked && <>{!selected.startsWith("light:") && <rect data-transform="resize" data-entity={selected} x={selectedFrame.width / 2 - 3 / view.zoom} y={selectedFrame.height / 2 - 3 / view.zoom} width={12 / view.zoom} height={12 / view.zoom} rx={2 / view.zoom} fill="#d6e8b9" stroke="#263523" strokeWidth={1 / view.zoom} style={{ cursor: "nwse-resize" }} />}
            <line x1="0" y1={-selectedFrame.height / 2 - 5 / view.zoom} x2="0" y2={-selectedFrame.height / 2 - 29 / view.zoom} stroke="#d6e8b9" strokeWidth={1 / view.zoom} pointerEvents="none" /><circle data-transform="rotate" data-entity={selected} cx="0" cy={-selectedFrame.height / 2 - 29 / view.zoom} r={6 / view.zoom} fill="#d6e8b9" stroke="#263523" strokeWidth={1 / view.zoom} style={{ cursor: "crosshair" }} /></>}
        </g>}
        {draft && ["wall", "door", "measure"].includes(draft.type) && <g pointerEvents="none"><line x1={draft.start.x} y1={draft.start.y} x2={draft.last.x} y2={draft.last.y} stroke="#e6d997" strokeWidth="3" strokeDasharray="8 5" /><circle cx={draft.start.x} cy={draft.start.y} r="5" fill="#e6d997" /><circle cx={draft.last.x} cy={draft.last.y} r="5" fill="#e6d997" />{draft.type === "measure" && <g transform={`translate(${(draft.start.x + draft.last.x) / 2} ${(draft.start.y + draft.last.y) / 2 - 22})`}><rect x="-45" y="-19" width="90" height="30" rx="7" fill="#15251f" stroke="#c2d69e" /><text textAnchor="middle" fill="#e7edd8" fontSize="16">{(distance(draft.start, draft.last) / scene.cell * scene.unit).toFixed(1)} m</text></g>}</g>}
      </g>
    </svg>
    {!playerView && <VariantWheel host={host} scene={scene} playerView={playerView} assets={assets} onCommit={onCommit} />}
    {hoverNote && (() => { const note = displayed.notes.find(n => n.id === hoverNote.id && (!playerView || !n.hidden)); return note ? <aside data-note-overlay="true" role="tooltip" className="vtt-note-tooltip" style={{ left: hoverNote.x, top: hoverNote.y }}><small>{note.hidden ? "NOTA DO MESTRE" : "NOTA DA CENA"}</small><strong>{note.title}</strong><p>{note.text || "Sem descrição."}</p></aside> : null; })()}
    <div className="vtt-scale" aria-hidden="true"><span style={{ width: Math.max(24, scene.cell * view.zoom * 3) }} />{(scene.unit * 3).toLocaleString("pt-BR")} metros</div>
  </div>;
});
export default Stage;

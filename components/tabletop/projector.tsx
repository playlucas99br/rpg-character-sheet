"use client";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Scene } from "../../lib/tabletop/model";
import { createPreviewScheduler } from "../../lib/tabletop/preview-scheduler";
import Stage from "./stage";

export type Presentation = { kind: "cutscene" | "document"; title: string; src: string; mime: string; loop?: boolean };
export type ProjectorHandle = { setPreview: (scene: Scene | null) => void };
export function openProjector(): Window | null {
  const popup = window.open("", "", "popup=yes,width=1280,height=720,resizable=yes");
  if (!popup) return null;
  popup.document.title = "Nexo — Tela da mesa";
  document.querySelectorAll('link[rel="stylesheet"],style').forEach(node => popup.document.head.appendChild(node.cloneNode(true)));
  const css = popup.document.createElement("style");
  css.textContent = `
    html, body { margin: 0 !important; padding: 0 !important; width: 100%; height: 100%; overflow: hidden; background: #070a08; }
    .vtt.vtt-projector { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; min-width: 0; min-height: 0; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; border-radius: 0; box-shadow: none; background: #080b09; }
    .vtt-projector .vtt-stage { position: absolute; inset: 0; width: 100%; height: 100%; }
    .vtt-projector .vtt-scale { display: none; }
    .vtt-projector-media { position: absolute; inset: 0; overflow: hidden; background: #050706; }
    .vtt-projector-media > img, .vtt-projector-media > video {
      position: absolute; inset: 0; display: block; box-sizing: border-box;
      width: 100%; height: 100%; min-width: 0; min-height: 0; max-width: 100%; max-height: 100%;
      margin: 0; object-fit: contain; object-position: center;
    }
    .vtt-projector-media > iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: white; }
    .vtt-projector-media > p { color: white; font: 16px sans-serif; text-align: center; }
  `;
  popup.document.head.appendChild(css);
  return popup;
}
const Projector = forwardRef<ProjectorHandle, { popup: Window; scene: Scene; assets: Record<string, string>; presentation: Presentation | null; onClosed: () => void }>(function Projector({ popup, scene, assets, presentation, onClosed }, ref) {
  const video = useRef<HTMLVideoElement>(null);
  const [preview, setPreview] = useState<Scene | null>(null);
  const previewScheduler = useMemo(() => createPreviewScheduler<Scene>(setPreview, 1000 / 24), []);
  useImperativeHandle(ref, () => ({ setPreview: value => value ? previewScheduler.push(value) : previewScheduler.clear() }), [previewScheduler]);
  useEffect(() => () => previewScheduler.dispose(), [previewScheduler]);
  const [position, setPosition] = useState(0), [duration, setDuration] = useState(0), [paused, setPaused] = useState(false), [volume, setVolume] = useState(1);
  useEffect(() => { popup.addEventListener("beforeunload", onClosed); return () => popup.removeEventListener("beforeunload", onClosed); }, [popup, onClosed]);
  const displayedScene = preview?.id === scene.id ? preview : scene;
  const board = useMemo(() => <Stage scene={displayedScene} selected={null} tool="pan" lightKind="torch" brush={96} color="#ffffff" playerView assets={assets} onSelect={() => {}} onCommit={() => {}} onZoom={() => {}} onDropItem={() => {}} onDropFiles={() => {}} onTokenMenu={() => {}} onCutscene={() => {}} />, [displayedScene, assets]);
  return <>
    {createPortal(<div className="vtt vtt-projector">{board}{presentation && <div className="vtt-projector-media">{presentation.kind === "cutscene" && presentation.mime.startsWith("video/") ? <video key={presentation.src} ref={video} src={presentation.src} autoPlay playsInline loop={presentation.loop} style={{ pointerEvents: "none" }} onLoadedData={e => { void e.currentTarget.play().catch(() => setPaused(true)); }} onTimeUpdate={e => setPosition(e.currentTarget.currentTime)} onDurationChange={e => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)} onPlay={() => setPaused(false)} onPause={() => setPaused(true)} /> : presentation.mime.startsWith("image/") ? <img src={presentation.src} alt={presentation.title} /> : ["application/pdf", "text/plain", "text/markdown"].includes(presentation.mime) ? <iframe title={presentation.title} src={presentation.src} /> : <p>Este formato não pode ser exibido diretamente pelo navegador.</p>}</div>}</div>, popup.document.body)}
    {presentation && <div className="vtt-projector-controls"><strong>Exibindo na TV: {presentation.title}</strong>{presentation.kind === "cutscene" && presentation.mime.startsWith("video/") && <><button className="vtt-button" onClick={() => { const v = video.current; if (v) { if (v.paused) void v.play().catch(() => setPaused(true)); else v.pause(); } }}>{paused ? "Reproduzir" : "Pausar"}</button><label>Progresso<input aria-label="Progresso do vídeo" type="range" min={0} max={duration || 1} step="0.1" value={Math.min(position, duration || 1)} onChange={e => { if (video.current) video.current.currentTime = Number(e.target.value); }} /></label><label>Volume<input aria-label="Volume do vídeo" type="range" min={0} max={1} step="0.05" value={volume} onChange={e => { const n = Number(e.target.value); setVolume(n); if (video.current) video.current.volume = n; }} /></label></>}<small>Pressione Esc no mestre para encerrar.</small></div>}
  </>;
});
export default Projector;

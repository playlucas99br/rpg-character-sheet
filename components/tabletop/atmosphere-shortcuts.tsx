"use client";
import { CloudFog, CloudRain, Flame, Moon, Sun, Sunset } from "lucide-react";
import type { Scene } from "../../lib/tabletop/model";
import WheelButton from "./wheel-button";
export default function AtmosphereShortcuts({ scene, onChange }: { scene: Scene; onChange: (update: (s: Scene) => Scene) => void }) {
  return <div className="vtt-atmosphere-shortcuts" role="group" aria-label="Atalhos de iluminação e clima">
    {([{ kind: "day", label: "Dia", icon: <Sun /> }, { kind: "dusk", label: "Penumbra", icon: <Sunset /> }, { kind: "night", label: "Noite", icon: <Moon /> }] as const).map(a => <button key={a.kind} className="vtt-icon" title={a.label} aria-label={`Atalho ${a.label}`} aria-pressed={scene.ambient === a.kind} onClick={() => onChange(s => ({ ...s, ambient: a.kind }))}>{a.icon}</button>)}
    <i />{([{ kind: "mist", label: "Névoa", icon: <CloudFog /> }, { kind: "rain", label: "Chuva", icon: <CloudRain /> }, { kind: "embers", label: "Fogo e brasas", icon: <Flame /> }] as const).map(w => <WheelButton key={w.kind} className="vtt-icon" scrollActive title={`${w.label} · clique para alternar · scroll ou ↑/↓ ajusta intensidade${scene.weather === w.kind ? ` · ${Math.round(scene.weatherIntensity * 100)}%` : ""}`} aria-label={`Atalho ${w.label}`} aria-pressed={scene.weather === w.kind} onClick={() => onChange(s => ({ ...s, weather: s.weather === w.kind ? "none" : w.kind }))} onStep={direction => onChange(s => ({ ...s, weather: w.kind, weatherIntensity: Math.round(Math.max(0, Math.min(1, s.weatherIntensity + direction * .1)) * 100) / 100 }))}>{w.icon}{scene.weather === w.kind && <small>{Math.round(scene.weatherIntensity * 100)}%</small>}</WheelButton>)}
  </div>;
}

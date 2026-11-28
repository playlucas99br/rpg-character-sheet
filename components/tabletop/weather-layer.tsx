"use client";
import { memo, useId, useMemo } from "react";
import type { Frame, Scene } from "../../lib/tabletop/model";
import type { WorldBounds } from "./lighting";
import { weatherParticles } from "../../lib/tabletop/weather-particles";
type Props = { weather: Scene["weather"]; intensity: number; bounds: WorldBounds; zoom: number; frame: Frame };
function WeatherLayer({ weather, intensity, bounds, zoom, frame }: Props) {
  const id = useId().replaceAll(":", ""), cell = 110 / (2 ** Math.floor(Math.log2(zoom)));
  const particles = useMemo(() => {
    if (weather === "none" || weather === "mist" || intensity <= 0) return [];
    return weatherParticles(bounds, cell, intensity);
  }, [bounds, cell, intensity, weather]);
  if (weather === "none" || weather === "mist" || intensity <= 0) return null;
  const px = 1 / zoom;
  return <g data-weather={weather} pointerEvents="none" aria-hidden="true" opacity={Math.min(1, .15 + intensity)}>
    <defs><clipPath id={`${id}-surface`}><rect x={-frame.width / 2} y={-frame.height / 2} width={frame.width} height={frame.height} transform={`translate(${frame.x} ${frame.y}) rotate(${frame.rotation})`} /></clipPath><linearGradient id={`${id}-drop`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d7e9ef" stopOpacity="0" /><stop offset=".8" stopColor="#deecf2" stopOpacity=".7" /><stop offset="1" stopColor="#fff" stopOpacity=".9" /></linearGradient><radialGradient id={`${id}-snow`}><stop stopColor="#fff" /><stop offset=".5" stopColor="#e7f2f6" stopOpacity=".9" /><stop offset="1" stopColor="#d8e9ee" stopOpacity="0" /></radialGradient><radialGradient id={`${id}-ember`}><stop stopColor="#fff7d6" /><stop offset=".3" stopColor="#ffbf70" /><stop offset="1" stopColor="#ff6822" stopOpacity="0" /></radialGradient></defs>
    <g clipPath={`url(#${id}-surface)`}>
      {weather === "rain" && <rect {...bounds} fill="#7394ad" opacity={intensity * .045} />}
      {particles.map(p => <g key={p.id} transform={`translate(${p.x} ${p.y})`} opacity={.25 + p.depth * .65}>
        {weather === "rain" ? <g style={{ animationDelay: `${p.delay}s`, animationDuration: `${.8 + p.depth * .65}s` }} className="vtt-surface-raindrop"><path className="vtt-drop-trail" d={`M${-4 * px} ${-(15 + p.depth * 13) * px}L0 0`} stroke={`url(#${id}-drop)`} strokeWidth={(.6 + p.depth * .7) * px} strokeLinecap="round" /><ellipse className="vtt-rain-impact" rx={(3 + p.depth * 5) * px} ry={(1.7 + p.depth * 2) * px} fill="none" stroke="#d5e6ed" strokeWidth={.65 * px} /><circle className="vtt-impact-glint" r={.8 * px} fill="#e7f2f6" /></g> : <g className={weather === "snow" ? "vtt-surface-snow" : "vtt-surface-ember"} style={{ animationDelay: `${p.delay}s`, animationDuration: `${weather === "snow" ? 5 + p.depth * 6 : 3 + p.depth * 4}s` }}><circle r={(weather === "snow" ? 1.3 + p.depth * 3.5 : 1.1 + p.depth * 2.6) * px} fill={`url(#${id}-${weather === "snow" ? "snow" : "ember"})`} /></g>}
      </g>)}
    </g>
  </g>;
}
export default memo(WeatherLayer, (a, b) => a.weather === b.weather && a.intensity === b.intensity && a.zoom === b.zoom && a.bounds === b.bounds && a.frame.x === b.frame.x && a.frame.y === b.frame.y && a.frame.width === b.frame.width && a.frame.height === b.frame.height && a.frame.rotation === b.frame.rotation);

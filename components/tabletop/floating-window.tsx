"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, GripHorizontal, ExternalLink, PanelLeftClose } from "lucide-react";
export default function FloatingWindow({ title, onClose, children, className = "" }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const [position, setPosition] = useState({ x: 18, y: 92 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [popup, setPopup] = useState<Window | null>(null), [blocked, setBlocked] = useState(false);
  const popupRef = useRef<Window | null>(null);
  useEffect(() => () => { popupRef.current?.close(); }, []);
  useEffect(() => {
    if (!popup) return;
    const closed = () => { popupRef.current = null; setPopup(null); };
    popup.addEventListener("beforeunload", closed);
    return () => popup.removeEventListener("beforeunload", closed);
  }, [popup]);
  function detach() {
    const next = window.open("", "", "popup=yes,width=780,height=640,resizable=yes,scrollbars=yes");
    if (!next) { setBlocked(true); return; }
    next.document.title = `${title} — Nexo`;
    document.querySelectorAll('link[rel="stylesheet"],style').forEach(node => next.document.head.appendChild(node.cloneNode(true)));
    const styles = next.document.createElement("style"); styles.textContent = "html,body{margin:0!important;padding:0!important;overflow:hidden!important;background:#17211a}.vtt-popout-root{width:100vw!important;height:100vh!important;min-height:0!important;display:flex!important;flex-direction:column;border:0!important;border-radius:0!important}.vtt-popout-root>header{display:flex;align-items:center;gap:10px;padding:10px;background:#29372b}.vtt-popout-root>header strong{flex:1}.vtt-popout-root>.vtt-window-content{flex:1;min-height:0;overflow:auto}"; next.document.head.appendChild(styles);
    popupRef.current = next; setPopup(next); setBlocked(false);
  }
  if (popup) return createPortal(<section className="vtt vtt-popout-root" role="dialog" aria-label={title}><header><strong>{title}</strong><button className="vtt-button" onClick={() => { popup.close(); setPopup(null); }}><PanelLeftClose size={16} /> Reencaixar no Nexo</button></header><div className="vtt-window-content">{children}</div></section>, popup.document.body);
  return <section role="dialog" aria-label={title} className={`vtt-floating-window ${className}`} style={{ left: position.x, top: position.y, maxWidth: `calc(100% - ${position.x + 8}px)` }} onKeyDown={e => { e.stopPropagation(); if (e.key === "Escape") onClose(); }}>
    <header onPointerDown={e => { if ((e.target as Element).closest("button")) return; drag.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { const d = drag.current; if (!d) return; const floating = e.currentTarget.parentElement!, parent = floating.parentElement!, box = parent.getBoundingClientRect(); setPosition({ x: Math.max(0, Math.min(parent.clientWidth - floating.clientWidth - 8, d.px + e.clientX - d.x)), y: Math.max(0, Math.min(Math.min(parent.clientHeight, innerHeight - box.top) - floating.clientHeight - 8, d.py + e.clientY - d.y)) }); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}><GripHorizontal size={17} /><strong>{title}</strong><button className="vtt-icon" aria-label="Abrir arquivos em janela independente" title="Destacar para outra janela ou monitor" onClick={detach}><ExternalLink size={16} /></button><button className="vtt-icon" aria-label={`Fechar ${title}`} onClick={onClose}><X size={17} /></button></header>
    {blocked && <p role="alert" className="vtt-caption">Permita pop-ups para destacar esta janela em outro monitor.</p>}<div className="vtt-window-content">{children}</div>
  </section>;
}

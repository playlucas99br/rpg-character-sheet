"use client";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { ArrowLeft, Check, ChevronRight, Clapperboard, CloudFog, Download, Eye, EyeOff, FileText, Flame, Focus, FolderOpen, Hand, ImagePlus, Info, Layers, LockKeyhole, Map, Maximize2, Minus, MonitorPlay, MousePointer2, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Redo2, Ruler, Save, Sparkles, Sun, Trash2, Undo2, Upload, Users, X, Zap } from "lucide-react";
import { Modal } from "../ui";
import type { Campaign, ResourceKey, Sheet, User } from "../../lib/game/types";
import { applyFrame, EFFECTS, LANTERN_DIRECTIONS, LIBRARY_MIME_TYPES, LIGHT_PRESETS, lightKindSchema, MAX_CUTSCENE_VIDEO_BYTES, MAX_IMAGE_BYTES, mapFrame, newLight, newScene, newToken, projectSchema, snapPoint, starterProject, tokenFrame, uid, type BoardDrag, type LibraryFile, type LightKind, type Point, type Scene, type TabletopProject, type Token } from "../../lib/tabletop/model";
import { loadAsset, loadProject, referencedAssets, saveAsset, saveProject, tabletopKey } from "../../lib/tabletop/storage";
import { createTabletopBackup, readTabletopBackup } from "../../lib/tabletop/backup";
import Stage, { type StageHandle, type Tool } from "./stage";
import AssetLibrary, { libraryDrag } from "./asset-library";
import { LightControls, TransformControls } from "./object-controls";
import FloatingWindow from "./floating-window";
import TokenMenu from "./token-menu";
import ObjectMenu from "./object-menu";
import Collections, { CollectionSelect } from "./collections";
import AtmosphereShortcuts from "./atmosphere-shortcuts";
import { removeSceneObject, sceneObject } from "../../lib/tabletop/objects";
import { effectSize, toggleFlashlight } from "../../lib/tabletop/model";
import { EffectsPanel, NotesPanel, WallInspector } from "./scene-objects";
import Projector, { openProjector, type Presentation, type ProjectorHandle } from "./projector";
import { placedLibraryFile } from "../../lib/tabletop/files";

const TOOLS: { id: Tool; label: string; key: string; icon: ReactNode; hint: string }[] = [
  { id: "select", label: "Selecionar", key: "V", icon: <MousePointer2 />, hint: "Clique para selecionar; arraste para mover. Botão direito no token abre as ações e a ficha." },
  { id: "pan", label: "Mover mapa", key: "H", icon: <Hand />, hint: "Arraste para explorar. Use a roda ou dois dedos para ampliar." },
  { id: "measure", label: "Medir distância", key: "M", icon: <Ruler />, hint: "Arraste entre dois pontos para medir a distância em metros." },
  { id: "draw", label: "Desenhar", key: "D", icon: <Pencil />, hint: "Desenhe no mapa. Ctrl+Z desfaz o último traço." },
  { id: "reveal", label: "Revelar fog", key: "F", icon: <Eye />, hint: "Passe o pincel para revelar áreas aos jogadores." },
  { id: "hide", label: "Ocultar com fog", key: "B", icon: <CloudFog />, hint: "Passe o pincel para ocultar novamente uma região." },
  { id: "wall", label: "Desenhar parede", key: "W", icon: <Layers />, hint: "Arraste para criar uma parede que bloqueia a iluminação." },
  { id: "door", label: "Desenhar porta", key: "P", icon: <LockKeyhole />, hint: "Arraste para criar uma porta. Selecione para editar; dê duplo clique para abrir ou fechar." },
  { id: "light", label: "Adicionar luz", key: "L", icon: <Flame />, hint: "Clique para colocar uma luz. Com um token selecionado, L liga ou desliga a lanterna." },
  { id: "note", label: "Adicionar nota de cena", key: "I", icon: <Info />, hint: "Clique no mapa para criar uma nota do mestre. Passe o mouse sobre o i para ler." },
  { id: "cutscene", label: "Adicionar cutscene", key: "C", icon: <Clapperboard />, hint: "Clique no mapa para adicionar um marcador de cutscene. Abra com clique duplo." },
];
const CONDITIONS = { none: "Sem condição", wounded: "Ferido", prone: "Caído", concentrating: "Concentrando", dead: "Derrotado" };
const quantity = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;
type Panel = "scenes" | "tokens" | "layers" | "atmosphere" | "files" | "documents" | "effects" | "notes";
type Props = { campaign: Campaign; sheets: Sheet[]; user: User; demo: boolean; onBack: () => void; onSheet: (id: string) => void; sheetBusy: boolean; onResource: (sheetId: string, key: ResourceKey, delta: number) => Promise<boolean> };

function SwitchRow({ label, checked, action, icon }: { label: string; checked: boolean; action: () => void; icon?: ReactNode }) {
  return <button className="vtt-switch-row" aria-pressed={checked} onClick={action}>{icon}<span>{label}</span><i className={checked ? "on" : ""} /></button>;
}

function CutscenePanel({ scene, selected, onSelect, onChange, onUpload, busy }: { scene: Scene; selected: string | null; onSelect: (id: string | null) => void; onChange: (update: (s: Scene) => Scene) => void; onUpload: (file: File, id: string) => Promise<void>; busy: boolean }) {
  const marker = scene.cutscenes.find(c => c.id === selected);
  return <section className="vtt-cutscene-settings"><div className="vtt-divider" /><h3><Clapperboard size={17} /> Cutscenes</h3><p className="vtt-caption">Adicione um marcador na barra de ferramentas e abra com clique duplo. A reprodução aparece na janela local da TV, enquanto você continua usando a mesa.</p>{scene.cutscenes.map(c => <button key={c.id} className="vtt-button vtt-wide" onClick={() => onSelect(c.id)}>{c.title || "Cutscene"}</button>)}{marker && <><label className="vtt-field"><span>Nome da cutscene</span><input value={marker.title} maxLength={100} onChange={e => { const title = e.target.value; onChange(s => ({ ...s, cutscenes: s.cutscenes.map(c => c.id === marker.id ? { ...c, title } : c) })); }} /></label><label className="vtt-field"><span>Vídeo até 1 GB · imagem ou GIF até 80 MB</span><input type="file" aria-label="Arquivo da cutscene" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void onUpload(file, marker.id); e.target.value = ""; }} /></label><p className="vtt-caption">{marker.asset ? "Mídia pronta para reprodução local." : "Nenhuma mídia selecionada."}</p><SwitchRow label="Repetir vídeo em loop" checked={marker.loop ?? false} action={() => onChange(s => ({ ...s, cutscenes: s.cutscenes.map(c => c.id === marker.id ? { ...c, loop: !c.loop } : c) }))} /><TransformControls frame={{ ...marker, width: marker.size, height: marker.size }} onChange={frame => onChange(s => applyFrame(s, marker.id, frame))} /><button className="vtt-danger" disabled={marker.locked} onClick={() => { onChange(s => removeSceneObject(s, marker.id)); onSelect(null); }}>Remover marcador</button></>}</section>;
}

export default function Tabletop(props: Props) {
  // A different account/campaign must receive a new component instance.
  return <TabletopEditor key={tabletopKey(props.campaign.id, props.user.id, props.demo)} {...props} />;
}
function TabletopEditor({ campaign, sheets, user, demo, onBack, onSheet, sheetBusy, onResource }: Props) {
  const key = tabletopKey(campaign.id, user.id, demo);
  const [project, setProject] = useState<TabletopProject | null>(null), projectRef = useRef<TabletopProject | null>(null);
  const [status, setStatus] = useState<"loading" | "saving" | "saved" | "error">("loading");
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [tool, setTool] = useState<Tool>("select"), [panel, setPanel] = useState<Panel>("scenes"), [panelOpen, setPanelOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null), [playerView, setPlayerView] = useState(false);
  const [hudVisible, setHudVisible] = useState(true), [lightKind, setLightKind] = useState<LightKind>("torch");
  const [zoom, setZoom] = useState(.5), [brush, setBrush] = useState(96), [color, setColor] = useState("#d6dca5");
  const [assets, setAssets] = useState<Record<string, string>>({}), objectURLs = useRef<Record<string, string>>({});
  const backupURLs = useRef<string[]>([]);
  const [busy, setBusy] = useState(false), [help, setHelp] = useState(false), [expanded, setExpanded] = useState(false);
  const [deletingScene, setDeletingScene] = useState(false);
  const [presentation, setPresentation] = useState<Presentation | null>(null), [projector, setProjector] = useState<Window | null>(null);
  const projectorView = useRef<ProjectorHandle>(null);
  const previewOnProjector = useCallback((preview: Scene | null) => { projectorView.current?.setPreview(preview); }, []);
  const projectorRef = useRef<Window | null>(null);
  const [libraryDocuments, setLibraryDocuments] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false), [tokenMenu, setTokenMenu] = useState<{ id: string; x: number; y: number; maxHeight: number } | null>(null), [infoToken, setInfoToken] = useState<string | null>(null);
  const [historyAvailable, setHistoryAvailable] = useState({ undo: false, redo: false }), history = useRef<{ past: TabletopProject[]; future: TabletopProject[] }>({ past: [], future: [] });
  const saveQueue = useRef<Promise<void>>(Promise.resolve()), generation = useRef(0), mounted = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), maxSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), pendingSave = useRef<TabletopProject | null>(null);
  const stage = useRef<StageHandle>(null), container = useRef<HTMLElement>(null), input = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<"map" | "token" | "variant" | "project" | "library">("map");
  const libraryDestination = useRef<{ folderId: string | null; kind: LibraryFile["kind"] }>({ folderId: null, kind: "token" });
  const scene = project?.scenes.find(s => s.id === project.active), token = scene?.tokens.find(t => t.id === selected);
  const item = scene?.items.find(i => i.id === selected);
  const selectedLight = scene?.lights.find(l => `light:${l.id}` === selected);
  const menuToken = scene?.tokens.find(t => t.id === tokenMenu?.id), detailToken = scene?.tokens.find(t => t.id === infoToken), detailSheet = sheets.find(s => s.id === detailToken?.sheetId);
  const gm = campaign.role === "gm";
  const ready = Boolean(project);
  useEffect(() => {
    if (!presentation) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); setPresentation(null); } };
    window.addEventListener("keydown", escape, true); return () => window.removeEventListener("keydown", escape, true);
  }, [presentation]);
  useEffect(() => () => { projectorRef.current?.close(); }, []);
  useEffect(() => {
    const changed = () => { if (document.fullscreenElement === container.current) setExpanded(true); else if (!document.fullscreenElement) setExpanded(false); };
    document.addEventListener("fullscreenchange", changed); return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const before = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = before; };
  }, [expanded]);
  async function fullscreen() {
    if (expanded) { if (document.fullscreenElement === container.current) await document.exitFullscreen().catch(() => {}); setExpanded(false); return; }
    setExpanded(true);
    try { if (container.current?.requestFullscreen && document.fullscreenEnabled) await container.current.requestFullscreen({ navigationUI: "hide" }); else setNotice("Modo imersivo ativado. Use F11 para ocultar também os controles do navegador."); }
    catch { setNotice("Modo imersivo ativado. Este navegador não permitiu a tela cheia; use F11 para ocupar o monitor."); }
  }
  useEffect(() => {
    if (!ready || !container.current) return;
    let previous: boolean | null = null;
    const observer = new ResizeObserver(([entry]) => {
      const wide = entry.contentRect.width >= 900;
      if (previous !== wide) { previous = wide; setPanelOpen(wide); }
    });
    observer.observe(container.current); return () => observer.disconnect();
  }, [ready]);
  const flushSave = useCallback(() => {
    clearTimeout(saveTimer.current); clearTimeout(maxSaveTimer.current); maxSaveTimer.current = undefined;
    const next = pendingSave.current, version = generation.current; pendingSave.current = null;
    if (!next) return;
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => saveProject(key, next)).then(() => {
      if (mounted.current && version === generation.current) setStatus("saved");
    }).catch(e => { if (mounted.current && version === generation.current) { setStatus("error"); setError(e instanceof Error ? e.message : "Não foi possível salvar. Exporte uma cópia antes de sair."); } });
  }, [key]);
  const persist = useCallback((next: TabletopProject) => {
    ++generation.current; setStatus("saving"); pendingSave.current = next;
    clearTimeout(saveTimer.current); saveTimer.current = setTimeout(flushSave, 1000);
    if (!maxSaveTimer.current) maxSaveTimer.current = setTimeout(flushSave, 4000);
  }, [flushSave]);
  const commit = useCallback((update: (p: TabletopProject) => TabletopProject) => {
    if (!projectRef.current) return;
    const current = projectRef.current, candidate = update(current), result = projectSchema.safeParse(candidate);
    if (!result.success) { setError("A alteração excede os limites da mesa ou contém dados inválidos. O conteúdo anterior foi preservado."); return; }
    const next = candidate;
    history.current.past = [...history.current.past.slice(-39), current]; history.current.future = [];
    projectRef.current = next; setProject(next); setHistoryAvailable({ undo: history.current.past.length > 0, redo: false }); persist(next);
  }, [persist]);
  const changeScene = useCallback((update: (s: Scene) => Scene) => {
    commit(p => ({ ...p, scenes: p.scenes.map(s => s.id === p.active ? update(s) : s) }));
  }, [commit]);
  const patchToken = useCallback((update: Partial<Token>) => {
    changeScene(s => ({ ...s, tokens: s.tokens.map(t => t.id === selected ? { ...t, ...update } : t) }));
  }, [changeScene, selected]);
  const undo = useCallback((redo = false) => {
    const source = redo ? history.current.future : history.current.past, target = redo ? history.current.past : history.current.future;
    const next = source.pop(); if (!next || !projectRef.current) return;
    target.push(projectRef.current); projectRef.current = next; setProject(next); setHistoryAvailable({ undo: history.current.past.length > 0, redo: history.current.future.length > 0 }); setSelected(null); persist(next);
  }, [persist]);
  useEffect(() => {
    mounted.current = true; let cancelled = false;
    void loadProject(key).then(async saved => {
      if (cancelled) return;
      const next = saved ?? starterProject(sheets.filter(s => s.type === "character"));
      // Older scenes kept images only on their objects; index them without changing their bytes.
      if (!next.libraryIndexed) for (const s of next.scenes) {
        const legacy = [...(s.map ? [{ asset: s.map, name: s.name, kind: "map" as const, width: s.width, height: s.height }] : []), ...s.tokens.flatMap(t => t.variants.map(v => ({ asset: v.asset, name: v.name || t.name, kind: "token" as const, width: undefined, height: undefined })))];
        for (const entry of legacy) if (!next.files.some(f => f.asset === entry.asset)) { const blob = await loadAsset(key, entry.asset); if (blob) next.files.push({ ...entry, id: uid(), folderId: null, mime: blob.type }); }
      }
      next.libraryIndexed = true;
      if (cancelled) return;
      projectRef.current = next; setProject(next); setStatus("saved");
      persist(next);
    }).catch(e => { if (!cancelled) { setError(e instanceof Error ? e.message : "Não foi possível recuperar a mesa."); setStatus("error"); } });
    return () => { cancelled = true; mounted.current = false; flushSave(); };
    // The initial characters seed a new board only; later sheet edits must not reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, persist, flushSave]);
  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    const missing = referencedAssets(project).filter(id => !objectURLs.current[id]);
    if (!missing.length) return;
    void Promise.all(missing.map(async id => {
      const blob = await loadAsset(key, id);
      if (blob && !cancelled && !objectURLs.current[id]) objectURLs.current[id] = URL.createObjectURL(blob);
    })).then(() => { if (!cancelled) setAssets({ ...objectURLs.current }); }).catch(() => { if (!cancelled) setError("Uma imagem não pôde ser recuperada. Importe a cópia da mesa para restaurá-la."); });
    return () => { cancelled = true; };
  }, [project, key]);
  useEffect(() => () => { for (const url of Object.values(objectURLs.current)) URL.revokeObjectURL(url); }, []);
  useEffect(() => () => { for (const url of backupURLs.current) URL.revokeObjectURL(url); }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000); return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!tokenMenu) return;
    const close = (event: PointerEvent) => { if (!(event.target as Element).closest(".vtt-token-menu")) setTokenMenu(null); };
    const resize = () => setTokenMenu(null);
    document.addEventListener("pointerdown", close); window.addEventListener("resize", resize); return () => { document.removeEventListener("pointerdown", close); window.removeEventListener("resize", resize); };
  }, [tokenMenu]);
  useEffect(() => {
    if (status !== "saving" && !busy) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [status, busy]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable=true], .vtt-floating-window, .vtt-token-menu") || help || deletingScene || infoToken || !gm) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(e.shiftKey); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") { setSelected(null); setTool("select"); return; }
      if (e.key.toLowerCase() === "u") { e.preventDefault(); setHudVisible(v => !v); return; }
      if (playerView) return;
      if (e.key.toLowerCase() === "l" && token) { e.preventDefault(); if (!e.repeat) patchToken(toggleFlashlight(token)); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && scene && selected) { e.preventDefault(); changeScene(s => removeSceneObject(s, selected)); setSelected(null); setTokenMenu(null); return; }
      const choice = TOOLS.find(t => t.key.toLowerCase() === e.key.toLowerCase());
      if (choice) { e.preventDefault(); setTool(choice.id); }
      if (item && !item.locked) {
        if (e.key.toLowerCase() === "x") { e.preventDefault(); changeScene(s => ({ ...s, items: s.items.map(i => i.id === item.id ? { ...i, flipX: !i.flipX } : i) })); }
        if (e.key.toLowerCase() === "y") { e.preventDefault(); changeScene(s => ({ ...s, items: s.items.map(i => i.id === item.id ? { ...i, flipY: !i.flipY } : i) })); }
        if (e.key.toLowerCase() === "r") { e.preventDefault(); changeScene(s => ({ ...s, items: s.items.map(i => i.id === item.id ? { ...i, rotation: (i.rotation + (e.shiftKey ? 315 : 45)) % 360 } : i) })); }
        if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); changeScene(s => ({ ...s, items: s.items.filter(i => i.id !== item.id) })); setSelected(null); }
      }
      if (!token) return;
      if ((e.key === "Delete" || e.key === "Backspace") && !token.locked) { e.preventDefault(); changeScene(s => ({ ...s, tokens: s.tokens.filter(t => t.id !== token.id) })); setSelected(null); }
      if (e.key.toLowerCase() === "r" && !token.locked) { e.preventDefault(); patchToken({ rotation: (token.rotation + (e.shiftKey ? -45 : 45) + 360) % 360 }); }
      if (e.key.toLowerCase() === "x" && !token.locked) { e.preventDefault(); patchToken({ flipX: !token.flipX }); }
      if (e.key.toLowerCase() === "y" && !token.locked) { e.preventDefault(); patchToken({ flipY: !token.flipY }); }
      const offsets: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      const offset = offsets[e.key];
      if (offset && scene && !token.locked) { e.preventDefault(); const step = e.shiftKey ? 1 : scene.cell; patchToken({ x: Math.max(0, Math.min(scene.width, token.x + offset[0] * step)), y: Math.max(0, Math.min(scene.height, token.y + offset[1] * step)) }); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [token, item, scene, selected, playerView, undo, changeScene, patchToken, gm, help, deletingScene, infoToken]);
  function chooseUpload(target: typeof uploadTarget.current) {
    uploadTarget.current = target;
    if (input.current) { input.current.value = ""; input.current.accept = target === "project" ? ".json,.nexo" : target === "library" && libraryDestination.current.kind === "document" ? "image/png,image/jpeg,image/webp,image/gif,.pdf,.txt,.md,.docx,.xlsx" : "image/png,image/jpeg,image/webp,image/gif"; input.current.multiple = target === "token" || target === "variant" || target === "library"; input.current.click(); }
  }
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    return importFiles(Array.from(e.target.files ?? []), uploadTarget.current);
  }
  async function importFiles(files: File[], target: typeof uploadTarget.current | "board", at?: Point) {
    if (!files.length || !scene || !project) return;
    setBusy(true); setError("");
    try {
      if (target === "project") {
        const { project: imported, assets: backupAssets } = await readTabletopBackup(files[0]);
        const ids = referencedAssets(imported), remap: Record<string, string> = Object.create(null);
        for (const id of ids) {
          const asset = backupAssets.get(id); if (!asset) throw new Error("A cópia contém um arquivo ausente.");
          remap[id] = uid(); await saveAsset(key, remap[id], asset);
        }
        const restored = { ...imported, files: imported.files.map(f => ({ ...f, asset: remap[f.asset] })), scenes: imported.scenes.map(s => ({ ...s, map: s.map ? remap[s.map] : undefined, cutscenes: s.cutscenes.map(c => ({ ...c, asset: c.asset ? remap[c.asset] : undefined })), items: s.items.map(i => ({ ...i, asset: remap[i.asset] })), tokens: s.tokens.map(t => ({ ...t, variants: t.variants.map(v => ({ ...v, asset: remap[v.asset] })) })) })) };
        commit(() => restored); setSelected(null); setNotice("Mesa importada. A versão anterior pode ser recuperada em Desfazer.");
      } else {
        if ((target === "token" && scene.tokens.length + files.length > 500) || (target === "variant" && (!token || token.variants.length + files.length > 12))) throw new Error("Use até 500 tokens por cena e 12 variantes por token.");
        if (target === "board" && scene.items.length + files.length > 500) throw new Error("A cena aceita até 500 imagens e documentos.");
        if (project.files.length + files.length > 2000) throw new Error("A biblioteca aceita até 2.000 arquivos por mesa.");
        const additions: { id: string; name: string; mime: string; width?: number; height?: number }[] = [];
        for (const file of files) {
          const suffix = file.name.split(".").at(-1)?.toLowerCase() ?? "";
          const fallback: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", md: "text/markdown", txt: "text/plain", pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
          const mime = LIBRARY_MIME_TYPES.includes(file.type) ? file.type : fallback[suffix] ?? "";
          const imageFile = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mime);
          if (!(["library", "board"].includes(target) ? LIBRARY_MIME_TYPES.includes(mime) : imageFile) || !file.size || file.size > MAX_IMAGE_BYTES) throw new Error("Use imagens PNG, JPEG, WebP ou GIF, ou documentos PDF, TXT, Markdown, Word e Excel. Limite de 80 MB por arquivo; o original é preservado.");
          let dimensions: { width?: number; height?: number } = {};
          if (imageFile) {
            const url = URL.createObjectURL(file), image = new Image();
            dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => { image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight }); image.onerror = () => reject(new Error("Não foi possível abrir a imagem.")); image.src = url; }).finally(() => URL.revokeObjectURL(url));
            if (!dimensions.width || !dimensions.height || dimensions.width > 50000 || dimensions.height > 50000 || dimensions.width * dimensions.height > 100000000) throw new Error("Use imagens com até 100 megapixels e 50.000 pixels por lado. O arquivo não será reduzido automaticamente.");
          }
          const id = uid(); await saveAsset(key, id, file.type === mime ? file : new Blob([file], { type: mime }));
          additions.push({ id, mime, name: file.name.replace(/\.[^.]+$/, "").slice(0, 100), ...dimensions });
        }
        const entries: LibraryFile[] = additions.map(f => ({ id: uid(), asset: f.id, name: f.name, mime: f.mime, width: f.width, height: f.height, kind: !f.mime.startsWith("image/") ? "document" : target === "library" ? libraryDestination.current.kind : target === "board" ? "item" : target === "map" ? "map" : "token", folderId: target === "library" ? libraryDestination.current.folderId : null }));
        if (target === "board") {
          if (scene.items.length + entries.length > 500) throw new Error("A cena aceita até 500 imagens e documentos.");
          const point = at ?? { x: scene.width / 2, y: scene.height / 2 };
          const items = entries.map((file, i) => { const step = scene.snap ? scene.cell : 24; const position = { x: point.x + i * step, y: point.y + i * step }; return placedLibraryFile(file, scene.snap ? snapPoint(position, scene.cell) : position); });
          commit(p => ({ ...p, files: [...p.files, ...entries], scenes: p.scenes.map(s => s.id === scene.id ? { ...s, items: [...s.items, ...items] } : s) }));
          if (projectRef.current?.active === scene.id) { setSelected(items[0].id); setTool("select"); setPanel("files"); }
          setNotice("Arquivos adicionados ao tabuleiro e à biblioteca.");
        }
        else if (target === "library") { commit(p => ({ ...p, files: [...p.files, ...entries] })); setPanel(libraryDestination.current.kind === "document" ? "documents" : "files"); setNotice("Arquivos originais adicionados à pasta. Arraste-os para o tabuleiro."); }
        else if (target === "map") {
          const file = additions[0];
          const width = file.width!, height = file.height!, scale = Math.max(1, 320 / Math.min(width, height));
          if (Math.max(width, height) * scale > 50000) throw new Error("Este mapa tem uma proporção muito estreita para a cena. Use uma imagem com margens maiores.");
          commit(p => ({ ...p, files: [...p.files, ...entries], scenes: p.scenes.map(s => s.id === scene.id ? { ...s, map: file.id, mapTransform: undefined, width: width * scale, height: height * scale } : s) }));
          setNotice(`Mapa importado: ${width.toLocaleString("pt-BR")} × ${height.toLocaleString("pt-BR")} px. Sem compressão.`);
        } else if (target === "variant" && token) {
          commit(p => ({ ...p, files: [...p.files, ...entries], scenes: p.scenes.map(s => s.id === scene.id ? { ...s, tokens: s.tokens.map(t => t.id === token.id ? { ...t, variants: [...t.variants, ...additions.map(f => ({ name: f.name, asset: f.id }))], variant: t.variants.length } : t) } : s) }));
        } else commit(p => ({ ...p, files: [...p.files, ...entries], scenes: p.scenes.map(s => s.id === scene.id ? { ...s, tokens: [...s.tokens, ...additions.map((f, i) => ({ ...newToken(f.name, at ?? { x: Math.min(s.width, Math.round(s.width / 2 / s.cell) * s.cell + i % 5 * s.cell), y: Math.min(s.height, Math.round(s.height / 2 / s.cell) * s.cell + Math.floor(i / 5) * s.cell) }), aspect: Math.min(50, Math.max(.02, f.width! / f.height!)), size: s.cell, variants: [{ name: f.name, asset: f.id }] }))] } : s) }));
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível importar o arquivo."); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function exportProject() {
    if (!project || busy) return;
    setBusy(true); setError("");
    try {
      const backup = await createTabletopBackup(project, id => loadAsset(key, id));
      const url = URL.createObjectURL(backup);
      backupURLs.current.push(url);
      const link = document.createElement("a"); link.href = url; link.download = `${campaign.name.replace(/[^\p{L}\p{N}-]+/gu, "-")}.nexo`; link.click(); setNotice("Cópia preparada com os arquivos originais. Confira o download antes de fechar.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível exportar."); }
    finally { setBusy(false); }
  }
  function addCharacter(sheet: Sheet, at?: Point) {
    if (!scene) return;
    const next = { ...newToken(sheet.name, at ?? { x: Math.round(scene.width / 2 / scene.cell) * scene.cell, y: Math.round(scene.height / 2 / scene.cell) * scene.cell }), sheetId: sheet.id, ownerId: sheet.ownerId };
    changeScene(s => ({ ...s, tokens: [...s.tokens, next] })); setSelected(next.id); setPanel("tokens"); setTool("select");
  }
  function duplicateToken() {
    if (!token || !scene) return;
    const next = { ...token, id: uid(), x: Math.min(scene.width, token.x + scene.cell), y: Math.min(scene.height, token.y + scene.cell), name: `${token.name.slice(0, 90)} (cópia)` };
    changeScene(s => ({ ...s, tokens: [...s.tokens, next] })); setSelected(next.id);
  }
  function selectObject(id: string | null) {
    setSelected(id); setTokenMenu(null); if (!id) return; setTool("select");
    setPanel(id === "__map__" ? "scenes" : id.startsWith("wall:") ? "layers" : id.startsWith("note:") || id.startsWith("cutscene:") || scene?.notes.some(n => n.id === id) ? "notes" : scene?.effects.some(e => e.id === id) ? "effects" : id.startsWith("light:") ? "atmosphere" : scene?.items.some(i => i.id === id) ? "files" : "tokens"); setPanelOpen(true);
  }
  async function uploadCutscene(file: File, markerId: string) {
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm"] as const;
    const fallbacks: Record<string, typeof allowed[number]> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", mp4: "video/mp4", webm: "video/webm" };
    const mime = allowed.find(type => type === file.type) ?? (!file.type ? fallbacks[file.name.split(".").at(-1)?.toLowerCase() ?? ""] : undefined);
    if (!mime || !file.size || file.size > (mime.startsWith("video/") ? MAX_CUTSCENE_VIDEO_BYTES : MAX_IMAGE_BYTES)) { setError("Use MP4 ou WebM de até 1 GB, ou PNG, JPEG, WebP ou GIF de até 80 MB."); return; }
    const sceneId = scene?.id; if (!sceneId) return;
    setBusy(true);
    try {
      const asset = uid(), blob = file.type === mime ? file : new Blob([file], { type: mime }); await saveAsset(key, asset, blob);
      if (!mounted.current || !projectRef.current?.scenes.find(s => s.id === sceneId)?.cutscenes.some(c => c.id === markerId)) return;
      const url = URL.createObjectURL(blob); objectURLs.current[asset] = url; setAssets(previous => ({ ...previous, [asset]: url }));
      commit(p => ({ ...p, scenes: p.scenes.map(s => s.id === sceneId ? { ...s, cutscenes: s.cutscenes.map(c => c.id === markerId ? { ...c, asset, mime } : c) } : s) }));
      setNotice("Mídia carregada. Aguarde a mesa indicar que foi salva antes de sair.");
    }
    catch { setError("Não foi possível salvar a mídia da cutscene neste navegador. Confira o espaço disponível e tente novamente."); }
    finally { setBusy(false); }
  }
  function playCutscene(id: string) {
    const marker = scene?.cutscenes.find(c => c.id === id);
    if (!marker?.asset || !assets[marker.asset]) { setNotice("Selecione uma imagem, GIF ou vídeo para esta cutscene."); selectObject(id); return; }
    if (!ensureProjector()) return;
    setPresentation({ kind: "cutscene", title: marker.title, src: assets[marker.asset], mime: marker.mime ?? "image/png", loop: marker.loop });
  }
  function ensureProjector() { if (projectorRef.current && !projectorRef.current.closed) return true; const next = openProjector(); if (!next) { setError("O navegador bloqueou a janela da TV. Permita pop-ups para o Nexo e tente novamente."); return false; } projectorRef.current = next; setProjector(next); return true; }
  function presentDocument(file: LibraryFile) { if (!assets[file.asset]) { setNotice("O arquivo ainda está carregando. Tente novamente."); return; } if (!["application/pdf", "text/plain", "text/markdown"].includes(file.mime) && !file.mime.startsWith("image/")) { setNotice("Para apresentar este arquivo, exporte-o como PDF ou TXT primeiro."); return; } if (ensureProjector()) setPresentation({ kind: "document", title: file.name, src: assets[file.asset], mime: file.mime }); }
  function deleteObject(id: string) {
    if (playerView) return;
    changeScene(s => removeSceneObject(s, id)); setSelected(null); setTokenMenu(null);
  }
  function placeFile(file: LibraryFile, at?: Point) {
    if (!scene) return;
    setTool("select");
    const point = at ?? { x: scene.width / 2, y: scene.height / 2 }, p = scene.snap ? snapPoint(point, scene.cell) : point;
    if (file.kind === "map") {
      const originalWidth = file.width ?? scene.width, originalHeight = file.height ?? scene.height;
      const scale = Math.max(1, 320 / Math.min(originalWidth, originalHeight));
      const width = originalWidth * scale, height = originalHeight * scale;
      changeScene(s => ({ ...s, map: file.asset, mapTransform: undefined, width, height })); selectObject("__map__"); setPanel("scenes"); return;
    }
    if (file.kind === "token") {
      const next = { ...newToken(file.name, p), size: scene.cell, aspect: Math.min(50, Math.max(.02, (file.width ?? 1) / (file.height ?? 1))), variants: [{ name: file.name, asset: file.asset }] };
      changeScene(s => ({ ...s, tokens: [...s.tokens, next] })); setSelected(next.id); setPanel("tokens"); return;
    }
    const next = placedLibraryFile(file, p);
    changeScene(s => ({ ...s, items: [...s.items, next] })); setSelected(next.id); setPanel("files");
  }
  function openFile(file: LibraryFile) {
    const url = assets[file.asset];
    if (!url) { setNotice("O arquivo ainda está sendo carregado. Tente abrir novamente em instantes."); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  }
  function dropItem(data: BoardDrag, point: Point) {
    if (!scene || !project || playerView || !data || typeof data !== "object") return;
    const at = scene.snap ? snapPoint(point, scene.cell) : point;
    if (data.kind === "file") { const file = project.files.find(f => f.id === data.id); if (file) placeFile(file, at); }
    else if (data.kind === "token") { const token = scene.tokens.find(t => t.id === data.id); if (token && !token.locked) { changeScene(s => ({ ...s, tokens: s.tokens.map(t => t.id === token.id ? { ...t, ...at } : t) })); setSelected(token.id); setTool("select"); } }
    else if (data.kind === "character") { const sheet = sheets.find(s => s.id === data.id); if (sheet) addCharacter(sheet, at); }
    else if (data.kind === "light" && lightKindSchema.safeParse(data.lightKind).success) { const light = newLight(data.lightKind, at); changeScene(s => ({ ...s, lights: [...s.lights, light] })); setSelected(`light:${light.id}`); setPanel("atmosphere"); }
    else if (data.kind === "weather" && ["none", "rain", "snow", "embers", "mist"].includes(data.weather)) changeScene(s => ({ ...s, weather: data.weather as Scene["weather"] }));
    else if (data.kind === "effect" && Object.hasOwn(EFFECTS, data.effect)) { const effect = { id: uid(), kind: data.effect, ...at, ...effectSize(data.effect), rotation: 0, locked: false, intensity: 1, hidden: false }; changeScene(s => ({ ...s, effects: [...s.effects, effect] })); setSelected(effect.id); setPanel("effects"); setTool("select"); }
    else if (data.kind === "tool" && TOOLS.some(t => t.id === data.tool)) {
      setTool(data.tool as Tool);
      if (data.tool === "light") { const light = newLight(lightKind, at); changeScene(s => ({ ...s, lights: [...s.lights, light] })); }
      else if (data.tool === "wall" || data.tool === "door") changeScene(s => ({ ...s, walls: [...s.walls, { id: uid(), a: at, b: { x: at.x + s.cell * 2, y: at.y }, door: data.tool === "door", open: false, locked: false }] }));
      else if (data.tool === "note") { const note = { id: `note:${uid()}`, ...at, size: 34, rotation: 0, title: "Nota de cena", text: "", hidden: true, locked: false }; changeScene(s => ({ ...s, notes: [...s.notes, note] })); setSelected(note.id); setPanel("notes"); setPanelOpen(true); setTool("select"); }
      else if (data.tool === "reveal" || data.tool === "hide") changeScene(s => ({ ...s, fog: true, fogStrokes: [...s.fogStrokes, { mode: data.tool as "reveal" | "hide", radius: brush, points: [at] }] }));
      else setNotice("Ferramenta selecionada. Arraste no tabuleiro para usá-la.");
    }
  }
  if (!gm) return <section className="vtt-unavailable"><Map size={36} /><h2>A mesa virtual está em preparação</h2><p>Esta versão é um editor local para o mestre. A sala compartilhada com os jogadores será uma etapa separada.</p><button className="button" onClick={onBack}>Voltar à campanha</button></section>;
  if (!project || !scene) return <section className="vtt-unavailable"><Map size={36} /><h2>{status === "error" ? "Não foi possível abrir a mesa" : "Preparando sua mesa…"}</h2><p>{error || "Carregando cenas e imagens deste navegador."}</p><button className="button" onClick={onBack}>Voltar à campanha</button></section>;
  const property = (label: string, children: ReactNode) => <label className="vtt-field"><span>{label}</span>{children}</label>;

  return <section className={`vtt ${expanded ? "vtt-expanded" : ""} ${playerView ? "vtt-player-view" : ""} ${!hudVisible ? "vtt-hud-hidden" : ""}`} ref={container} aria-label="Mesa virtual da campanha">
    <input ref={input} type="file" hidden onChange={e => void upload(e)} />
    <header className="vtt-header">
      <button className="vtt-icon" title="Voltar à campanha" aria-label="Voltar à campanha" onClick={onBack}><ArrowLeft /></button>
      <div className="vtt-identity"><span><Map size={13} /> NEXO / MESA VIRTUAL</span><h1>{campaign.name}</h1></div>
      {!playerView && <AtmosphereShortcuts scene={scene} onChange={changeScene} />}
      <div className="vtt-header-actions">
        {!playerView && <button className="vtt-button" title="Abre a visão local para arrastar até a TV" onClick={() => { if (ensureProjector()) projectorRef.current?.focus(); }}><MonitorPlay size={16} /><span>Tela da TV</span></button>}
        <button aria-label={playerView ? "Voltar ao mestre" : "Prévia do jogador"} className={`vtt-button ${playerView ? "is-active" : ""}`} onClick={() => { setHudVisible(playerView); setPlayerView(v => !v); setSelected(null); }} aria-pressed={playerView}><Eye size={16} /><span>{playerView ? "Voltar ao mestre" : "Prévia do jogador"}</span></button>
        <button className="vtt-icon" aria-label={expanded ? "Sair da tela cheia total" : "Entrar em tela cheia total"} title="Tela cheia do monitor" onClick={() => void fullscreen()}><Maximize2 /></button>
        {!expanded && <button className="vtt-icon" aria-label="Modo imersivo com F11" title="Modo imersivo: use F11 no navegador; Esc não fecha a mesa" onClick={() => { setExpanded(true); setNotice("Modo imersivo ativado. Pressione F11 no navegador para ocupar o monitor; Esc não fecha este modo."); }}><Focus /></button>}
        <button className="vtt-icon" aria-label="Ocultar HUD (U)" title="Ocultar HUD · U" onClick={() => setHudVisible(false)}><PanelLeftClose /></button>
        <button className="vtt-icon" aria-label="Ajuda e atalhos da mesa" onClick={() => setHelp(true)}><span>?</span></button>
      </div>
    </header>
    <div className="vtt-workspace">
      {!playerView && <nav className="vtt-tools" aria-label="Ferramentas do mapa">{TOOLS.map(t => <button key={t.id} draggable onDragStart={e => libraryDrag(e, { kind: "tool", tool: t.id })} className={`vtt-tool ${tool === t.id ? "is-active" : ""}`} aria-label={`${t.label} (${t.key})`} aria-pressed={tool === t.id} title={`${t.label} · ${t.key} · Arraste para o mapa`} onClick={() => setTool(t.id)}>{t.icon}<kbd>{t.key}</kbd></button>)}<span className="vtt-tool-divider" /><button className="vtt-tool" aria-label="Desfazer" title="Desfazer · Ctrl+Z" disabled={!historyAvailable.undo} onClick={() => undo()}><Undo2 /></button><button className="vtt-tool" aria-label="Refazer" title="Refazer · Ctrl+Shift+Z" disabled={!historyAvailable.redo} onClick={() => undo(true)}><Redo2 /></button></nav>}
      <div className="vtt-map-area">
        <Stage onPreview={projector ? previewOnProjector : undefined} onCutscene={playCutscene} ref={stage} scene={scene} selected={selected} tool={tool} lightKind={lightKind} brush={brush} color={color} playerView={playerView} assets={assets} onSelect={selectObject} onCommit={changeScene} onZoom={setZoom} onDropItem={dropItem} onDropFiles={(files, point) => void importFiles(files, "board", point)} onTokenMenu={(id, point) => { setSelected(id); setTool("select"); const box = container.current!.getBoundingClientRect(), available = Math.max(100, Math.min(box.height, innerHeight - box.top)), y = Math.max(8, Math.min(available - 550, point.y - box.top)); setTokenMenu({ id, x: Math.max(8, Math.min(box.width - 328, point.x - box.left)), y, maxHeight: available - y - 8 }); }} />
        <div className="vtt-scene-badge"><span className="vtt-live-dot" /><div><strong>{scene.name}</strong><span>{playerView ? "Simulação local da visão do jogador" : "Preparação local · Mestre"}</span></div></div>
        {!playerView && <div className="vtt-context-bar"><span>{TOOLS.find(t => t.id === tool)?.icon}</span><p>{TOOLS.find(t => t.id === tool)?.hint}</p>{["reveal", "hide"].includes(tool) && <label>Pincel<input aria-label="Tamanho do pincel de fog" type="range" min="16" max="320" step="16" value={brush} onChange={e => setBrush(Number(e.target.value))} /></label>}{tool === "draw" && <input aria-label="Cor do desenho" type="color" value={color} onChange={e => setColor(e.target.value)} />}</div>}
        <div className="vtt-map-controls"><button aria-label="Diminuir zoom" title="Diminuir zoom" onClick={() => stage.current?.zoom(.8)}><Minus size={16} /></button><span>{Math.round(zoom * 100)}%</span><button aria-label="Aumentar zoom" title="Aumentar zoom" onClick={() => stage.current?.zoom(1.25)}><Plus size={16} /></button><i /><button aria-label="Enquadrar mapa" title="Enquadrar mapa" onClick={() => stage.current?.fit()}><Focus size={18} /></button></div>
        {!playerView && <button className="vtt-panel-toggle" onClick={() => setPanelOpen(v => !v)} aria-label={panelOpen ? "Recolher painel da mesa" : "Abrir painel da mesa"}>{panelOpen ? <ChevronRight size={18} /> : <Layers size={18} />}</button>}
        {busy && <div className="vtt-working" role="status">Preparando os arquivos originais…</div>}
      </div>
      {!playerView && panelOpen && <aside className="vtt-panel" aria-label="Controles da mesa">
        <div className="vtt-panel-tabs" role="group" aria-label="Painéis da mesa">{([{ id: "scenes", label: "Cenas", icon: <Map /> }, { id: "tokens", label: "Tokens", icon: <Users /> }, { id: "files", label: "Arquivos", icon: <FolderOpen /> }, { id: "documents", label: "Documentos", icon: <FileText /> }, { id: "layers", label: "Camadas", icon: <Layers /> }, { id: "atmosphere", label: "Ambiente", icon: <Sparkles /> }, { id: "effects", label: "Efeitos", icon: <Zap /> }, { id: "notes", label: "Notas", icon: <Info /> }] as const).map(p => <button key={p.id} aria-pressed={panel === p.id} className={panel === p.id ? "is-active" : ""} onClick={() => { setPanel(p.id); if (p.id === "files" || p.id === "documents") { setLibraryDocuments(p.id === "documents"); setLibraryOpen(true); } }}>{p.icon}<span>{p.label}</span></button>)}</div>
        <div className="vtt-panel-content">
          {panel === "notes" && <><NotesPanel scene={scene} selected={selected} onChange={changeScene} onSelect={selectObject} /><CutscenePanel scene={scene} selected={selected} onSelect={selectObject} onChange={changeScene} onUpload={uploadCutscene} busy={busy} /></>}
          {panel === "effects" && <EffectsPanel scene={scene} selected={selected} onChange={changeScene} onSelect={id => { setSelected(id); setPanel("effects"); setTool("select"); }} />}
          {panel === "scenes" && <>
            <div className="vtt-panel-heading"><div><span>O PALCO DA HISTÓRIA</span><h2>Suas cenas</h2></div><button className="vtt-icon" aria-label="Criar nova cena" disabled={project.scenes.length >= 30} onClick={() => { const next = newScene(`Cena ${project.scenes.length + 1}`); commit(p => ({ ...p, active: next.id, scenes: [...p.scenes, next] })); setSelected(null); }}><Plus /></button></div>
            <Collections label="cenas" groups={project.sceneGroups} items={project.scenes} onGroups={sceneGroups => commit(p => ({ ...p, sceneGroups }))} onRemoveGroup={id => commit(p => ({ ...p, sceneGroups: p.sceneGroups.filter(g => g.id !== id), scenes: p.scenes.map(s => s.groupId === id ? { ...s, groupId: null } : s) }))} onMove={(id, groupId) => commit(p => ({ ...p, scenes: p.scenes.map(s => s.id === id ? { ...s, groupId } : s) }))} render={s => <div className="vtt-scenes"> <button draggable onDragStart={e => libraryDrag(e, { kind: "scene", id: s.id })} key={s.id} aria-pressed={s.id === scene.id} className={`vtt-scene-card ${s.id === scene.id ? "is-active" : ""}`} onClick={() => { commit(p => ({ ...p, active: s.id })); setSelected(null); }}><span className="vtt-scene-thumb" style={s.map && assets[s.map] ? { backgroundImage: `url("${assets[s.map]}")` } : undefined}>{(!s.map || !assets[s.map]) && <Map size={28} />}</span><span><strong>{s.name}</strong><small>{quantity(s.tokens.length, "token", "tokens")}</small></span>{s.id === scene.id && <Check size={16} />}</button></div>} />
            {property("Nome da cena", <input value={scene.name} maxLength={100} onChange={e => e.target.value && changeScene(s => ({ ...s, name: e.target.value }))} />)}
            <CollectionSelect label="Conjunto da cena" groups={project.sceneGroups} value={scene.groupId} onChange={groupId => changeScene(s => ({ ...s, groupId }))} />
            <button className="vtt-primary" disabled={busy} onClick={() => chooseUpload("map")}><ImagePlus size={18} /> Importar mapa original</button>
            <p className="vtt-caption">PNG, JPEG ou WebP · até 80 MB. Guardamos o arquivo original, sem reduzir a resolução.</p>
            <details className="vtt-panel-section"><summary>Transformar mapa</summary><button className="vtt-button vtt-wide" onClick={() => { setSelected("__map__"); setTool("select"); }}>Selecionar mapa no tabuleiro</button>
            <TransformControls frame={mapFrame(scene)} onChange={frame => changeScene(s => ({ ...s, mapTransform: frame }))} />
            </details><details className="vtt-panel-section"><summary>Grade e escala</summary>
            <SwitchRow label={"Mostrar grade"} checked={scene.grid} action={() => changeScene(s => ({ ...s, grid: !s.grid }))} />
            <SwitchRow label={"Encaixar tokens na grade"} checked={scene.snap} action={() => changeScene(s => ({ ...s, snap: !s.snap }))} />
            <div className="vtt-field-pair">{property("Célula (px)", <input type="number" min="16" max="256" value={scene.cell} onChange={e => { const n = Number(e.target.value); if (n >= 16 && n <= 256) changeScene(s => ({ ...s, cell: n })); }} />)}{property("Metros / célula", <input type="number" min=".1" max="100" step=".5" value={scene.unit} onChange={e => { const n = Number(e.target.value); if (n >= .1 && n <= 100) changeScene(s => ({ ...s, unit: n })); }} />)}</div>
            </details><details className="vtt-panel-section"><summary>Backup da mesa</summary><p className="vtt-caption">Este editor salva neste navegador. Exporte uma cópia para levar as cenas e imagens para outro dispositivo.</p>
            <div className="vtt-field-pair"><button className="vtt-button" disabled={busy} onClick={() => void exportProject()}><Download size={15} /> Exportar</button><button className="vtt-button" disabled={busy} onClick={() => chooseUpload("project")}><Upload size={15} /> Importar</button></div>
            {project.scenes.length > 1 && <button className="vtt-danger" onClick={() => setDeletingScene(true)}><Trash2 size={15} /> Excluir cena atual</button>}
            </details>
          </>}
          {panel === "tokens" && <>
            <div className="vtt-panel-heading"><div><span>QUEM ESTÁ NA MESA</span><h2>Tokens</h2></div><button className="vtt-icon" title="Importar tokens" aria-label="Importar tokens" disabled={busy} onClick={() => chooseUpload("token")}><ImagePlus /></button></div>
            <Collections label="tokens" groups={project.tokenGroups} items={scene.tokens} onGroups={tokenGroups => commit(p => ({ ...p, tokenGroups }))} onRemoveGroup={id => commit(p => ({ ...p, tokenGroups: p.tokenGroups.filter(g => g.id !== id), scenes: p.scenes.map(s => ({ ...s, tokens: s.tokens.map(t => t.groupId === id ? { ...t, groupId: null } : t) })) }))} onMove={(id, groupId) => changeScene(s => ({ ...s, tokens: s.tokens.map(t => t.id === id ? { ...t, groupId } : t) }))} render={t => <div className="vtt-token-list"> <button draggable onDragStart={e => libraryDrag(e, { kind: "token", id: t.id })} className={selected === t.id ? "is-active" : ""} key={t.id} onClick={() => { setSelected(t.id); setTool("select"); }}><span className={`vtt-token-avatar ${t.variants.length ? "vtt-token-cutout" : ""}`} style={{ borderColor: t.color }}>{t.variants[t.variant] && assets[t.variants[t.variant].asset] ? <img src={assets[t.variants[t.variant].asset]} alt="" /> : t.name.slice(0, 1)}</span><span><strong>{t.name}</strong><small>{t.variants.length > 1 ? `${t.variants.length} variantes` : t.sheetId ? "Vinculado à ficha" : "Token da cena"}</small></span>{t.hidden && <EyeOff size={14} />}{t.locked && <LockKeyhole size={14} />}</button></div>} />
            {!scene.tokens.length && <p className="vtt-caption">Importe uma imagem ou adicione um personagem para começar.</p>}
            {token ? <div className="vtt-token-inspector"><div className="vtt-divider" /><h3>Token selecionado</h3>{property("Nome do token", <input value={token.name} maxLength={100} onChange={e => patchToken({ name: e.target.value })} />)}
              <CollectionSelect label="Conjunto do token" groups={project.tokenGroups} value={token.groupId} onChange={groupId => patchToken({ groupId })} />
              <SwitchRow label={"Ocultar nome"} checked={!token.showName} action={() => patchToken({ showName: !token.showName })} icon={<EyeOff size={15} />} />
              <label className="vtt-field"><span>Ficha vinculada</span><select value={token.sheetId ?? ""} onChange={e => { const sheet = sheets.find(s => s.id === e.target.value); patchToken({ sheetId: sheet?.id, ownerId: sheet?.ownerId }); }}><option value="">Nenhuma ficha</option>{sheets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              <SwitchRow label="Visão na névoa" checked={token.vision} action={() => patchToken({ vision: !token.vision })} />
              <details className="vtt-panel-section"><summary>Posição e aparência</summary>
              <TransformControls token frame={tokenFrame(token)} onChange={frame => changeScene(s => applyFrame(s, token.id, frame))} onFlip={axis => patchToken(axis === "x" ? { flipX: !token.flipX } : { flipY: !token.flipY })} />
              {property("Cor do marcador sem imagem", <input type="color" value={token.color} onChange={e => patchToken({ color: e.target.value })} />)}
              {property("Condição", <select value={token.condition} onChange={e => patchToken({ condition: e.target.value as Token["condition"] })}>{Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>)}
              <SwitchRow label={"Ocultar na prévia do jogador"} checked={token.hidden} action={() => patchToken({ hidden: !token.hidden })} icon={<EyeOff size={15} />} />
              </details><details className="vtt-panel-section"><summary>Iluminação</summary>
              {token.lightKind === "flashlight" && <label className="vtt-field"><span>Direção padrão da lanterna</span><select value={token.lanternDirection} onChange={e => patchToken({ lanternDirection: e.target.value as Token["lanternDirection"] })}>{Object.entries(LANTERN_DIRECTIONS).map(([key, direction]) => <option key={key} value={key}>{direction.label}</option>)}</select></label>}
              <SwitchRow label={"Luz acompanhando o token"} checked={token.light > 0} action={() => patchToken({ light: token.light ? 0 : LIGHT_PRESETS[token.lightKind].radius })} icon={<Flame size={15} />} />
              {token.light > 0 && <LightControls label="Luz do token" light={{ kind: token.lightKind, radius: token.light, intensity: token.lightIntensity, color: token.lightColor, rotation: token.rotation }} onChange={update => patchToken({ lightKind: update.kind ?? token.lightKind, light: update.radius ?? token.light, lightIntensity: update.intensity ?? token.lightIntensity, lightColor: update.color ?? token.lightColor, rotation: update.rotation ?? token.rotation })} />}
              </details><details className="vtt-panel-section"><summary>Variantes · T</summary><p className="vtt-caption">Troque a aparência sem perder posição, nome ou condições.</p>
              <div className="vtt-variants">{token.variants.map((v, i) => <button key={v.asset} className={token.variant === i ? "is-active" : ""} title={v.name} aria-label={`Usar variante ${v.name}`} aria-pressed={token.variant === i} onClick={() => patchToken({ variant: i })}>{assets[v.asset] ? <img src={assets[v.asset]} alt={v.name} /> : <Users size={18} />}</button>)}<button aria-label="Adicionar variantes ao token" disabled={busy || token.variants.length >= 12} onClick={() => chooseUpload("variant")}><Plus size={18} /></button></div>
              </details>
              <div className="vtt-field-pair"><button className="vtt-button" onClick={duplicateToken}>Duplicar token</button>{token.sheetId && sheets.some(s => s.id === token.sheetId) && <button className="vtt-button" onClick={() => onSheet(token.sheetId!)}>Abrir ficha</button>}</div>
              <button className="vtt-danger" disabled={token.locked} onClick={() => { changeScene(s => ({ ...s, tokens: s.tokens.filter(t => t.id !== token.id) })); setSelected(null); }}><Trash2 size={15} /> Remover da cena</button>
            </div> : <p className="vtt-caption">Selecione um token no mapa para editar sua aparência, luz e condições.</p>}
            <div className="vtt-divider" /><h3><Users size={16} /> Personagens da campanha</h3>{sheets.map(s => <button key={s.id} draggable onDragStart={e => libraryDrag(e, { kind: "character", id: s.id })} className="vtt-character" onClick={() => addCharacter(s)}><span>{s.name}<small>{s.className || (s.type === "monster" ? "Criatura" : "Personagem")}</small></span><Plus size={16} /></button>)}
          </>}
          {panel === "documents" && <><div className="vtt-panel-heading"><div><span>ARQUIVO DA CAMPANHA</span><h2>Documentos</h2></div><FileText /></div><p className="vtt-caption">Organize imagens, prints e documentos em pastas; arraste-os para o mapa ou apresente imagens, PDFs e textos na TV.</p><button className="vtt-primary" onClick={() => { setLibraryDocuments(true); setLibraryOpen(true); }}><FolderOpen size={18} /> Abrir documentos</button></>}
          {panel === "files" && <>
            {item && <div className="vtt-item-inspector"><h3>{item.kind === "document" ? "Documento no tabuleiro" : "Item selecionado"}</h3>{property("Nome do objeto", <input value={item.name} maxLength={160} onChange={e => changeScene(s => ({ ...s, items: s.items.map(i => i.id === item.id ? { ...i, name: e.target.value } : i) }))} />)}<TransformControls frame={item} onChange={frame => changeScene(s => applyFrame(s, item.id, frame))} onFlip={axis => changeScene(s => ({ ...s, items: s.items.map(i => i.id === item.id ? { ...i, ...(axis === "x" ? { flipX: !i.flipX } : { flipY: !i.flipY }) } : i) }))} /><SwitchRow label={"Ocultar nome do objeto"} checked={!item.showName} action={() => changeScene(s => ({ ...s, items: s.items.map(i => i.id === item.id ? { ...i, showName: !i.showName } : i) }))} /><SwitchRow label={"Ocultar objeto do jogador"} checked={item.hidden} action={() => changeScene(s => ({ ...s, items: s.items.map(i => i.id === item.id ? { ...i, hidden: !i.hidden } : i) }))} /><button className="vtt-button vtt-wide" onClick={() => { const file = project.files.find(f => f.asset === item.asset); if (file) openFile(file); }}>Abrir arquivo original</button><button className="vtt-button vtt-wide" onClick={() => { const file = project.files.find(f => f.asset === item.asset); if (file) presentDocument(file); }}>Mostrar na TV</button><button className="vtt-danger" disabled={item.locked} onClick={() => { changeScene(s => ({ ...s, items: s.items.filter(i => i.id !== item.id) })); setSelected(null); }}><Trash2 size={15} /> Remover objeto da cena</button><div className="vtt-divider" /></div>}
            <div className="vtt-panel-heading"><div><span>ORGANIZE SEU UNIVERSO</span><h2>Arquivos</h2></div><FolderOpen /></div><p className="vtt-caption">Uma janela flutuante para organizar, recortar, copiar e arrastar arquivos ao tabuleiro. Arraste o cabeçalho para mover e o canto inferior direito para redimensionar.</p><button className="vtt-primary" onClick={() => setLibraryOpen(true)}><FolderOpen size={18} /> Abrir explorador de arquivos</button>
          </>}
          {panel === "layers" && <>
            <WallInspector scene={scene} selected={selected} onChange={changeScene} onSelect={selectObject} />
            <div className="vtt-panel-heading"><div><span>CADA COISA NO SEU LUGAR</span><h2>Camadas</h2></div><Layers size={20} /></div>
            <p className="vtt-caption">O mapa fica na base. Desenhos, tokens e efeitos permanecem em camadas independentes.</p>
            {([['effects', 'Efeitos e clima', <Sparkles key="e" size={17} />], ['tokens', 'Tokens e personagens', <Users key="t" size={17} />], ['drawings', 'Desenhos e marcações', <Pencil key="d" size={17} />], ['map', 'Mapa de fundo', <Map key="m" size={17} />]] as const).map(([id, label, icon]) => <div className="vtt-layer" key={id}>{icon}<span>{label}</span><button aria-label={`${scene.layers[id] ? "Ocultar" : "Mostrar"} camada ${label}`} onClick={() => changeScene(s => ({ ...s, layers: { ...s.layers, [id]: !s.layers[id] } }))}>{scene.layers[id] ? <Eye size={17} /> : <EyeOff size={17} />}</button></div>)}
            <div className="vtt-divider" /><h3><CloudFog size={16} /> Névoa de guerra</h3><SwitchRow label={"Ativar fog na cena"} checked={scene.fog} action={() => changeScene(s => ({ ...s, fog: !s.fog }))} />
            <p className="vtt-caption">O mestre vê a região oculta escurecida. Use a prévia do jogador para conferir o que fica visível.</p><div className="vtt-field-pair"><button className="vtt-button" onClick={() => { changeScene(s => ({ ...s, fog: true, fogStrokes: [] })); setTool("reveal"); }}>Ocultar tudo</button><button className="vtt-button" onClick={() => changeScene(s => ({ ...s, fog: false }))}>Revelar tudo</button></div>
            <button className="vtt-button vtt-wide" onClick={() => setTool("reveal")}><Eye size={16} /> Revelar com pincel <kbd>F</kbd></button>
            <div className="vtt-divider" /><h3>Paredes e portas</h3><p className="vtt-caption">{quantity(scene.walls.filter(w => !w.door).length, "parede", "paredes")} · {quantity(scene.walls.filter(w => w.door).length, "porta", "portas")}</p>
            {scene.walls.map((w, i) => <div className="vtt-wall-row" key={w.id}><button className="vtt-text" onClick={() => selectObject(`wall:${w.id}`)}>{w.door ? `Porta ${i + 1}` : `Parede ${i + 1}`}{w.locked && <LockKeyhole size={13} />}</button>{w.door && <button className="vtt-text" disabled={w.locked} onClick={() => changeScene(s => ({ ...s, walls: s.walls.map(v => v.id === w.id ? { ...v, open: !v.open } : v) }))}>{w.open ? "Aberta" : "Fechada"}</button>}<button className="vtt-icon" disabled={w.locked} aria-label={`Remover ${w.door ? "porta" : "parede"} ${i + 1}`} onClick={() => changeScene(s => ({ ...s, walls: s.walls.filter(v => v.id !== w.id) }))}><X size={14} /></button></div>)}
            <button className="vtt-danger" disabled={!scene.drawings.length} onClick={() => changeScene(s => ({ ...s, drawings: [] }))}><Trash2 size={15} /> Limpar desenhos</button>
          </>}
          {panel === "atmosphere" && <>
            <div className="vtt-panel-heading"><div><span>DÊ VIDA À CENA</span><h2>Ambiente</h2></div><Sparkles size={20} /></div>
            <h3><Sun size={16} /> Iluminação</h3><div className="vtt-choice-grid">{([{ id: "day", label: "Dia", icon: "☀" }, { id: "dusk", label: "Penumbra", icon: "◐" }, { id: "night", label: "Noite", icon: "☾" }] as const).map(a => <button key={a.id} aria-pressed={scene.ambient === a.id} className={scene.ambient === a.id ? "is-active" : ""} onClick={() => changeScene(s => ({ ...s, ambient: a.id }))}><span>{a.icon}</span>{a.label}</button>)}</div>
            <p className="vtt-caption">Luzes revelam o ambiente e respeitam paredes e portas fechadas. Ative uma tocha no token para levá-la com o personagem.</p><button className="vtt-button vtt-wide" onClick={() => setTool("light")}><Flame size={16} /> Colocar luz no mapa <kbd>L</kbd></button>
            <div className="vtt-light-presets">{(Object.entries(LIGHT_PRESETS) as [LightKind, typeof LIGHT_PRESETS[LightKind]][]).map(([kind, preset]) => <button key={kind} draggable onDragStart={e => libraryDrag(e, { kind: "light", lightKind: kind })} aria-pressed={lightKind === kind} className={lightKind === kind ? "is-active" : ""} onClick={() => { setLightKind(kind); setTool("light"); }}><Flame size={16} /><span>{preset.name}</span><small>Arraste para colocar</small></button>)}</div>
            {scene.lights.map((l, i) => <details className="vtt-light-row" key={l.id} open={selectedLight?.id === l.id}><summary onClick={() => setSelected(`light:${l.id}`)}><Flame size={15} />{LIGHT_PRESETS[l.kind].name} {i + 1}</summary><LightControls label={`Luz ${i + 1}`} light={l} onChange={update => changeScene(s => ({ ...s, lights: s.lights.map(v => v.id === l.id ? { ...v, ...update } : v) }))} /><button className="vtt-danger" aria-label={`Remover luz ${i + 1}`} onClick={() => { changeScene(s => ({ ...s, lights: s.lights.filter(v => v.id !== l.id) })); setSelected(null); }}><Trash2 size={14} /> Remover luz</button></details>)}
            <div className="vtt-divider" /><h3><Sparkles size={16} /> Efeitos animados</h3><div className="vtt-effects">{([{ id: "none", label: "Sem efeito", subtitle: "Só a sua história", glyph: "○" }, { id: "rain", label: "Chuva", subtitle: "Uma noite de investigação", glyph: "╱" }, { id: "snow", label: "Neve", subtitle: "Silêncio e frio", glyph: "❄" }, { id: "embers", label: "Brasas", subtitle: "O calor do desconhecido", glyph: "✦" }, { id: "mist", label: "Névoa", subtitle: "Algo se move lá fora", glyph: "≋" }] as const).map(w => <button key={w.id} draggable onDragStart={e => libraryDrag(e, { kind: "weather", weather: w.id })} className={scene.weather === w.id ? "is-active" : ""} aria-pressed={scene.weather === w.id} onClick={() => changeScene(s => ({ ...s, weather: w.id }))}><i>{w.glyph}</i><span><strong>{w.label}</strong><small>{w.subtitle}</small></span>{scene.weather === w.id && <Check size={16} />}</button>)}</div>
            {scene.weather !== "none" && property(`Intensidade do clima · ${Math.round(scene.weatherIntensity * 100)}%`, <input aria-label="Intensidade do clima" type="range" min="0" max="1" step=".05" value={scene.weatherIntensity} onChange={e => changeScene(s => ({ ...s, weatherIntensity: Number(e.target.value) }))} />)}
            {scene.weather === "mist" && <>{property(`Visão na névoa · ${Math.round(scene.visionRadius / scene.cell * scene.unit * 10) / 10} m`, <input aria-label="Raio de visão na névoa" type="range" min="64" max="1600" step="16" value={scene.visionRadius} onChange={e => changeScene(s => ({ ...s, visionRadius: Number(e.target.value) }))} />)}<p className="vtt-caption">A névoa se dissipa em degradê ao redor dos personagens e acompanha seus movimentos.</p></>}
            <p className="vtt-caption">Efeitos prontos, sem arquivos adicionais. Animações respeitam a preferência de movimento reduzido do dispositivo.</p>
          </>}
        </div>
      </aside>}
    </div>
    {!hudVisible && <div className="vtt-floating-hud"><button className="vtt-icon" aria-label="Mostrar HUD (U)" title="Mostrar HUD · U" onClick={() => setHudVisible(true)}><PanelLeftOpen /></button>{playerView && <button className="vtt-icon" aria-label="Voltar ao mestre" title="Voltar ao mestre" onClick={() => { setPlayerView(false); setHudVisible(true); }}><Eye /></button>}{expanded && <button className="vtt-icon" aria-label="Sair da tela cheia total" title="Sair da tela cheia" onClick={() => void fullscreen()}><X /></button>}</div>}
    {projector && <Projector ref={projectorView} popup={projector} scene={scene} assets={assets} presentation={presentation} onClosed={() => { projectorRef.current = null; setProjector(null); setPresentation(null); }} />}
    <footer className="vtt-footer"><span><span className={`vtt-save ${status}`} role="status" title="Cenas e imagens ficam neste navegador"><Save size={14} />{status === "saved" ? "Salva" : status === "saving" ? "Salvando…" : "Falha ao salvar"}</span><i /> Editor local <i />{quantity(scene.tokens.length, "token", "tokens")} <i />{scene.width.toLocaleString("pt-BR")} × {scene.height.toLocaleString("pt-BR")} px</span><span><kbd>R</kbd> girar <kbd>T</kbd> variante <kbd>Ctrl Z</kbd> desfazer <button className="vtt-text" onClick={() => setHelp(true)}>Todos os atalhos</button></span></footer>
    {expanded && hudVisible && <span className={`vtt-floating-save ${status}`} role="status" title="Cenas e imagens ficam neste navegador"><Save size={14} />{status === "saved" ? "Salva" : status === "saving" ? "Salvando…" : "Falha ao salvar"}</span>}
    {libraryOpen && !playerView && hudVisible && <FloatingWindow title={libraryDocuments ? "Documentos" : "Explorador de arquivos"} onClose={() => setLibraryOpen(false)}><AssetLibrary key={libraryDocuments ? "documents" : "all"} documentsOnly={libraryDocuments} project={project} assets={assets} busy={busy} onChange={commit} onUpload={(folderId, kind) => { libraryDestination.current = { folderId, kind }; chooseUpload("library"); }} onPlace={file => placeFile(file)} onOpen={openFile} onPresent={presentDocument} /></FloatingWindow>}
    {menuToken && tokenMenu && <TokenMenu key={menuToken.id} token={menuToken} sheet={sheets.find(s => s.id === menuToken.sheetId)} sheets={sheets} x={tokenMenu.x} y={tokenMenu.y} maxHeight={tokenMenu.maxHeight} disabled={playerView || sheetBusy} onDelete={() => deleteObject(menuToken.id)} onClose={() => setTokenMenu(null)} onInfo={() => { setInfoToken(menuToken.id); setTokenMenu(null); }} onResource={onResource} onPatch={patch => changeScene(s => ({ ...s, tokens: s.tokens.map(t => t.id === menuToken.id ? { ...t, ...patch } : t) }))} />}
    {!menuToken && tokenMenu && !playerView && sceneObject(scene, tokenMenu.id) && <ObjectMenu scene={scene} id={tokenMenu.id} x={tokenMenu.x} y={tokenMenu.y} maxHeight={tokenMenu.maxHeight} onChange={changeScene} onClose={() => setTokenMenu(null)} onDelete={() => deleteObject(tokenMenu.id)} onInspect={() => selectObject(tokenMenu.id)} onSelect={id => { setSelected(id); setTokenMenu({ ...tokenMenu, id }); }} />}
    {detailToken && <Modal title={detailSheet?.name ?? detailToken.name} subtitle={detailSheet ? `NEX ${detailSheet.exposure}% · ${detailSheet.className}` : "Token personalizado"} onClose={() => setInfoToken(null)}><p style={{ whiteSpace: "pre-wrap" }}>{detailSheet?.description || "Este token não possui uma descrição de ficha vinculada."}</p>{detailSheet && <><p>Defesa: {detailSheet.defense} · Vida: {detailSheet.resources.hp.current}/{detailSheet.resources.hp.max} · PE: {detailSheet.resources.ep.current}/{detailSheet.resources.ep.max} · Sanidade: {detailSheet.resources.sanity.current}/{detailSheet.resources.sanity.max}</p><button className="vtt-primary" onClick={() => onSheet(detailSheet.id)}>Abrir ficha completa</button></>}<p className="vtt-caption">Aparência: {detailToken.variants[detailToken.variant]?.name || "Marcador"} · Luz: {detailToken.light ? LIGHT_PRESETS[detailToken.lightKind].name : "Desativada"}</p></Modal>}
    {(error || notice) && <div className={`vtt-notice ${error ? "is-error" : ""}`} role={error ? "alert" : "status"}><span>{error || notice}</span><button aria-label="Fechar aviso" onClick={() => { setError(""); setNotice(""); }}><X size={16} /></button></div>}
    {deletingScene && <Modal title="Excluir esta cena?" subtitle={scene.name} onClose={() => setDeletingScene(false)}><p>Os objetos desta cena serão removidos. Os arquivos da biblioteca serão preservados, e você poderá recuperar a cena com Desfazer nesta sessão.</p><div className="vtt-field-pair"><button className="vtt-button" onClick={() => setDeletingScene(false)}>Cancelar</button><button className="vtt-danger" onClick={() => { commit(p => ({ ...p, active: p.scenes.find(s => s.id !== p.active)!.id, scenes: p.scenes.filter(s => s.id !== p.active) })); setSelected(null); setDeletingScene(false); }}>Confirmar exclusão da cena</button></div></Modal>}
    {help && <Modal title="O próximo capítulo começa aqui." subtitle="Sua mesa, sem complicação." onClose={() => setHelp(false)}><p>Importe um mapa e organize imagens e documentos em Arquivos. Arraste arquivos, personagens e ferramentas do HUD para o tabuleiro. Selecione um objeto e use as alças para redimensionar ou girar; o painel permite ajustes exatos. Desbloqueie o mapa antes de transformá-lo.</p><div className="vtt-help-keys">{TOOLS.map(t => <div key={t.id}>{t.icon}<span>{t.label}</span><kbd>{t.key}</kbd></div>)}<div><span>Girar / girar no sentido inverso</span><kbd>R / Shift R</kbd></div><div><span>Espelhar na horizontal / vertical</span><kbd>X / Y</kbd></div><div><span>Mostrar / ocultar HUD</span><kbd>U</kbd></div><div><span>Lanterna do token selecionado</span><kbd>L</kbd></div><div><span>Escolher variante sobre o token</span><kbd>Segurar T</kbd></div><div><span>Mover token / ajuste fino</span><kbd>Setas / Shift</kbd></div><div><span>Desfazer / refazer</span><kbd>Ctrl Z / Ctrl Shift Z</kbd></div></div><p className="vtt-caption">As cenas e os arquivos são salvos neste navegador, separados por conta e campanha. Exporte uma cópia para manter um backup. Esta versão não sincroniza dispositivos nem conecta outros jogadores; a prévia do jogador é apenas uma simulação visual local, com o HUD oculto inicialmente. Use tela cheia nativa ou o modo imersivo com F11. O navegador controla a saída por Esc da tela cheia nativa.</p><button className="vtt-primary" onClick={() => setHelp(false)}>Vamos jogar</button></Modal>}
  </section>;
}

"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import type { Campaign, Sheet, User } from "../lib/game/types";
import { ASSET_MIME_TYPES, MAX_ASSET_BYTES, type Asset } from "../lib/game/media";
import { requestMedia } from "../lib/game/media-client";
import { ASSETS_CHANGED_EVENT } from "../lib/game/use-campaign-realtime";
import { browserSupabase } from "../lib/auth/browser";
import { Button, Field, SectionTitle } from "./ui";

const kindLabels = { portrait: "Retrato", token: "Token", map: "Mapa" };
const visibilityLabels = { owner: "Dono da ficha e mestre", gm: "Somente mestre", table: "Toda a mesa" };
export default function CampaignAssets({ campaign, sheets, user, onRefresh }: { campaign: Campaign; sheets: Sheet[]; user: User; onRefresh: () => Promise<void> }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [kind, setKind] = useState<Asset["kind"]>("portrait");
  const [visibility, setVisibility] = useState<Asset["visibility"]>("owner");
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const generation = useRef(0), mounted = useRef(true), locked = useRef(false);
  const gm = campaign.role === "gm";
  const load = useCallback(async () => {
    const current = ++generation.current;
    try {
      const data = await requestMedia({ action: "media_list", campaignId: campaign.id }, user.id);
      if (mounted.current && current === generation.current) { setAssets(data.assets || []); setError(""); }
    } catch (e) {
      if (mounted.current && current === generation.current) { setAssets([]); setError(e instanceof Error ? e.message : "Não foi possível carregar os arquivos."); }
    } finally { if (mounted.current && current === generation.current) setLoading(false); }
  }, [campaign.id, user.id]);
  useEffect(() => {
    mounted.current = true;
    void load();
    const changed = () => { if (!locked.current) void load(); };
    const timer = setInterval(changed, 20000);
    window.addEventListener(ASSETS_CHANGED_EVENT, changed);
    return () => { mounted.current = false; ++generation.current; clearInterval(timer); window.removeEventListener(ASSETS_CHANGED_EVENT, changed); };
  }, [load]);
  async function run(operation: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(""); setMessage("");
    try { await operation(); }
    catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : "Não foi possível confirmar a operação. Atualize os arquivos antes de tentar novamente."); }
    finally { locked.current = false; if (mounted.current) { setBusy(false); void load(); } }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, values = new FormData(form), file = values.get("file");
    if (!(file instanceof File) || !file.size) { setError("Escolha uma imagem."); return; }
    if (!(ASSET_MIME_TYPES as readonly string[]).includes(file.type) || file.size > MAX_ASSET_BYTES) { setError("Use PNG, JPEG ou WebP com até 10 MB."); return; }
    await run(async () => {
      const created = await requestMedia({ action: "media_create", campaignId: campaign.id, sheetId: kind === "map" ? null : String(values.get("sheetId")), kind, visibility: gm ? visibility : "owner", title: String(values.get("title")).trim(), originalName: file.name, mimeType: file.type as typeof ASSET_MIME_TYPES[number], sizeBytes: file.size }, user.id);
      if (!created.asset || !created.upload) throw new Error("O envio não foi preparado. Atualize os arquivos e tente novamente.");
      const client = await browserSupabase();
      const { error: uploadError } = await client.storage.from(created.upload.bucket).uploadToSignedUrl(created.upload.path, created.upload.token, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        // Best-effort cleanup is scoped to the reservation this request created.
        await requestMedia({ action: "media_delete", assetId: created.asset.id }, user.id).catch(() => {});
        throw new Error("O envio não terminou. Atualize os arquivos antes de tentar novamente.");
      }
      await requestMedia({ action: "media_confirm", assetId: created.asset.id }, user.id);
      if (mounted.current) { form.reset(); setMessage("Imagem salva na campanha."); }
    });
  }
  return <section className="campaign-assets section-gap" aria-labelledby="assets-title">
    <SectionTitle title="Imagens da mesa" subtitle="Retratos, tokens e mapas com acesso por campanha." />
    <div className="assets-heading"><h3 id="assets-title">Arquivos da campanha</h3><Button variant="ghost" disabled={busy} onClick={() => void load()}><RefreshCw size={15} /> Atualizar</Button></div>
    {error && <p role="alert" className="auth-error">{error}</p>}
    {message && <p role="status" className="auth-message">{message}</p>}
    {loading ? <p role="status" className="muted">Carregando imagens…</p> : !assets.length ? <p className="muted">Nenhuma imagem disponível para você nesta campanha.</p> : <div className="asset-grid">
      {assets.map((asset) => {
        const sheet = sheets.find((s) => s.id === asset.sheetId);
        const manages = gm || (asset.ownerId === user.id && asset.visibility !== "gm");
        return <article className="asset-card" key={asset.id}>
          {asset.status === "ready" ? <a href={`/api/media/image?assetId=${asset.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${asset.title}`}><img src={`/api/media/image?assetId=${asset.id}`} alt={asset.title} loading="lazy" referrerPolicy="no-referrer" /></a> : <div className="asset-placeholder">{asset.status === "pending" ? "Envio aguardando confirmação" : "Exclusão pendente"}</div>}
          <div><strong>{asset.title}</strong><small>{kindLabels[asset.kind]} · {visibilityLabels[asset.visibility]}</small>{sheet && <small>{sheet.name}</small>}</div>
          {manages && <div className="asset-actions">
            {asset.status === "pending" && <Button variant="secondary" disabled={busy} onClick={() => void run(async () => {
              await requestMedia({ action: "media_confirm", assetId: asset.id }, user.id);
              if (mounted.current) setMessage("Envio confirmado.");
            })}>Confirmar envio</Button>}
            {asset.status === "ready" && asset.kind === "portrait" && sheet && sheet.portraitAssetId !== asset.id && <Button variant="secondary" disabled={busy} onClick={() => void run(async () => {
              await requestMedia({ action: "media_portrait", assetId: asset.id, sheetId: sheet.id, version: sheet.version }, user.id);
              await onRefresh(); if (mounted.current) setMessage("Retrato atualizado na ficha.");
            })}>Usar na ficha</Button>}
            <Button variant="ghost" disabled={busy} aria-label={`Excluir ${asset.title}`} onClick={() => {
              if (window.confirm(`Excluir a imagem “${asset.title}”?`)) void run(async () => {
                await requestMedia({ action: "media_delete", assetId: asset.id }, user.id);
                await onRefresh(); if (mounted.current) setMessage("Imagem excluída.");
              });
            }}><Trash2 size={16} /></Button>
          </div>}
        </article>;
      })}
    </div>}
    {(gm || sheets.length > 0) && <form className="asset-upload" onSubmit={upload}>
      <h3><ImagePlus size={18} /> Adicionar imagem</h3>
      <div className="asset-fields">
        <Field label="Tipo"><select value={kind} disabled={busy} onChange={(e) => { const next = e.target.value as Asset["kind"]; setKind(next); setVisibility(next === "map" ? "gm" : "owner"); }}><option value="portrait">Retrato</option><option value="token">Token</option>{gm && <option value="map">Mapa</option>}</select></Field>
        {kind !== "map" && <Field label="Ficha"><select name="sheetId" required disabled={busy}>{sheets.map((s) => <option key={s.id} value={s.id}>{s.name}{s.type === "monster" ? " (criatura)" : ""}</option>)}</select></Field>}
        {gm && <Field label="Quem pode ver"><select value={visibility} disabled={busy} onChange={(e) => setVisibility(e.target.value as Asset["visibility"])}><option value="owner">Dono da ficha e mestre</option><option value="gm">Somente mestre</option><option value="table">Toda a mesa</option></select></Field>}
        <Field label="Título"><input name="title" required minLength={1} maxLength={100} disabled={busy} placeholder="Ex.: Retrato do investigador" /></Field>
        <Field label="Imagem" hint="PNG, JPEG ou WebP · até 10 MB"><input name="file" type="file" accept={ASSET_MIME_TYPES.join(",")} required disabled={busy} /></Field>
      </div>
      {gm && <p className="muted">Imagens de criaturas ficam sempre restritas ao mestre.</p>}
      <Button type="submit" disabled={busy || (kind !== "map" && !sheets.length)}>{busy ? "Salvando…" : "Enviar imagem"}</Button>
    </form>}
  </section>;
}

"use client";
import { useEffect, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import type { Campaign, SystemId, User } from "../lib/game/types";
import { importCampaigns, MAX_SHEET_IMPORT_BYTES, parseSheetImport, type SheetImport } from "../lib/game/sheet-import";
import { systemById } from "../lib/game/systems";
import { Button, Field, Modal } from "./ui";

export default function ImportSheetForm({ campaigns, initialCampaignId, user, busy, onClose, onImport, onCreateCampaign }: {
  campaigns: Campaign[];
  initialCampaignId?: string;
  user: User;
  busy: boolean;
  onClose: () => void;
  onImport: (value: { document: SheetImport; campaignId: string; ownerId: string; name: string }) => Promise<boolean>;
  onCreateCampaign: (system: SystemId) => void;
}) {
  const [document, setDocument] = useState<SheetImport | null>(null);
  const [fileName, setFileName] = useState("");
  const [name, setName] = useState("");
  const [campaignId, setCampaignId] = useState(initialCampaignId || "");
  const [ownerId, setOwnerId] = useState(user.id);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current += 1; }, []);
  const eligible = document ? importCampaigns(document, campaigns) : [];
  const campaign = eligible.find((c) => c.id === campaignId) || eligible[0];
  const canChooseOwner = campaign?.role === "gm" && document?.sheet.type === "character";
  const selectedOwnerId = canChooseOwner && campaign.members.some((m) => m.id === ownerId) ? ownerId : user.id;
  return (
    <Modal title="Importar ficha JSON" subtitle="Recupere uma ficha exportada pelo Nexo em uma campanha do mesmo sistema." onClose={onClose}>
      <form onSubmit={async (event) => {
        event.preventDefault();
        if (!document || !campaign || !name.trim() || reading || busy) return;
        setError("");
        if (!await onImport({ document, campaignId: campaign.id, ownerId: selectedOwnerId, name: name.trim() }))
          setError("A importação não foi confirmada. Sincronize e confira suas fichas antes de tentar novamente.");
      }}>
        <div className="modal-body import-sheet-body">
          <Field label="Arquivo JSON do Nexo">
            <input type="file" accept=".json,application/json" disabled={busy} aria-describedby="import-file-hint" onChange={async (event) => {
              const file = event.target.files?.[0];
              const token = ++sequence.current;
              setDocument(null);
              setError("");
              setFileName(file?.name || "");
              setReading(false);
              if (!file) return;
              event.target.value = "";
              if (file.size > MAX_SHEET_IMPORT_BYTES) { setError("O arquivo ultrapassa o limite de 128 KB."); return; }
              setReading(true);
              try {
                const parsed = parseSheetImport(await file.text());
                if (token !== sequence.current) return;
                setDocument(parsed);
                setName(parsed.sheet.name);
                setCampaignId(initialCampaignId || "");
                setOwnerId(user.id);
              } catch (failure) {
                if (token === sequence.current) setError(failure instanceof Error ? failure.message : "Não foi possível ler o arquivo.");
              } finally {
                if (token === sequence.current) setReading(false);
              }
            }} />
          </Field>
          <p id="import-file-hint" className="import-hint">Use o arquivo obtido em “Exportar ficha em JSON”. Limite: 128 KB.</p>
          {reading && <p role="status">Lendo e validando a ficha…</p>}
          {document && <>
            <div className="import-summary" role="status">
              <FileUp size={24} aria-hidden="true" />
              <div><strong>{document.sheet.name}</strong><p>{systemById(document.sheet.system).name}</p><span>{document.sheet.type === "monster" ? "Criatura privada do mestre" : "Personagem"}</span><small>{fileName}</small></div>
            </div>
            {campaign ? <>
              <Field label="Nome da nova ficha"><input required maxLength={100} value={name} disabled={busy} onChange={(event) => setName(event.target.value)} /></Field>
              <Field label="Campanha de destino"><select value={campaign.id} disabled={busy} onChange={(event) => { setCampaignId(event.target.value); setOwnerId(user.id); }}>{eligible.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              {canChooseOwner && <Field label="Dono da nova ficha"><select value={selectedOwnerId} disabled={busy} onChange={(event) => setOwnerId(event.target.value)}>{campaign.members.map((member) => <option key={member.id} value={member.id}>{member.name}{member.id === user.id ? " (você)" : ""}</option>)}</select></Field>}
              <p className="import-notice">Será criada uma nova ficha, mesmo que já exista outra com esse nome. Os recursos atuais e as anotações do arquivo serão preservados.</p>
              <p className="import-hint">Envie o retrato novamente após importar. A nova ficha começa com o histórico de rolagens vazio.</p>
            </> : <div className="import-no-campaign"><p>Você precisa de uma campanha de {systemById(document.sheet.system).name}{document.sheet.type === "monster" ? " em que seja mestre" : ""} para importar esta ficha.</p><Button type="button" variant="secondary" onClick={() => onCreateCampaign(document.sheet.system)}>Criar campanha compatível</Button></div>}
          </>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <div className="modal-footer">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={busy || reading || !document || !campaign || !name.trim()}><FileUp size={17} />{busy ? "Importando…" : "Importar como nova ficha"}</Button>
        </div>
      </form>
    </Modal>
  );
}

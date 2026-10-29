"use client";
import { useState } from "react";
import { Copy } from "lucide-react";
import type { Campaign, Sheet } from "../lib/game/types";
import { Button, Field, Modal, Portrait } from "./ui";

export default function DuplicateSheetForm({ sheet, campaign, suggestedName, busy, onClose, onDuplicate }: {
  sheet: Sheet;
  campaign: Campaign;
  suggestedName: string;
  busy: boolean;
  onClose: () => void;
  onDuplicate: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState(suggestedName);
  const [error, setError] = useState("");
  return (
    <Modal title="Duplicar ficha" subtitle="Crie uma nova ficha com os valores salvos da original." onClose={onClose}>
      <form onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !name.trim()) return;
        setError("");
        if (!await onDuplicate(name.trim())) setError("A cópia não foi confirmada. Sincronize e confira suas fichas antes de tentar novamente.");
      }}>
        <div className="modal-body">
          <div className="duplicate-source">
            <Portrait sheet={sheet} size="small" />
            <div>
              <strong>{sheet.name}</strong>
              <p>{campaign.name} · {sheet.type === "monster" ? "Criatura privada do mestre" : "Personagem"}</p>
              <span>Dono da cópia: {sheet.ownerName}</span>
            </div>
          </div>
          <Field label="Nome da cópia">
            <input autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <p className="duplicate-description">Atributos, recursos atuais, ataques, técnicas, rituais, inventário e anotações serão copiados para a mesma campanha. A nova ficha começa com seu próprio histórico de rolagens.</p>
          {sheet.portraitAssetId && <p className="duplicate-description">As duas fichas usarão a mesma imagem de retrato. Excluir essa imagem remove o retrato de ambas.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <div className="modal-footer">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={busy || !name.trim()}><Copy size={17} />{busy ? "Duplicando…" : "Criar cópia"}</Button>
        </div>
      </form>
    </Modal>
  );
}

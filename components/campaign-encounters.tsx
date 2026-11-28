"use client";
import { useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Flag, Play, Plus, SkipForward } from "lucide-react";
import type { Campaign, Encounter, Sheet } from "../lib/game/types";
import { MAX_ENCOUNTER_PARTICIPANTS, parseEncounterDraft, type EncounterDraft } from "../lib/game/encounters";
import { Button, Field, Modal } from "./ui";
import ConditionControls from "./encounter-conditions";

const statusLabels: Record<Encounter["status"], string> = { draft: "Em preparação", active: "Em andamento", finished: "Encerrado" };

function EncounterForm({ sheets, encounter, busy, onClose, onSave }: {
  sheets: Sheet[];
  encounter?: Encounter;
  busy: boolean;
  onClose: () => void;
  onSave: (draft: EncounterDraft) => Promise<boolean>;
}) {
  const [name, setName] = useState(encounter?.name ?? "Novo encontro");
  const [participants, setParticipants] = useState<Array<{ sheetId: string; initiative: string }>>(
    encounter?.participants.map((participant) => ({ sheetId: participant.sheetId, initiative: String(participant.initiative) })) ?? [],
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const available = sheets.filter((sheet) => !participants.some((participant) => participant.sheetId === sheet.id));
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const nextSheetId = available.some((sheet) => sheet.id === selectedSheetId) ? selectedSheetId : available[0]?.id ?? "";
  const locked = busy || saving;
  const byId = new Map(sheets.map((sheet) => [sheet.id, sheet]));

  function move(index: number, delta: number) {
    setParticipants((current) => {
      const copy = [...current];
      [copy[index], copy[index + delta]] = [copy[index + delta], copy[index]];
      return copy;
    });
  }

  return (
    <Modal title={encounter ? "Editar encontro" : "Criar encontro"} subtitle="Informe a iniciativa de cada participante. A ordem abaixo desempata valores iguais." onClose={onClose} wide>
      <form onSubmit={async (event) => {
        event.preventDefault();
        if (locked || pending.current) return;
        setError("");
        let draft: EncounterDraft;
        try {
          if (participants.some((participant) => !participant.initiative.trim())) throw new Error("Informe a iniciativa de todos os participantes.");
          draft = parseEncounterDraft({ name, participants: participants.map((participant) => ({ sheetId: participant.sheetId, initiative: Number(participant.initiative) })) });
        } catch {
          setError("Informe um nome e de 1 a 60 participantes, com iniciativas inteiras entre -999 e 999.");
          return;
        }
        pending.current = true;
        setSaving(true);
        try {
          if (!await onSave(draft)) setError("O encontro não foi salvo. Confira a sincronização antes de tentar novamente.");
        } finally {
          pending.current = false;
          setSaving(false);
        }
      }}>
        <div className="modal-body encounter-form">
          <Field label="Nome do encontro"><input autoFocus required maxLength={100} value={name} disabled={locked} onChange={(event) => setName(event.target.value)} /></Field>
          <div className="encounter-add-participant">
            <Field label="Adicionar participante">
              <select value={nextSheetId} disabled={locked || !available.length || participants.length >= MAX_ENCOUNTER_PARTICIPANTS} onChange={(event) => setSelectedSheetId(event.target.value)}>
                {!available.length && <option value="">Nenhuma outra ficha disponível</option>}
                {available.map((sheet) => <option key={sheet.id} value={sheet.id}>{sheet.name} · {sheet.type === "monster" ? "Criatura / NPC" : "Personagem"}</option>)}
              </select>
            </Field>
            <Button type="button" variant="secondary" disabled={locked || !nextSheetId || participants.length >= MAX_ENCOUNTER_PARTICIPANTS} onClick={() => {
              setParticipants((current) => [...current, { sheetId: nextSheetId, initiative: "0" }]);
              setError("");
            }}><Plus size={17} aria-hidden="true" />Adicionar</Button>
          </div>
          <p className="encounter-hint">Selecione até {MAX_ENCOUNTER_PARTICIPANTS} fichas desta campanha. Iniciativas maiores agem primeiro; use as setas para desempatar.</p>
          {participants.length ? <ol className="encounter-draft-list">
            {participants.map((participant, index) => {
              const participantName = byId.get(participant.sheetId)?.name ?? encounter?.participants.find((item) => item.sheetId === participant.sheetId)?.name ?? "Ficha removida";
              return <li key={participant.sheetId}>
                <strong>{participantName}{!byId.has(participant.sheetId) && <small>Ficha removida: retire este participante para salvar.</small>}</strong>
                <Field label={`Iniciativa de ${participantName}`}><input type="number" min={-999} max={999} step={1} required value={participant.initiative} disabled={locked} onChange={(event) => setParticipants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, initiative: event.target.value } : item))} /></Field>
                <div className="encounter-order-actions">
                  <Button type="button" variant="ghost" aria-label={`Subir ${participantName} na ordem de desempate`} disabled={locked || index === 0} onClick={() => move(index, -1)}><ArrowUp size={17} aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" aria-label={`Descer ${participantName} na ordem de desempate`} disabled={locked || index === participants.length - 1} onClick={() => move(index, 1)}><ArrowDown size={17} aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" aria-label={`Remover ${participantName} do encontro`} disabled={locked} onClick={() => setParticipants((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remover</Button>
                </div>
              </li>;
            })}
          </ol> : <p className="encounter-hint">Adicione ao menos um participante para salvar o encontro.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <div className="modal-footer">
          <Button type="button" variant="secondary" disabled={locked} onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={locked || !participants.length}>{locked ? "Salvando…" : "Salvar encontro"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CampaignEncounters({ campaign, sheets, encounters = [], busy, onAction }: {
  campaign: Campaign;
  sheets: Sheet[];
  encounters?: Encounter[];
  busy: boolean;
  onAction: (input: Record<string, unknown>) => Promise<unknown>;
}) {
  const selectId = useId();
  const [selectedId, setSelectedId] = useState("");
  const [editor, setEditor] = useState<{ encounter?: Encounter } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const list = encounters.filter((encounter) => encounter.campaignId === campaign.id);
  const current = list.find((encounter) => encounter.id === selectedId) ?? list[0];
  const campaignSheets = sheets.filter((sheet) => sheet.campaignId === campaign.id);
  const byId = new Map(campaignSheets.map((sheet) => [sheet.id, sheet]));
  const currentName = current?.participants.find((participant) => participant.sheetId === current.currentParticipantId)?.name;
  const locked = busy || saving;

  async function act(input: Record<string, unknown>) {
    if (busy || pending.current) return null;
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await onAction(input);
      if (!result) setError("A alteração não foi confirmada. Sincronize antes de repetir.");
      return result;
    } catch {
      setError("A alteração não foi confirmada. Sincronize antes de repetir.");
      return null;
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  if (campaign.role !== "gm") return null;

  return (
    <section className="campaign-encounters" aria-label="Encontros da campanha">
      <div className="encounter-heading">
        <div><h2>Iniciativa e turnos</h2><p>Encontros privados do mestre.</p></div>
        <Button type="button" variant="secondary" disabled={locked || !campaignSheets.length} onClick={() => setEditor({})}><Plus size={17} aria-hidden="true" />Criar encontro</Button>
      </div>
      {!campaignSheets.length && <p className="encounter-hint">Crie fichas de personagens, criaturas ou NPCs para preparar um encontro.</p>}
      {list.length ? <>
        <label className="encounter-select" htmlFor={selectId}>Encontro
          <select id={selectId} value={current?.id ?? ""} disabled={locked} onChange={(event) => { setSelectedId(event.target.value); setError(""); }}>
            {list.map((encounter) => <option key={encounter.id} value={encounter.id}>{encounter.name} · {statusLabels[encounter.status]}</option>)}
          </select>
        </label>
        {current && <div className="encounter-detail">
          <div className="encounter-state" role="status" aria-live="polite" aria-atomic="true">
            <strong>{current.name}</strong><span>{statusLabels[current.status]}</span>
            {current.status !== "draft" && <span>Rodada {current.round}</span>}
            {current.status === "active" && <b>Vez de {byId.get(current.currentParticipantId ?? "")?.name ?? currentName}</b>}
          </div>
          <ol className="encounter-turn-list" aria-label={`Ordem de ${current.name}`}>
            {current.participants.map((participant) => <li key={participant.sheetId} className={participant.sheetId === current.currentParticipantId ? "is-current" : ""} aria-current={participant.sheetId === current.currentParticipantId ? "step" : undefined}>
              <span className="encounter-initiative" aria-label={`Iniciativa ${participant.initiative}`}>{participant.initiative}</span>
              <div className="encounter-participant-details"><strong>{byId.get(participant.sheetId)?.name ?? participant.name}</strong>{!byId.has(participant.sheetId) && <small>Ficha removida; registro do encontro preservado.</small>}</div>
              {participant.sheetId === current.currentParticipantId && <span className="encounter-current-label">Turno atual</span>}
              <ConditionControls
                key={`${current.id}:${participant.sheetId}`}
                participantName={byId.get(participant.sheetId)?.name ?? participant.name}
                conditions={participant.conditions}
                disabled={locked || current.status === "finished"}
                onAdd={async (name, remainingRounds) => Boolean(await act({ action: "add_condition", campaignId: campaign.id, encounterId: current.id, version: current.version, sheetId: participant.sheetId, condition: { name, remainingRounds } }))}
                onRemove={async (conditionId) => Boolean(await act({ action: "remove_condition", campaignId: campaign.id, encounterId: current.id, version: current.version, sheetId: participant.sheetId, conditionId }))}
              />
            </li>)}
          </ol>
          <div className="encounter-controls">
            {current.status === "draft" && <>
              <Button type="button" variant="secondary" disabled={locked} onClick={() => setEditor({ encounter: current })}>Editar participantes</Button>
              <Button type="button" disabled={locked} onClick={() => void act({ action: "start_encounter", campaignId: campaign.id, encounterId: current.id, version: current.version })}><Play size={17} aria-hidden="true" />Iniciar encontro</Button>
            </>}
            {current.status === "active" && <>
              <Button type="button" disabled={locked} onClick={() => void act({ action: "advance_turn", campaignId: campaign.id, encounterId: current.id, version: current.version })}><SkipForward size={17} aria-hidden="true" />Próximo turno</Button>
              <Button type="button" variant="secondary" disabled={locked} onClick={() => void act({ action: "finish_encounter", campaignId: campaign.id, encounterId: current.id, version: current.version })}><Flag size={17} aria-hidden="true" />Encerrar encontro</Button>
            </>}
          </div>
        </div>}
      </> : <p className="encounter-hint">Nenhum encontro salvo nesta campanha.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {editor && <EncounterForm key={editor.encounter?.id ?? "new"} sheets={campaignSheets} encounter={editor.encounter} busy={locked} onClose={() => setEditor(null)} onSave={async (draft) => {
        const result = await act({ action: editor.encounter ? "update_encounter" : "create_encounter", campaignId: campaign.id, ...(editor.encounter ? { encounterId: editor.encounter.id, version: editor.encounter.version } : {}), ...draft });
        if (!result) return false;
        if (typeof result === "object" && "id" in result && typeof result.id === "string") setSelectedId(result.id);
        setEditor(null);
        return true;
      }} />}
    </section>
  );
}

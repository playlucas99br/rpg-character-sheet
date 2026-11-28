import { z } from "zod";
import type { Encounter, EncounterParticipant, Workspace } from "./types";
import { randomId } from "./id";
import { advanceEncounter, finishEncounter, isEncounterAction, parseEncounterDraft, startEncounter } from "./encounters";
import { changeEncounterCondition, preserveParticipantConditions } from "./conditions";

/** Demo writes share combat rules with the API, but stay in the cloned local workspace. */
export function mutateDemoEncounter(state: Workspace, input: Record<string, unknown>): { id: string } {
  if (!isEncounterAction(input.action)) throw new Error("Ação de encontro inválida.");
  const campaign = state.campaigns.find((item) => item.id === input.campaignId);
  if (campaign?.role !== "gm") throw new Error("Somente o mestre desta campanha pode conduzir encontros.");
  const now = new Date().toISOString();
  const participants = (): EncounterParticipant[] => parseEncounterDraft(input).participants.map((participant) => {
    const sheet = state.sheets.find((item) => item.id === participant.sheetId && item.campaignId === campaign.id);
    if (!sheet) throw new Error("Todos os participantes precisam ter uma ficha nesta campanha.");
    return { ...participant, name: sheet.name };
  });
  state.encounters ??= [];
  if (input.action === "create_encounter") {
    const draft = parseEncounterDraft(input);
    const encounter: Encounter = { id: randomId(), campaignId: campaign.id, name: draft.name, participants: participants(), status: "draft", round: 0, currentParticipantId: null, version: 1, updatedAt: now };
    state.encounters.unshift(encounter);
    return { id: encounter.id };
  }
  const index = state.encounters.findIndex((item) => item.id === input.encounterId && item.campaignId === campaign.id);
  if (index < 0) throw new Error("Encontro não encontrado.");
  const previous = state.encounters[index];
  const version = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).parse(input.version);
  if (previous.version !== version) throw new Error("O encontro mudou. Sincronize antes de repetir a ação.");
  let next: Encounter;
  if (input.action === "update_encounter") {
    if (previous.status !== "draft") throw new Error("Os participantes só podem ser editados enquanto o encontro está em preparação.");
    next = { ...previous, name: parseEncounterDraft(input).name, participants: preserveParticipantConditions(participants(), previous.participants) };
  } else if (input.action === "add_condition" || input.action === "remove_condition") {
    next = changeEncounterCondition(previous, input);
  } else if (input.action === "start_encounter") next = startEncounter(previous);
  else if (input.action === "advance_turn") next = advanceEncounter(previous);
  else next = finishEncounter(previous);
  state.encounters[index] = { ...next, version: version + 1, updatedAt: now };
  return { id: previous.id };
}

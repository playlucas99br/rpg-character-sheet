import { z } from "zod";
import { GameError } from "./errors.ts";
import type { Encounter, EncounterParticipant } from "./types";
import { tickRoundConditions } from "./conditions.ts";

export const MAX_ENCOUNTER_PARTICIPANTS = 60;
export const ENCOUNTER_ACTIONS = ["create_encounter", "update_encounter", "start_encounter", "advance_turn", "finish_encounter", "add_condition", "remove_condition"] as const;
export function isEncounterAction(action: unknown): action is typeof ENCOUNTER_ACTIONS[number] {
  return typeof action === "string" && (ENCOUNTER_ACTIONS as readonly string[]).includes(action);
}
export const encounterDraftSchema = z.object({
  name: z.string().trim().min(1).max(100),
  participants: z.array(z.object({
    sheetId: z.string().trim().min(1).max(100),
    initiative: z.number().int().min(-999).max(999),
  })).min(1).max(MAX_ENCOUNTER_PARTICIPANTS),
}).superRefine((draft, context) => {
  if (new Set(draft.participants.map((participant) => participant.sheetId)).size !== draft.participants.length) {
    context.addIssue({ code: "custom", path: ["participants"], message: "Uma ficha só pode participar uma vez do encontro." });
  }
});

export type EncounterDraft = z.infer<typeof encounterDraftSchema>;

export function parseEncounterDraft(input: unknown): EncounterDraft {
  return encounterDraftSchema.parse(input);
}

export function orderedParticipants(participants: readonly EncounterParticipant[]): EncounterParticipant[] {
  // The draft order is the master's explicit tiebreaker.
  return participants.map((participant, index) => ({ participant, index }))
    .sort((left, right) => right.participant.initiative - left.participant.initiative || left.index - right.index)
    .map(({ participant }) => participant);
}

export function startEncounter(encounter: Encounter): Encounter {
  if (encounter.status !== "draft") throw new GameError("Somente um encontro em preparação pode ser iniciado.");
  if (!encounter.participants.length) throw new GameError("Adicione pelo menos um participante antes de iniciar.");
  const participants = orderedParticipants(encounter.participants);
  return { ...encounter, participants, status: "active", round: 1, currentParticipantId: participants[0].sheetId };
}

export function advanceEncounter(encounter: Encounter): Encounter {
  if (encounter.status !== "active") throw new GameError("Inicie o encontro antes de avançar o turno.");
  const currentIndex = encounter.participants.findIndex((participant) => participant.sheetId === encounter.currentParticipantId);
  if (currentIndex < 0 || !encounter.participants.length) throw new GameError("O participante atual não foi encontrado. Sincronize o encontro.", 409);
  const nextIndex = (currentIndex + 1) % encounter.participants.length;
  const round = encounter.round + (nextIndex === 0 ? 1 : 0);
  if (!Number.isSafeInteger(round) || round < 1) throw new GameError("A rodada do encontro não é válida.");
  return { ...encounter, round, currentParticipantId: encounter.participants[nextIndex].sheetId,
    participants: nextIndex === 0 ? tickRoundConditions(encounter.participants) : encounter.participants };
}

export function finishEncounter(encounter: Encounter): Encounter {
  if (encounter.status !== "active") throw new GameError("Somente um encontro em andamento pode ser encerrado.");
  return { ...encounter, status: "finished", currentParticipantId: null };
}

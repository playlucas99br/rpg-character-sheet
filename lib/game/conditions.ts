import { z } from "zod";
import { randomId } from "./id.ts";
import type { Encounter, EncounterCondition } from "./types";
import { GameError } from "./errors.ts";

export const MAX_ENCOUNTER_CONDITIONS = 30;
export const MAX_CONDITION_ROUNDS = 999;

export const conditionInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  remainingRounds: z.number().int().min(1).max(MAX_CONDITION_ROUNDS).nullable(),
});

export const encounterConditionSchema = conditionInputSchema.extend({
  id: z.string().min(1).max(100),
});

export const encounterConditionsSchema = z
  .array(encounterConditionSchema)
  .max(MAX_ENCOUNTER_CONDITIONS)
  .superRefine((conditions, context) => {
    if (new Set(conditions.map((condition) => condition.id)).size !== conditions.length) {
      context.addIssue({
        code: "custom",
        message: "Identificadores duplicados nas condições.",
      });
    }
  });

export function makeEncounterCondition(
  name: string,
  remainingRounds: number | null,
): EncounterCondition {
  return { ...conditionInputSchema.parse({ name, remainingRounds }), id: randomId() };
}

/** Authorization and version checks belong to the encounter repository. */
export function changeEncounterCondition(encounter: Encounter, input: Record<string, unknown>): Encounter {
  if (encounter.status === "finished") throw new GameError("As condições de um encontro encerrado ficam disponíveis apenas para consulta.");
  const action = z.enum(["add_condition", "remove_condition"]).parse(input.action);
  const sheetId = z.string().min(1).max(100).parse(input.sheetId);
  const participant = encounter.participants.find((item) => item.sheetId === sheetId);
  if (!participant) throw new GameError("O participante não pertence a este encontro.", 404);
  const previous = participant.conditions ?? [];
  let conditions: EncounterCondition[];
  if (action === "add_condition") {
    const value = conditionInputSchema.parse(input.condition);
    if (previous.length >= MAX_ENCOUNTER_CONDITIONS) throw new GameError(`Cada participante pode ter até ${MAX_ENCOUNTER_CONDITIONS} condições.`);
    conditions = encounterConditionsSchema.parse([...previous, makeEncounterCondition(value.name, value.remainingRounds)]);
  } else {
    const conditionId = z.string().min(1).max(100).parse(input.conditionId);
    if (!previous.some((item) => item.id === conditionId)) throw new GameError("Condição não encontrada neste participante.", 404);
    conditions = previous.filter((item) => item.id !== conditionId);
  }
  return { ...encounter, participants: encounter.participants.map((item) => item.sheetId === sheetId ? { ...item, conditions } : item) };
}

export function preserveParticipantConditions<T extends { sheetId: string }>(next: readonly T[], previous: readonly { sheetId: string; conditions?: EncounterCondition[] }[]): Array<T & { conditions?: EncounterCondition[] }> {
  const byId = new Map(previous.map((item) => [item.sheetId, item.conditions]));
  return next.map((item) => {
    const conditions = byId.get(item.sheetId);
    return conditions === undefined ? item : { ...item, conditions: conditions.map((condition) => ({ ...condition })) };
  });
}

/** Call only when the last participant ends their turn and the next round starts. */
export function tickRoundConditions<T extends { conditions?: EncounterCondition[] }>(
  participants: readonly T[],
): T[] {
  return participants.map((participant) => {
    if (participant.conditions === undefined) return { ...participant };
    return {
      ...participant,
      conditions: participant.conditions.flatMap((condition) => {
        if (condition.remainingRounds === null) return [{ ...condition }];
        if (condition.remainingRounds <= 1) return [];
        return [{ ...condition, remainingRounds: condition.remainingRounds - 1 }];
      }),
    };
  });
}

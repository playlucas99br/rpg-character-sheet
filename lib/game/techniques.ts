import { z } from "zod";
import type { Ability, Sheet } from "./types";
import { GameError } from "./errors.ts";

export const MAX_TECHNIQUE_COUNTERS = 8;
export const MAX_TECHNIQUE_VALUE = 9999;
export const MAX_TECHNIQUE_COOLDOWN = 999;

const boundedCounterSchema = z.object({
  current: z.number().int().min(0).max(MAX_TECHNIQUE_VALUE),
  max: z.number().int().min(1).max(MAX_TECHNIQUE_VALUE),
}).refine((value) => value.current <= value.max, {
  message: "O valor atual não pode superar o máximo.",
  path: ["current"],
});

export const techniqueCounterSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(80),
  current: z.number().int().min(0).max(MAX_TECHNIQUE_VALUE),
  max: z.number().int().min(1).max(MAX_TECHNIQUE_VALUE),
}).refine((value) => value.current <= value.max, {
  message: "O valor atual não pode superar o máximo.",
  path: ["current"],
});

export const abilityTrackingSchema = z.object({
  uses: boundedCounterSchema.optional(),
  cooldown: z.object({
    rounds: z.number().int().min(1).max(MAX_TECHNIQUE_COOLDOWN),
    remaining: z.number().int().min(0).max(MAX_TECHNIQUE_COOLDOWN),
  }).refine((value) => value.remaining <= value.rounds, {
    message: "A recarga restante não pode superar a recarga configurada.",
    path: ["remaining"],
  }).optional(),
  counters: z.array(techniqueCounterSchema).max(MAX_TECHNIQUE_COUNTERS).optional(),
}).superRefine((value, context) => {
  const counters = value.counters ?? [];
  if (new Set(counters.map((counter) => counter.id)).size !== counters.length) {
    context.addIssue({
      code: "custom",
      message: "Identificadores duplicados nos contadores da técnica.",
      path: ["counters"],
    });
  }
});

export const optionalAbilityTrackingSchema = abilityTrackingSchema.nullable().optional();
export type AbilityTracking = z.infer<typeof abilityTrackingSchema>;
export type TechniqueCounter = z.infer<typeof techniqueCounterSchema>;
export type TrackedAbility = Ability & { tracking?: AbilityTracking | null };

export type TechniqueControl =
  | { kind: "reset_combat" }
  | { kind: "advance_cooldown" }
  | { kind: "adjust_counter"; abilityId: string; counterId: string; delta: number };

export const techniqueControlSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("reset_combat") }),
  z.object({ kind: z.literal("advance_cooldown") }),
  z.object({
    kind: z.literal("adjust_counter"),
    abilityId: z.string().min(1).max(100),
    counterId: z.string().min(1).max(100),
    delta: z.number().int().min(-MAX_TECHNIQUE_VALUE).max(MAX_TECHNIQUE_VALUE)
      .refine((value) => value !== 0, "Informe uma alteração diferente de zero."),
  }),
]);

export function hasTechniqueTracking(ability: TrackedAbility): boolean {
  const tracking = ability.tracking;
  return Boolean(tracking && (tracking.uses || tracking.cooldown || tracking.counters?.length));
}

export function availabilityWarning(
  sheet: Pick<Sheet, "resources">,
  ability: TrackedAbility,
): string | null {
  if (sheet.resources.ep.current < ability.cost)
    return `Energia insuficiente para ${ability.name}. Disponível: ${sheet.resources.ep.current}; custo: ${ability.cost}.`;
  if (ability.tracking?.uses && ability.tracking.uses.current <= 0)
    return `Sem usos disponíveis de ${ability.name} neste combate.`;
  if (ability.tracking?.cooldown && ability.tracking.cooldown.remaining > 0) {
    const rounds = ability.tracking.cooldown.remaining;
    return `${ability.name} está em recarga por ${rounds} ${rounds === 1 ? "rodada" : "rodadas"}.`;
  }
  return null;
}

function findAbility(sheet: Sheet, abilityId: string): TrackedAbility {
  const ability = sheet.abilities.find((item) => item.id === abilityId);
  if (!ability) throw new GameError("Técnica não encontrada.", 404);
  return ability;
}

/** The caller must authorize, check the sheet version and persist atomically with any roll. */
export function useAbility(sheet: Sheet, abilityId: string): Sheet {
  const ability = findAbility(sheet, abilityId);
  const tracking = optionalAbilityTrackingSchema.parse(ability.tracking);
  const warning = availabilityWarning(sheet, { ...ability, tracking });
  if (warning) throw new GameError(warning);
  if (tracking?.uses) tracking.uses.current -= 1;
  if (tracking?.cooldown) tracking.cooldown.remaining = tracking.cooldown.rounds;
  return {
    ...sheet,
    resources: {
      ...sheet.resources,
      ep: { ...sheet.resources.ep, current: sheet.resources.ep.current - ability.cost },
    },
    abilities: sheet.abilities.map((item) => item.id === abilityId
      ? { ...item, ...(tracking === undefined ? {} : { tracking }) }
      : item),
  };
}

/** Manual combat reset affects technique uses and cooldowns, never energy or custom counters. */
export function resetCombatTechniques(sheet: Sheet): Sheet {
  return {
    ...sheet,
    abilities: sheet.abilities.map((ability: TrackedAbility) => {
      if (!ability.tracking) return ability;
      const tracking = abilityTrackingSchema.parse(ability.tracking);
      if (tracking.uses) tracking.uses.current = tracking.uses.max;
      if (tracking.cooldown) tracking.cooldown.remaining = 0;
      return { ...ability, tracking };
    }),
  };
}

/** Called explicitly from the sheet when the table advances one round. */
export function advanceTechniqueCooldowns(sheet: Sheet): Sheet {
  return {
    ...sheet,
    abilities: sheet.abilities.map((ability: TrackedAbility) => {
      if (!ability.tracking?.cooldown) return ability;
      const tracking = abilityTrackingSchema.parse(ability.tracking);
      tracking.cooldown!.remaining = Math.max(0, tracking.cooldown!.remaining - 1);
      return { ...ability, tracking };
    }),
  };
}

export function adjustTechniqueCounter(
  sheet: Sheet,
  abilityId: string,
  counterId: string,
  delta: number,
): Sheet {
  techniqueControlSchema.parse({ kind: "adjust_counter", abilityId, counterId, delta });
  const ability = findAbility(sheet, abilityId);
  const tracking = optionalAbilityTrackingSchema.parse(ability.tracking);
  const counter = tracking?.counters?.find((item) => item.id === counterId);
  if (!counter) throw new GameError("Contador não encontrado nesta técnica.", 404);
  const next = counter.current + delta;
  if (next < 0)
    throw new GameError(`Saldo insuficiente de ${counter.name}. Disponível: ${counter.current}.`);
  if (next > counter.max)
    throw new GameError(`${counter.name} não pode superar o máximo de ${counter.max}.`);
  counter.current = next;
  return {
    ...sheet,
    abilities: sheet.abilities.map((item) => item.id === abilityId ? { ...item, tracking } : item),
  };
}

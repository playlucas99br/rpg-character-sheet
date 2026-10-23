import type { Roll, RollRequest, Sheet } from "./types.ts";
import { isOrdem, systemById } from "./systems.ts";
export type RandomInt = (sides: number) => number;
export const secureDie: RandomInt = (sides) => {
  const limit = Math.floor(0x100000000 / sides) * sides;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return (buffer[0] % sides) + 1;
};
export function parseFormula(input: string) {
  const match = /^(\d{0,2})d(\d{1,4})(kh1|kl1)?([+-]\d{1,4})?$/i.exec(
    input.replace(/\s/g, ""),
  );
  if (!match)
    throw new Error("Use uma fórmula como 1d20+5, 2d6+3 ou 3d20kh1+5.");
  const count = Number(match[1] || 1),
    sides = Number(match[2]),
    bonus = Number(match[4] || 0);
  if (
    count < 1 ||
    count > 30 ||
    sides < 2 ||
    sides > 1000 ||
    Math.abs(bonus) > 1000
  )
    throw new Error(
      "Use até 30 dados, de 2 a 1000 lados, e bônus entre -1000 e 1000.",
    );
  const mode =
    match[3]?.toLowerCase() === "kh1"
      ? "highest"
      : match[3]?.toLowerCase() === "kl1"
        ? "lowest"
        : "sum";
  return { count, sides, bonus, mode } as const;
}
export function evaluateFormula(
  formula: string,
  random: RandomInt = secureDie,
) {
  const { count, sides, bonus, mode } = parseFormula(formula);
  const dice = Array.from({ length: count }, () => random(sides));
  const selected =
    mode === "highest"
      ? Math.max(...dice)
      : mode === "lowest"
        ? Math.min(...dice)
        : dice.reduce((a, b) => a + b, 0);
  return {
    formula: formula.replace(/\s/g, "").toLowerCase(),
    dice,
    selected,
    bonus,
    total: selected + bonus,
    mode,
    critical:
      sides === 20 && selected === 20 && (count === 1 || mode !== "sum"),
    fumble: sides === 20 && selected === 1 && (count === 1 || mode !== "sum"),
  };
}
export function attributeFormula(sheet: Sheet, key: string, bonus = 0) {
  const value = sheet.attributes[key];
  if (!Number.isFinite(value)) throw new Error("Atributo não encontrado.");
  const signed = (n: number) => (n === 0 ? "" : n > 0 ? `+${n}` : String(n));
  if (isOrdem(sheet.system))
    return value <= 0
      ? `2d20kl1${signed(bonus)}`
      : `${Math.max(1, Math.min(10, value))}d20kh1${signed(bonus)}`;
  const modifier =
    sheet.system === "dnd" ? Math.floor((value - 10) / 2) : value;
  return `1d20${signed(modifier + bonus)}`;
}
export function resolveRoll(
  sheet: Sheet | null,
  request: RollRequest,
  random: RandomInt = secureDie,
): Omit<
  Roll,
  | "id"
  | "campaignId"
  | "userId"
  | "userName"
  | "characterName"
  | "visibility"
  | "createdAt"
> {
  if (request.kind === "manual")
    return {
      ...evaluateFormula(request.formula, random),
      label: (request.label || "Rolagem livre").slice(0, 80),
    };
  if (!sheet) throw new Error("Escolha uma ficha para rolar.");
  let label = "",
    formula = "",
    target: number | undefined;
  const getSkill = (id: string) => {
    const skill = sheet.skills.find((s) => s.id === id);
    if (!skill) throw new Error("Perícia não encontrada.");
    if (sheet.system === "cthulhu") {
      target = skill.bonus;
      return "1d100";
    }
    return attributeFormula(sheet, skill.attribute, skill.bonus);
  };
  if (request.kind === "attribute") {
    label =
      systemById(sheet.system).attributes.find((a) => a.key === request.id)
        ?.name || request.id;
    if (sheet.system === "cthulhu") {
      target = sheet.attributes[request.id];
      if (target === undefined) throw new Error("Atributo não encontrado.");
      formula = "1d100";
    } else formula = attributeFormula(sheet, request.id);
  } else if (request.kind === "skill") {
    formula = getSkill(request.id);
    label = sheet.skills.find((s) => s.id === request.id)!.name;
  } else if (request.kind === "attack") {
    const attack = sheet.attacks.find((a) => a.id === request.id);
    if (!attack) throw new Error("Ataque não encontrado.");
    label = `${attack.name} • ${request.damage ? "dano" : "acerto"}`;
    formula = request.damage ? attack.damage : getSkill(attack.skillId);
  } else {
    const ability = sheet.abilities.find((a) => a.id === request.id);
    if (!ability) throw new Error("Habilidade não encontrada.");
    if (!ability.formula)
      throw new Error("Essa habilidade não possui uma fórmula de rolagem.");
    label = ability.name;
    formula = ability.formula;
  }
  const result = evaluateFormula(formula, random);
  if (request.kind === "attack" && !request.damage) {
    const attack = sheet.attacks.find((a) => a.id === request.id)!;
    if (sheet.system !== "cthulhu")
      result.critical = result.selected >= attack.critical;
  }
  return target !== undefined
    ? {
        ...result,
        label,
        sheetId: sheet.id,
        mode: "percentile",
        target,
        success: result.total <= target,
        critical: result.total === 1,
        fumble: result.total === 100,
      }
    : { ...result, label, sheetId: sheet.id };
}

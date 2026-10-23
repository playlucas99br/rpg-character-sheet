import { z } from "zod";
import { parseFormula } from "./dice.ts";
export const systemSchema = z.enum([
  "ordem",
  "jujutsu",
  "dnd",
  "cthulhu",
  "tormenta",
  "custom",
]);
const shortText = z.string().trim().min(1).max(100);
const formula = z
  .string()
  .max(40)
  .refine((s) => {
    try {
      parseFormula(s);
      return true;
    } catch {
      return false;
    }
  }, "Fórmula de dados inválida.");
const resource = z
  .object({
    current: z.number().int().min(0).max(9999),
    max: z.number().int().min(1).max(9999),
  })
  .refine(
    (r) => r.current <= r.max,
    "O valor atual não pode superar o máximo.",
  );
export const sheetSchema = z
  .object({
    name: shortText,
    className: z.string().max(100),
    origin: z.string().max(100),
    level: z.number().int().min(1).max(100),
    exposure: z.number().int().min(0).max(100),
    defense: z.number().int().min(0).max(999),
    attributes: z.record(
      z.string().min(1).max(10),
      z.number().int().min(-10).max(100),
    ),
    resources: z.object({ hp: resource, ep: resource, sanity: resource }),
    skills: z
      .array(
        z.object({
          id: shortText,
          name: shortText,
          attribute: z.string().min(1).max(10),
          bonus: z.number().int().min(-100).max(200),
        }),
      )
      .max(60),
    attacks: z
      .array(
        z.object({
          id: shortText,
          name: shortText,
          skillId: shortText,
          damage: formula,
          range: z.string().max(80),
          critical: z.number().int().min(2).max(20),
          description: z.string().max(2000),
        }),
      )
      .max(30),
    abilities: z
      .array(
        z.object({
          id: shortText,
          name: shortText,
          cost: z.number().int().min(0).max(9999),
          formula: z.union([formula, z.literal("")]),
          description: z.string().max(4000),
        }),
      )
      .max(40),
    inventory: z.string().max(12000),
    notes: z.string().max(20000),
    description: z.string().max(4000),
    tone: z.enum(["blue", "violet", "rose", "amber", "green"]),
  })
  .superRefine((s, ctx) => {
    if (s.skills.some((k) => !(k.attribute in s.attributes)))
      ctx.addIssue({
        code: "custom",
        message: "Todas as perícias precisam de um atributo válido.",
      });
    if (s.attacks.some((a) => !s.skills.some((k) => k.id === a.skillId)))
      ctx.addIssue({
        code: "custom",
        message: "Todos os ataques precisam de uma perícia válida.",
      });
    for (const list of [s.skills, s.attacks, s.abilities])
      if (new Set(list.map((x) => x.id)).size !== list.length)
        ctx.addIssue({
          code: "custom",
          message: "Identificadores duplicados na ficha.",
        });
  });
export const campaignSchema = z.object({
  name: shortText,
  description: z.string().max(2000),
  system: systemSchema,
  banner: z.enum(["shrine", "forest", "ruins", "abyss"]),
  status: z.enum(["active", "paused"]).default("active"),
});

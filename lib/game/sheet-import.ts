import { z } from "zod";
import type { Campaign, Sheet, User } from "./types";
import { sheetSchema, systemSchema } from "./validation.ts";
import { systemById } from "./systems.ts";
import { randomId } from "./id.ts";
import { GameError } from "./errors.ts";

export const MAX_SHEET_IMPORT_BYTES = 128 * 1024;
const envelopeSchema = z.object({
  format: z.literal("nexo-sheet"),
  schemaVersion: z.literal(1),
  exportedAt: z.string().datetime({ offset: true }).optional(),
  sheet: z.unknown(),
});
const identitySchema = z.object({ system: systemSchema, type: z.enum(["character", "monster"]) });
export type SheetImport = {
  format: "nexo-sheet";
  schemaVersion: 1;
  exportedAt?: string;
  sheet: z.infer<typeof sheetSchema> & Pick<Sheet, "system" | "type">;
};

function checkSize(value: string) {
  if (new TextEncoder().encode(value).byteLength > MAX_SHEET_IMPORT_BYTES)
    throw new GameError("O arquivo ultrapassa o limite de 128 KB.");
}

export function validateSheetImport(value: unknown): SheetImport {
  let serialized: string | undefined;
  try { serialized = JSON.stringify(value); } catch {}
  if (!serialized) throw new GameError("Escolha uma ficha JSON exportada pelo Nexo.");
  checkSize(serialized);
  const envelope = envelopeSchema.safeParse(value);
  if (!envelope.success) {
    if (value && typeof value === "object" && "format" in value && value.format === "nexo-sheet" && "schemaVersion" in value && value.schemaVersion !== 1)
      throw new GameError("Esta versão do arquivo não é suportada. Use uma exportação Nexo da versão 1.");
    throw new GameError("O arquivo não é uma exportação de ficha Nexo válida.");
  }
  const identity = identitySchema.safeParse(envelope.data.sheet);
  if (!identity.success) throw new GameError("O sistema ou o tipo da ficha é inválido.");
  const content = sheetSchema.safeParse(envelope.data.sheet);
  if (!content.success) {
    const field = content.error.issues[0]?.path.join(".") || "conteúdo";
    throw new GameError(`Campo inválido na ficha: ${field}. Confira os valores e os campos obrigatórios do arquivo.`);
  }
  const keys = systemById(identity.data.system).attributes.map((a) => a.key);
  if (Object.keys(content.data.attributes).length !== keys.length || keys.some((key) => !Object.hasOwn(content.data.attributes, key)) || content.data.skills.some((skill) => !keys.includes(skill.attribute)))
    throw new GameError("Os atributos do arquivo não correspondem ao sistema da ficha.");
  if ((identity.data.system === "ordem" || identity.data.system === "jujutsu") && keys.some((key) => content.data.attributes[key] < 0 || content.data.attributes[key] > 10))
    throw new GameError("Os atributos de Ordem e Jujutsu devem ficar entre 0 e 10.");
  return { ...envelope.data, sheet: { ...content.data, ...identity.data } };
}

export function parseSheetImport(text: string): SheetImport {
  checkSize(text);
  let value: unknown;
  try { value = JSON.parse(text.replace(/^\uFEFF/u, "")); }
  catch { throw new GameError("O arquivo não contém um JSON válido."); }
  return validateSheetImport(value);
}

export function importCampaigns(document: SheetImport, campaigns: Campaign[]) {
  return campaigns.filter((c) => c.system === document.sheet.system && (document.sheet.type !== "monster" || c.role === "gm"));
}

export function makeImportedSheet(document: SheetImport, campaignId: string, owner: User, name: string, updatedAt = new Date().toISOString()): Sheet {
  const validatedName = z.string().trim().min(1).max(100).parse(name);
  return { ...structuredClone(document.sheet), name: validatedName, id: randomId(), campaignId, ownerId: owner.id, ownerName: owner.name, version: 1, updatedAt };
}

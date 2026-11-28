import { z } from "zod";
import { LIBRARY_MIME_TYPES, MAX_CUTSCENE_VIDEO_BYTES, MAX_IMAGE_BYTES, projectSchema, type TabletopProject } from "./model.ts";
import { referencedAssets } from "./storage.ts";

const MAGIC = "NEXOTBL2";
const HEADER_BYTES = MAGIC.length + 4;
const MAX_METADATA_BYTES = 32 * 1024 * 1024;
export const MAX_BACKUP_BYTES = 4 * 1024 * 1024 * 1024;
const LEGACY_BACKUP_BYTES = 300 * 1024 * 1024;
const MIME_TYPES = new Set([...LIBRARY_MIME_TYPES, "video/mp4", "video/webm"]);
const entrySchema = z.object({ id: z.string().min(1).max(120), type: z.string().max(160), size: z.number().int().min(1).max(MAX_CUTSCENE_VIDEO_BYTES) });
const manifestSchema = z.object({ version: z.literal(2), project: projectSchema, assets: z.array(entrySchema).max(10000) });
export type BackupData = { project: TabletopProject; assets: Map<string, Blob> };

function validateEntry(entry: z.infer<typeof entrySchema>) {
  const limit = entry.type.startsWith("video/") ? MAX_CUTSCENE_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!MIME_TYPES.has(entry.type) || entry.size > limit) throw new Error("A cópia contém um arquivo de tipo ou tamanho não permitido.");
}

/** Builds an archive from Blob parts, without converting large media to base64 strings. */
export async function createTabletopBackup(project: TabletopProject, getAsset: (id: string) => Promise<Blob | undefined>): Promise<Blob> {
  const parsed = projectSchema.parse(project), assets = [], parts: Blob[] = [];
  const ids = referencedAssets(parsed);
  if (ids.length > 10000) throw new Error("A cópia aceita até 10.000 arquivos diferentes.");
  let total = 0;
  for (const id of ids) {
    const blob = await getAsset(id);
    if (!blob) throw new Error("Um arquivo da mesa está ausente. Reimporte-o antes de exportar.");
    const entry = entrySchema.parse({ id, type: blob.type, size: blob.size }); validateEntry(entry);
    total += blob.size; if (total > MAX_BACKUP_BYTES - MAX_METADATA_BYTES - HEADER_BYTES) throw new Error("A cópia da mesa ultrapassa o limite de 4 GB.");
    assets.push(entry); parts.push(blob);
  }
  const metadata = new TextEncoder().encode(JSON.stringify({ version: 2, project: parsed, assets }));
  if (metadata.byteLength > MAX_METADATA_BYTES) throw new Error("A organização da mesa é grande demais para exportar.");
  const header = new Uint8Array(HEADER_BYTES); header.set(new TextEncoder().encode(MAGIC));
  new DataView(header.buffer).setUint32(MAGIC.length, metadata.byteLength, false);
  return new Blob([header, metadata, ...parts], { type: "application/octet-stream" });
}

/** Validates the complete manifest before exposing slices or replacing a project. */
export async function readTabletopBackup(file: Blob): Promise<BackupData> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error("A cópia da mesa deve ter até 4 GB.");
  const header = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
  const magic = new TextDecoder().decode(header.slice(0, MAGIC.length));
  if (magic !== MAGIC) return readLegacyBackup(file);
  if (header.length !== HEADER_BYTES) throw new Error("A cópia da mesa está incompleta.");
  const length = new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(MAGIC.length, false);
  if (!length || length > MAX_METADATA_BYTES || HEADER_BYTES + length > file.size) throw new Error("O índice da cópia é inválido ou está incompleto.");
  const manifest = manifestSchema.parse(JSON.parse(await file.slice(HEADER_BYTES, HEADER_BYTES + length).text()));
  const expected = new Set(referencedAssets(manifest.project)), assets = new Map<string, Blob>();
  let offset = HEADER_BYTES + length;
  for (const entry of manifest.assets) {
    validateEntry(entry);
    if (!expected.has(entry.id) || assets.has(entry.id) || offset + entry.size > file.size) throw new Error("A cópia contém arquivos duplicados, inesperados ou incompletos.");
    assets.set(entry.id, file.slice(offset, offset + entry.size, entry.type)); offset += entry.size;
  }
  if (offset !== file.size || assets.size !== expected.size) throw new Error("A cópia está incompleta ou contém dados inesperados.");
  return { project: manifest.project, assets };
}

async function readLegacyBackup(file: Blob): Promise<BackupData> {
  if (file.size > LEGACY_BACKUP_BYTES) throw new Error("A cópia JSON antiga deve ter até 300 MB. Use uma cópia .nexo para arquivos maiores.");
  const input = JSON.parse(await file.text()), project = projectSchema.parse(input.project), assets = new Map<string, Blob>();
  for (const id of referencedAssets(project)) {
    const asset = input.assets?.[id];
    if (!asset || !MIME_TYPES.has(asset.type) || typeof asset.data !== "string" || asset.data.length > MAX_IMAGE_BYTES * 1.4) throw new Error("A cópia antiga contém um arquivo ausente ou inválido.");
    const bytes = Uint8Array.from(atob(asset.data), c => c.charCodeAt(0));
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("Um arquivo da cópia antiga ultrapassa o limite de 80 MB.");
    assets.set(id, new Blob([bytes], { type: asset.type }));
  }
  return { project, assets };
}

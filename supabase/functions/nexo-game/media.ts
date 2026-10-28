import { createClient } from "@supabase/supabase-js";
import { ASSET_BUCKET, mediaRequest, type Asset } from "../../../lib/game/media.ts";
import { GameError } from "../../../lib/game/errors.ts";
import { database, managedKey } from "./persistence.ts";
import type { User } from "../../../lib/game/types.ts";

type AssetRow = { id: string; campaign_id: string; sheet_id: string | null; owner_id: string; uploaded_by: string; kind: Asset["kind"]; visibility: Asset["visibility"]; title: string; original_name: string; mime_type: string; size_bytes: number; status: Asset["status"]; created_at: string; object_path: string };
const expose = (row: AssetRow): Asset => ({ id: row.id, campaignId: row.campaign_id, sheetId: row.sheet_id, ownerId: row.owner_id, uploadedBy: row.uploaded_by, kind: row.kind, visibility: row.visibility, title: row.title, originalName: row.original_name, mimeType: row.mime_type, sizeBytes: row.size_bytes, status: row.status, createdAt: row.created_at });

export async function handleMedia(user: User, value: Record<string, unknown>) {
  const input = mediaRequest.parse(value);
  const db = database();
  const operation = input.action.slice("media_".length);
  const data = Object.fromEntries(Object.entries(input).filter(([key]) => key !== "action"));
  const rpc = <T>(action: string, payload = data) => db.request<T>("assets", { actor: user.id, action, data: payload });
  if (operation === "list") {
    const result = await rpc<{ assets: AssetRow[] }>("list");
    return { assets: result.assets.map(expose) };
  }
  const storage = createClient(Deno.env.get("SUPABASE_URL")!, managedKey(), { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(ASSET_BUCKET);
  const result = await rpc<{ asset: AssetRow }>(operation);
  const asset = result.asset;
  if (operation === "create") {
    const { data: upload, error } = await storage.createSignedUploadUrl(asset.object_path, { upsert: false });
    if (error || !upload) throw new GameError("Não foi possível preparar o envio. Tente novamente.", 503);
    return { asset: expose(asset), upload: { path: upload.path, token: upload.token, bucket: ASSET_BUCKET } };
  }
  if (operation === "read") {
    const { data: signed, error } = await storage.createSignedUrl(asset.object_path, 60);
    if (error || !signed) throw new GameError("Não foi possível abrir este arquivo.", 503);
    return { asset: expose(asset), url: signed.signedUrl, expiresIn: 60 };
  }
  if (operation === "delete") {
    const { error } = await storage.remove([asset.object_path]);
    if (error) throw new GameError("O arquivo foi ocultado, mas a exclusão precisa ser repetida.", 503);
    await rpc("delete_complete", { assetId: asset.id });
    return { deleted: true };
  }
  return { asset: expose(asset) };
}

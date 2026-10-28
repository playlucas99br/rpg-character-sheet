import { z } from "zod";
export const ASSET_BUCKET = "nexo-assets";
export const MAX_ASSET_BYTES = 10 * 1024 * 1024;
export const ASSET_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type Asset = {
  id: string; campaignId: string; sheetId: string | null; ownerId: string; uploadedBy: string;
  kind: "portrait" | "token" | "map"; visibility: "owner" | "gm" | "table";
  title: string; originalName: string; mimeType: string; sizeBytes: number;
  status: "pending" | "ready" | "deleting"; createdAt: string;
};
const id = z.string().trim().min(1).max(100);
export const mediaRequest = z.discriminatedUnion("action", [
  z.object({ action: z.literal("media_list"), campaignId: id }),
  z.object({ action: z.literal("media_create"), campaignId: id, sheetId: id.nullable().optional(), kind: z.enum(["portrait", "token", "map"]), visibility: z.enum(["owner", "gm", "table"]).default("owner"), title: z.string().trim().min(1).max(100), originalName: z.string().trim().min(1).max(160), mimeType: z.enum(ASSET_MIME_TYPES), sizeBytes: z.number().int().min(1).max(MAX_ASSET_BYTES) }),
  z.object({ action: z.literal("media_confirm"), assetId: z.string().uuid() }),
  z.object({ action: z.literal("media_read"), assetId: z.string().uuid() }),
  z.object({ action: z.literal("media_delete"), assetId: z.string().uuid() }),
  z.object({ action: z.literal("media_portrait"), assetId: z.string().uuid(), sheetId: id, version: z.number().int().min(1) }),
]);
export type MediaRequest = z.infer<typeof mediaRequest>;

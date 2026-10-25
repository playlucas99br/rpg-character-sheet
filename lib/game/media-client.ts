import type { Asset, MediaRequest } from "./media";
import { GameApiError } from "./client-sync";

export type MediaResponse = { assets?: Asset[]; asset?: Asset; deleted?: boolean; upload?: { path: string; token: string; bucket: string } };
// No automatic write retries: an upload or deletion may already have completed.
export async function requestMedia(input: MediaRequest, accountId: string): Promise<MediaResponse> {
  const response = await fetch("/api/media", {
    method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
    headers: { "Content-Type": "application/json", "X-Nexo-Account": accountId },
    body: JSON.stringify(input), signal: AbortSignal.timeout(30000),
  });
  const data = await response.json() as MediaResponse & { error?: string };
  if (!response.ok) throw new GameApiError(data.error || "Não foi possível confirmar a operação com o arquivo.", response.status);
  return data;
}

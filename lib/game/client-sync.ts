import type { User, Workspace } from "./types";

export type SyncStatus = "loading" | "ready" | "saving" | "offline" | "error" | "expired";
export type GameResponse<T = Record<string, unknown>> = Workspace & { user: User; result?: T };

export class GameApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GameApiError";
    this.status = status;
  }
}

// Do not automatically retry writes: an interrupted response may already have
// committed a resource adjustment or a roll. Refresh first to reconcile it.
export async function requestGame<T = Record<string, unknown>>(
  input?: Record<string, unknown>,
  expectedUserId?: string,
): Promise<GameResponse<T>> {
  let response: Response;
  try {
    response = await fetch("/api/game", {
    method: input ? "POST" : "GET",
    cache: "no-store",
    credentials: "same-origin",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
    headers: {
      ...(input ? { "Content-Type": "application/json" } : {}),
      ...(expectedUserId ? { "X-Nexo-Account": expectedUserId } : {}),
    },
    ...(input ? {
      body: JSON.stringify(input),
    } : {}),
    });
  } catch {
    throw new GameApiError("A conexão foi interrompida. Não foi possível confirmar a operação. Sincronize a conta antes de repetir a ação.", 0);
  }
  let data: GameResponse<T> & { error?: string };
  try {
    data = await response.json();
  } catch {
    throw new GameApiError("Não foi possível confirmar a conexão com sua conta. Atualize a página e entre novamente.", response.status);
  }
  if (!response.ok) {
    throw new GameApiError(
      response.status === 401 ? "Sua sessão terminou. Entre novamente para continuar." : data.error || "Não foi possível confirmar o salvamento. Sincronize antes de repetir a ação.",
      response.status,
    );
  }
  if (!data.user?.id || !Array.isArray(data.campaigns) || !Array.isArray(data.sheets) || !Array.isArray(data.rolls)) {
    throw new GameApiError("A resposta da sua conta está incompleta. Tente sincronizar novamente.", 502);
  }
  return data;
}

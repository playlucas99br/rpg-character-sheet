import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import {
  ensureProfile,
  workspaceFor,
  mutate,
  GameError,
} from "../../../lib/game/server";

export const dynamic = "force-dynamic";
const response = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", Vary: "Cookie" },
  });
async function identity(expectedUserId?: string | null) {
  const auth = await getChatGPTUser();
  if (!auth)
    throw new GameError("Entre na sua conta para acessar suas campanhas.", 401);
  // This header is only a stale-tab guard; identity always comes from Sites.
  if (expectedUserId && expectedUserId !== auth.userId)
    throw new GameError("A conta desta aba mudou. Entre novamente antes de salvar.", 401);
  // Use the stable per-Site identity, never an ID supplied by the browser.
  return { id: auth.userId, name: auth.fullName || auth.email.split("@")[0] };
}
function failure(error: unknown) {
  if (error instanceof GameError)
    return response({ error: error.message }, error.status);
  if (error instanceof z.ZodError)
    return response(
      { error: error.issues[0]?.message || "Dados inválidos." },
      400,
    );
  if (error instanceof SyntaxError)
    return response({ error: "Não foi possível ler os dados enviados." }, 400);
  console.error(
    "Game API failed",
    error instanceof Error ? error.message : "unknown",
  );
  return response(
    {
      error:
        "Não foi possível confirmar a operação. Sincronize a conta antes de repetir a ação.",
    },
    500,
  );
}
export async function GET(request?: Request) {
  try {
    const user = await identity(request?.headers.get("X-Nexo-Account"));
    await ensureProfile(user);
    return response(await workspaceFor(user));
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin)
      throw new GameError("Origem da solicitação inválida.", 403);
    if (!request.headers.get("content-type")?.includes("application/json"))
      throw new GameError("Envie dados em JSON.", 415);
    if (Number(request.headers.get("content-length") || 0) > 150000)
      throw new GameError("A ficha ultrapassou o limite de tamanho.", 413);
    const user = await identity(request.headers.get("X-Nexo-Account"));
    await ensureProfile(user);
    const text = await request.text();
    if (text.length > 150000)
      throw new GameError("A ficha ultrapassou o limite de tamanho.", 413);
    const input = z.record(z.unknown()).parse(JSON.parse(text));
    const state = await workspaceFor(user);
    const result = await mutate(state.user, input);
    return response({ ...(await workspaceFor(state.user)), result });
  } catch (error) {
    return failure(error);
  }
}

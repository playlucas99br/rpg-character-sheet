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
async function identity() {
  const auth = await getChatGPTUser();
  if (!auth)
    throw new GameError("Entre na sua conta para acessar suas campanhas.", 401);
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
        "Não foi possível concluir. Seus dados foram preservados; tente novamente.",
    },
    500,
  );
}
export async function GET() {
  try {
    const user = await identity();
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
    const user = await identity();
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

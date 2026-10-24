import { z } from "zod";
import { ensureProfile, workspaceFor, mutate, GameError } from "../../../lib/game/server.ts";

// Bundled from the same game repository used by Sites. No alternate permission rules.
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } });
Deno.serve(async (request: Request) => {
  if (request.method !== "GET" && request.method !== "POST") return reply({ error: "Método não permitido." }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ") || authorization.length > 16000) throw new GameError("Entre na sua conta para acessar suas campanhas.", 401);
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const key = keys.default || Deno.env.get("SUPABASE_ANON_KEY");
    const identity = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: key }, redirect: "error", signal: AbortSignal.timeout(10000),
    });
    if (!identity.ok) throw new GameError("Sua sessão expirou. Entre novamente para continuar.", identity.status >= 500 ? 503 : 401);
    const auth = await identity.json();
    if (!auth.id || !auth.email || !auth.email_confirmed_at || auth.is_anonymous) throw new GameError("Confirme seu e-mail para continuar.", 401);
    const user = { id: `supabase:${auth.id}`, name: typeof auth.user_metadata?.full_name === "string" ? auth.user_metadata.full_name.slice(0, 80) : auth.email.split("@")[0] };
    const expected = request.headers.get("X-Nexo-Account");
    if (expected && expected !== user.id) throw new GameError("A conta desta aba mudou. Entre novamente antes de salvar.", 401);
    let input: Record<string, unknown> | undefined;
    if (request.method === "POST") {
      if (!request.headers.get("content-type")?.includes("application/json")) throw new GameError("Envie dados em JSON.", 415);
      if (Number(request.headers.get("content-length") || 0) > 150000) throw new GameError("A ficha ultrapassou o limite de tamanho.", 413);
      const text = await request.text();
      if (text.length > 150000) throw new GameError("A ficha ultrapassou o limite de tamanho.", 413);
      input = z.record(z.unknown()).parse(JSON.parse(text));
    }
    await ensureProfile(user);
    if (!input) return reply(await workspaceFor(user));
    const state = await workspaceFor(user);
    const result = await mutate(state.user, input);
    return reply({ ...(await workspaceFor(state.user)), result });
  } catch (error) {
    if (error instanceof GameError) return reply({ error: error.message }, error.status);
    if (error instanceof z.ZodError) return reply({ error: error.issues[0]?.message || "Dados inválidos." }, 400);
    if (error instanceof SyntaxError) return reply({ error: "Não foi possível ler os dados enviados." }, 400);
    return reply({ error: "Não foi possível confirmar a operação. Sincronize antes de repetir a ação." }, 503);
  }
});

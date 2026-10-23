import { createAuthClient } from "../auth/server";

/** Vercel forwards a player's session, never an administrative database credential. */
export async function forwardGame(request: Request, body?: string) {
  const reply = (error: string, status: number) => Response.json({ error }, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  try {
    const { data } = await (await createAuthClient()).auth.getSession();
    if (!data.session?.access_token) return reply("Entre na sua conta para acessar suas campanhas.", 401);
    const endpoint = process.env.NEXO_GAME_API_URL;
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!endpoint || !projectUrl || endpoint !== `${projectUrl}/functions/v1/nexo-game`)
      return reply("A conexão com as campanhas ainda precisa ser configurada.", 503);
    // The upstream validates this JWT with Supabase Auth before reading any account data.
    const upstream = await fetch(endpoint, {
      method: body === undefined ? "GET" : "POST", redirect: "error", cache: "no-store",
      headers: { Authorization: `Bearer ${data.session.access_token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, "Content-Type": "application/json", "X-Nexo-Account": request.headers.get("X-Nexo-Account") || "" },
      body, signal: AbortSignal.timeout(25000),
    });
    const payload = await upstream.json();
    return Response.json(payload, { status: upstream.status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  } catch { return reply("Não foi possível confirmar a operação. Sincronize antes de repetir a ação.", 503); }
}

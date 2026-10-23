import { GATEWAY_TOKEN_SHA256 } from "./gateway-config.ts";

// Only the Sites server knows the matching token. Supabase's own service key
// remains inside this function's managed environment and is never exported.
function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
async function authenticate(request: Request) {
  const token = request.headers.get("X-Nexo-Token") || "";
  if (token.length < 32 || token.length > 192) return false;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  const expected = Uint8Array.from(GATEWAY_TOKEN_SHA256.match(/.{2}/g)!, (byte) => parseInt(byte, 16));
  let different = 0;
  for (let i = 0; i < 32; i++) different |= digest[i] ^ expected[i];
  return different === 0;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return reply({ error: "Método não permitido." }, 405);
  if (!(await authenticate(request))) return reply({ error: "Acesso não autorizado." }, 401);
  try {
    const text = await request.text();
    if (text.length > 5_000_000) return reply({ error: "A transferência excedeu o limite permitido." }, 413);
    const input = JSON.parse(text);
    let name: string, parameters: Record<string, unknown>;
    if (input.operation === "query") { name = "nexo_query"; parameters = { p_statements: input.statements }; }
    else if (input.operation === "import_status") { name = "nexo_import_status"; parameters = { p_source: input.source }; }
    else if (input.operation === "import") { name = "nexo_import"; parameters = { p_source: input.source, p_snapshot: input.snapshot }; }
    else return reply({ error: "Operação desconhecida." }, 400);
    const secrets = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const key = secrets.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!key) return reply({ error: "O acesso ao banco ainda não foi configurado." }, 503);
    const result = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, ...(!key.startsWith("sb_secret_") ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify(parameters),
      signal: AbortSignal.timeout(12000),
    });
    const data = await result.json();
    if (!result.ok) {
      const status = data.code === "42501" ? 403 : data.code === "P0001" || data.code === "23505" ? 409 : data.code?.startsWith("22") || data.code?.startsWith("23") ? 400 : 503;
      // Never echo SQL, keys, or player content in error responses or logs.
      return reply({ error: status === 409 ? "Os dados do banco mudaram. Sincronize antes de continuar." : "O banco não confirmou a operação.", code: data.code }, status);
    }
    return reply({ data });
  } catch { return reply({ error: "Não foi possível confirmar a conexão com o banco." }, 503); }
});

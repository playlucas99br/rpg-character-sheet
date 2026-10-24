import { SupabaseDatabase } from "../../../lib/game/supabase-database.ts";
import { GameError } from "../../../lib/game/errors.ts";

// The service key is read only inside Supabase's managed function environment.
class ManagedDatabase extends SupabaseDatabase {
  constructor() { super(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc`, "managed-runtime-only"); }
  override async request<T>(operation: string, payload: Record<string, unknown> = {}): Promise<T> {
    const names: Record<string, string> = { query: "nexo_query", import_status: "nexo_import_status" };
    const name = names[operation];
    if (!name) throw new GameError("Operação desconhecida.", 400);
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const key = keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!key) throw new GameError("O acesso ao banco está indisponível.", 503);
    const result = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/${name}`, {
      method: "POST", redirect: "error",
      headers: { "Content-Type": "application/json", apikey: key, ...(!key.startsWith("sb_secret_") ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify(operation === "query" ? { p_statements: payload.statements } : { p_source: payload.source }),
      signal: AbortSignal.timeout(12000),
    });
    const data = await result.json();
    if (!result.ok) throw new GameError("O banco não confirmou a operação. Sincronize antes de continuar.", data.code === "P0001" || data.code === "23505" ? 409 : 503);
    return data as T;
  }
}
export function database() { return new ManagedDatabase(); }
let migrationConfirmed = false;
export async function preparePersistence() {
  if (migrationConfirmed) return;
  const status = await database().request<{ imported: boolean }>("import_status", { source: "sites:appgprj_6adb7b7e7ab48191b305d8a73976caf3" });
  if (!status.imported) throw new GameError("A transferência dos dados anteriores ainda não foi confirmada.", 503);
  migrationConfirmed = true;
}

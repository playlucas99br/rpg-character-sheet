import { SupabaseDatabase } from "../../../lib/game/supabase-database.ts";
import { GameError } from "../../../lib/game/errors.ts";

// The service key is read only inside Supabase's managed function environment.
class ManagedDatabase extends SupabaseDatabase {
  constructor() { super(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc`, "managed-runtime-only"); }
  override async request<T>(operation: string, payload: Record<string, unknown> = {}): Promise<T> {
    const names: Record<string, string> = { query: "nexo_query", schema_status: "nexo_schema_status", assets: "nexo_assets" };
    const name = names[operation];
    if (!name) throw new GameError("Operação desconhecida.", 400);
    const key = managedKey();
    const result = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/${name}`, {
      method: "POST", redirect: "error",
      headers: { "Content-Type": "application/json", apikey: key, ...(!key.startsWith("sb_secret_") ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify(operation === "query" ? { p_statements: payload.statements } : operation === "assets" ? { p_actor: payload.actor, p_action: payload.action, p_data: payload.data } : {}),
      signal: AbortSignal.timeout(12000),
    });
    const data = await result.json();
    if (!result.ok) {
      const statuses: Record<string, number> = { "42501": 403, "P0002": 404, "P0001": 409, "23505": 409, "22023": 400, "22P02": 400, "23514": 400 };
      const status = statuses[data.code] || 503;
      throw new GameError(status === 403 ? "Você não tem permissão para acessar este arquivo." : status === 404 ? "Arquivo não encontrado." : status === 400 ? "Confira o tipo, o tamanho e os dados do arquivo." : status === 409 ? "Os dados mudaram. Sincronize antes de repetir a ação." : "O banco não confirmou a operação. Sincronize antes de continuar.", status);
    }
    return data as T;
  }
}
export function managedKey(): string {
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const key = keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new GameError("O acesso ao banco está indisponível.", 503);
  return key;
}
export function database() { return new ManagedDatabase(); }
let schemaConfirmed = false;
export async function preparePersistence() {
  if (schemaConfirmed) return;
  const status = await database().request<{ ready: boolean; schemaVersion: number }>("schema_status");
  if (!status.ready || status.schemaVersion < 2) throw new GameError("O banco precisa receber as migrações da aplicação.", 503);
  schemaConfirmed = true;
}

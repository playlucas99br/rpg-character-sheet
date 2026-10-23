import { env } from "cloudflare:workers";
import { GameError } from "./errors";
import { SupabaseDatabase, type GameDatabase } from "./supabase-database";

function configuration() {
  if (env.NEXO_DATABASE_PROVIDER !== "supabase") return null;
  if (!env.SUPABASE_DATABASE_GATEWAY_URL || !env.NEXO_DATABASE_TOKEN || !env.NEXO_DATABASE_SOURCE_ID)
    throw new GameError("A conexão com o banco Supabase ainda precisa ser configurada.", 503);
  return { url: env.SUPABASE_DATABASE_GATEWAY_URL, token: env.NEXO_DATABASE_TOKEN, source: env.NEXO_DATABASE_SOURCE_ID };
}
export function database(): GameDatabase {
  const config = configuration();
  if (config) return new SupabaseDatabase(config.url, config.token);
  if (env.NEXO_DATABASE_PROVIDER && env.NEXO_DATABASE_PROVIDER !== "d1")
    throw new GameError("O provedor do banco não foi reconhecido.", 503);
  if (!env.DB) throw new GameError("O armazenamento da campanha está temporariamente indisponível.", 503);
  // The game repository uses this common subset of the native D1 interface.
  return env.DB as unknown as GameDatabase;
}

let initialization: { source: string; url: string; promise: Promise<void> } | undefined;

/** Copy existing records once, atomically, before the first Supabase write.
 * D1 is retained as the original copy; a failed import never switches to an empty DB.
 */
export async function preparePersistence() {
  const config = configuration();
  if (!config) return;
  if (initialization?.source === config.source && initialization.url === config.url) return initialization.promise;
  const operation = {
    source: config.source,
    url: config.url,
    promise: (async () => {
      const remote = new SupabaseDatabase(config.url, config.token);
      const status = await remote.request<{ imported: boolean }>("import_status", { source: config.source });
      if (status.imported) return;
      const tables = ["profiles", "campaigns", "memberships", "sheets", "rolls"] as const;
      let snapshot: Record<string, unknown[]>;
      if (env.DB) {
        const result = await env.DB.batch(tables.map((table) => env.DB!.prepare(`SELECT * FROM ${table}`)));
        snapshot = Object.fromEntries(tables.map((table, i) => [table, result[i].results]));
      } else snapshot = Object.fromEntries(tables.map((table) => [table, []]));
      const imported = await remote.request<{ imported: boolean }>("import", { source: config.source, snapshot });
      if (!imported?.imported) throw new GameError("A transferência dos dados para o Supabase não foi confirmada.", 503);
    })(),
  };
  initialization = operation;
  try { await operation.promise; }
  catch (error) { if (initialization === operation) initialization = undefined; throw error; }
}

import { GameError } from "./errors";

export type QueryResult<T = Record<string, unknown>> = {
  success: boolean;
  results: T[];
  meta: { changes: number };
};
export interface GameStatement {
  bind(...values: unknown[]): GameStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<QueryResult<T>>;
  run(): Promise<QueryResult>;
}
export interface GameDatabase {
  prepare(sql: string): GameStatement;
  batch(statements: GameStatement[]): Promise<QueryResult[]>;
}

/** Server-only transport. The browser never receives the gateway token. */
export class SupabaseDatabase implements GameDatabase {
  url: string;
  private token: string;
  constructor(url: string, token: string) {
    const target = new URL(url);
    if (target.protocol !== "https:" || !target.hostname.endsWith(".supabase.co") || target.username || target.password || target.search || target.hash)
      throw new GameError("A conexão com o Supabase não foi configurada corretamente.", 503);
    this.url = url;
    this.token = token;
  }
  async request<T>(operation: string, payload: Record<string, unknown> = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(this.url, {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Nexo-Token": this.token },
        body: JSON.stringify({ operation, ...payload }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new GameError("O Supabase está temporariamente indisponível. Sincronize antes de repetir a ação.", 503);
    }
    let body: { data?: T; error?: string };
    try { body = await response.json(); }
    catch { throw new GameError("O Supabase não confirmou a operação. Sincronize antes de repetir.", 503); }
    if (!response.ok || body.error || body.data === undefined) {
      // Gateway credentials belong to the server; they must never log a player out.
      const status = response.ok || response.status === 401 || response.status === 403 ? 503 : response.status;
      throw new GameError(body.error || "Não foi possível confirmar a gravação no Supabase.", status);
    }
    return body.data;
  }
  prepare(sql: string): GameStatement { return new SupabaseStatement(this, sql); }
  async batch(statements: GameStatement[]): Promise<QueryResult[]> {
    const commands = statements.map((statement) => {
      if (!(statement instanceof SupabaseStatement) || statement.database !== this)
        throw new GameError("Uma transação não pode misturar bancos diferentes.", 500);
      return { sql: statement.sql, params: statement.values };
    });
    const results = await this.request<QueryResult[]>("query", { statements: commands });
    if (!Array.isArray(results) || results.length !== statements.length)
      throw new GameError("A resposta do banco está incompleta.", 503);
    // PostgreSQL stores sheet/roll JSON natively; preserve the existing repository contract.
    return results.map((result) => ({ ...result, results: result.results.map((row) => ({
      ...row,
      ...(row.data && typeof row.data === "object" ? { data: JSON.stringify(row.data) } : {}),
    })) }));
  }
}

class SupabaseStatement implements GameStatement {
  database: SupabaseDatabase;
  sql: string;
  values: unknown[];
  constructor(database: SupabaseDatabase, sql: string, values: unknown[] = []) {
    this.database = database; this.sql = sql; this.values = values;
  }
  bind(...values: unknown[]) { return new SupabaseStatement(this.database, this.sql, values); }
  async all<T = Record<string, unknown>>(): Promise<QueryResult<T>> {
    return (await this.database.batch([this]))[0] as QueryResult<T>;
  }
  async first<T = Record<string, unknown>>(): Promise<T | null> { return (await this.all<T>()).results[0] ?? null; }
  async run() { return this.all(); }
}

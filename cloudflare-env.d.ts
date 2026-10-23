declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    NEXO_DATABASE_PROVIDER?: "d1" | "supabase";
    SUPABASE_DATABASE_GATEWAY_URL?: string;
    NEXO_DATABASE_TOKEN?: string;
    NEXO_DATABASE_SOURCE_ID?: string;
  }
}

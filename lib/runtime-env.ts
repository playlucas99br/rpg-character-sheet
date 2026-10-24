/** Node/Vercel configuration. The Sites build replaces this module with its bindings adapter. */
export const env = {
  NEXO_AUTH_PROVIDER: "supabase",
  NEXO_DATABASE_PROVIDER: undefined as string | undefined,
  SUPABASE_DATABASE_GATEWAY_URL: undefined as string | undefined,
  NEXO_DATABASE_TOKEN: undefined as string | undefined,
  NEXO_DATABASE_SOURCE_ID: undefined as string | undefined,
  DB: undefined as D1Database | undefined,
};

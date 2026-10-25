"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
let client: SupabaseClient | undefined;
export async function browserSupabase() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("O acesso ao Supabase não está configurado.");
  const { createBrowserClient } = await import("@supabase/ssr");
  client = createBrowserClient(url, key, { cookieOptions: { sameSite: "lax", secure: process.env.NODE_ENV === "production" } });
  return client;
}

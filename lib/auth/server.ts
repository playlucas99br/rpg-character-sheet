import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authConfig } from "./config";

export async function createAuthClient() {
  const store = await cookies();
  const { url, key } = authConfig();
  // Create a new client per request; never share visitors' sessions in a warm function.
  return createServerClient(url, key, {
    cookieOptions: { sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try { for (const { name, value, options } of values) store.set(name, value, options); }
        catch { /* Read-only Server Components receive refreshed cookies from proxy.ts. */ }
      },
    },
  });
}

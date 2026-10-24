import { env } from "@/lib/runtime-env";
import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath, type ChatGPTUser } from "./chatgpt-auth";

// Vercel's adapter always selects Supabase. Public requests cannot opt into header authentication.
export function authProvider(): "sites" | "supabase" {
  return env.NEXO_AUTH_PROVIDER === "supabase" ? "supabase" : "sites";
}
export async function getCurrentUser(): Promise<ChatGPTUser | null> {
  if (authProvider() === "sites") return getChatGPTUser();
  const { createAuthClient } = await import("../lib/auth/server");
  const { data, error } = await (await createAuthClient()).auth.getUser();
  if (error || !data.user?.email || !data.user.email_confirmed_at) return null;
  const fullName = typeof data.user.user_metadata.full_name === "string"
    ? data.user.user_metadata.full_name.slice(0, 100) : null;
  return { userId: `supabase:${data.user.id}`, email: data.user.email, fullName, displayName: fullName || data.user.email };
}
export function signInPath(returnTo = "/") {
  return authProvider() === "sites" ? chatGPTSignInPath(returnTo) : `/?return_to=${encodeURIComponent(returnTo)}`;
}
export function signOutPath() {
  return authProvider() === "sites" ? chatGPTSignOutPath("/") : "/auth/signout";
}

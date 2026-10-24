import { createAuthClient } from "../../../lib/auth/server";
import { safeReturnPath } from "../../../lib/auth/return-path";
import { authProvider } from "../../auth";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (authProvider() === "supabase" && code) {
    const { error } = await (await createAuthClient()).auth.exchangeCodeForSession(code);
    if (!error) return new Response(null, { status: 303, headers: { Location: safeReturnPath(url.searchParams.get("next")), "Cache-Control": "private, no-store" } });
  }
  return new Response(null, { status: 303, headers: { Location: "/?auth_error=1", "Cache-Control": "private, no-store" } });
}

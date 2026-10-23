import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/runtime-env";
import { authConfig } from "./lib/auth/config";

export async function proxy(request: NextRequest) {
  if (env.NEXO_AUTH_PROVIDER !== "supabase") return NextResponse.next();
  const { url, key } = authConfig();
  let response = NextResponse.next({ request });
  const client = createServerClient(url, key, {
    cookieOptions: { sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, cacheHeaders) {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(cacheHeaders)) response.headers.set(name, value);
      },
    },
  });
  await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/", "/api/:path*", "/auth/:path*"] };

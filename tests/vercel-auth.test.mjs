import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/lib/runtime-env") return { url: new URL("../lib/runtime-env.ts", import.meta.url).href, shortCircuit: true };
  if (specifier === "next/headers" || specifier === "next/navigation") return { url: new URL("./request-context.mjs", import.meta.url).href, shortCircuit: true };
  try { return next(specifier, context); }
  catch (error) { if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context); throw error; }
} });
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://verification.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_verification";
const { fixture } = await import("./request-context.mjs");
const { getCurrentUser, authProvider } = await import("../app/auth.ts");
const { GET, POST } = await import("../app/api/game/route.ts");
const { safeReturnPath } = await import("../lib/auth/return-path.ts");
const origin = "https://nexo.example.test";
test("Vercel rejects forged ChatGPT identity headers and claimed account IDs without a Supabase session", async () => {
  fixture.headers = new Headers({ "oai-authenticated-user-id": "victim", "oai-authenticated-user-email": "victim@example.invalid" });
  assert.equal(authProvider(), "supabase");
  assert.equal(await getCurrentUser(), null);
  const request = new Request(`${origin}/api/game`, { headers: { "X-Nexo-Account": "victim" } });
  assert.equal((await GET(request)).status, 401);
  const post = new Request(`${origin}/api/game`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "X-Nexo-Account": "victim" }, body: JSON.stringify({ action: "resource", sheetId: "victim-sheet", delta: -1 }) });
  assert.equal((await POST(post)).status, 401);
});
test("Vercel keeps cross-site writes blocked and authentication returns stay on the app", async () => {
  assert.equal((await POST(new Request(`${origin}/api/game`, { method: "POST", headers: { Origin: "https://attacker.example" }, body: "{}" }))).status, 403);
  for (const value of ["https://attacker.example", "//attacker.example", "/\\attacker.example", "/auth/signout", "/api/game"]) assert.equal(safeReturnPath(value), "/");
  assert.equal(safeReturnPath("/auth/password"), "/auth/password");
  assert.equal(safeReturnPath("/?view=sheet&id=abc"), "/?view=sheet&id=abc");
});

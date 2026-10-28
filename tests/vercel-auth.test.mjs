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
const { POST: authPost } = await import("../app/api/auth/route.ts");
const { GET: mediaGet, POST: mediaPost } = await import("../app/api/media/route.ts");
const { GET: imageGet } = await import("../app/api/media/image/route.ts");
const { safeReturnPath } = await import("../lib/auth/return-path.ts");
const { isSameOrigin } = await import("../lib/auth/request-origin.ts");
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
  assert.equal(isSameOrigin(new Request("http://0.0.0.0:3010/api/auth", { headers: { Host: "localhost:3010", Origin: "http://localhost:3010" } })), true);
  assert.equal(isSameOrigin(new Request(`${origin}/api/auth`, { headers: { Host: "nexo.example.test", Origin: "http://nexo.example.test" } })), false);
  assert.equal((await POST(new Request(`${origin}/api/game`, { method: "POST", headers: { Origin: "https://attacker.example" }, body: "{}" }))).status, 403);
  for (const value of ["https://attacker.example", "//attacker.example", "/\\attacker.example", "/auth/signout", "/api/game"]) assert.equal(safeReturnPath(value), "/");
  assert.equal(safeReturnPath("/auth/password"), "/auth/password");
  assert.equal(safeReturnPath("/?view=sheet&id=abc"), "/?view=sheet&id=abc");
});
const authRequest = (input) => new Request(`${origin}/api/auth`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(input) });
test("Auth rejects invalid input and cross-site changes before contacting the provider", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { ++calls; throw new Error("Provider must not be called"); };
  try {
    assert.equal((await authPost(authRequest({ action: "signup", name: "Player", email: "player@example.invalid", password: "short" }))).status, 400);
    assert.equal((await authPost(new Request(`${origin}/api/auth`, { method: "POST", headers: { Origin: "https://attacker.example", "Content-Type": "application/json" }, body: '{"action":"signout"}' }))).status, 403);
    assert.equal((await authPost(authRequest({ action: "password", password: "a-long-new-password" }))).status, 401);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; }
});
test("Auth handles unconfirmed login and recovery without leaking provider errors", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => new Response(JSON.stringify(String(url).includes("/recover") ? { message: "private provider failure" } : { code: "email_not_confirmed", msg: "Email not confirmed" }), { status: String(url).includes("/recover") ? 500 : 400, headers: { "Content-Type": "application/json", "X-Supabase-Api-Version": "2024-01-01" } });
  try {
    const response = await authPost(authRequest({ action: "signin", email: "player@example.invalid", password: "test-password-only" }));
    assert.equal(response.status, 401);
    assert.match((await response.json()).error, /Confirme seu e-mail/);
    const recovery = await authPost(authRequest({ action: "recover", email: "player@example.invalid" }));
    assert.equal(recovery.status, 200);
    assert.doesNotMatch(JSON.stringify(await recovery.json()), /private provider failure/);
  } finally { globalThis.fetch = original; }
});
test("confirmed password login stores the provider session in cookies", async () => {
  const original = globalThis.fetch;
  const token = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: "11111111-1111-4111-8111-111111111111", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.verification-only`;
  globalThis.fetch = async () => Response.json({ access_token: token, refresh_token: "verification-only", expires_in: 3600, token_type: "bearer", user: { id: "11111111-1111-4111-8111-111111111111", email: "player@example.invalid", email_confirmed_at: new Date().toISOString(), user_metadata: {} } });
  try {
    const response = await authPost(authRequest({ action: "signin", email: "player@example.invalid", password: "test-password-only" }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.ok(fixture.cookies.some((cookie) => cookie.name.includes("auth-token")));
    assert.match(response.headers.get("cache-control"), /no-store/);
  } finally { globalThis.fetch = original; fixture.cookies = []; }
});
test("media routes reject unauthenticated, cross-site and invalid upload requests", async () => {
  assert.equal((await mediaGet(new Request(`${origin}/api/media?campaignId=campaign-a`))).status, 401);
  assert.equal((await imageGet(new Request(`${origin}/api/media/image?assetId=11111111-1111-4111-8111-111111111111`))).status, 401);
  assert.equal((await mediaPost(new Request(`${origin}/api/media`, { method: "POST", headers: { Origin: "https://attacker.example", "Content-Type": "application/json" }, body: "{}" }))).status, 403);
  const response = await mediaPost(new Request(`${origin}/api/media`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ action: "media_create", campaignId: "campaign-a", kind: "portrait", title: "Title", originalName: "file.svg", mimeType: "image/svg+xml", sizeBytes: 20 }) }));
  assert.equal(response.status, 400);
});

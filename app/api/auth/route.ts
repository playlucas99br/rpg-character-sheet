import { z } from "zod";
import { authProvider } from "../../auth";
import { createAuthClient } from "../../../lib/auth/server";

export const dynamic = "force-dynamic";
const email = z.string().trim().email().max(254);
const password = z.string().min(10, "Use uma senha com pelo menos 10 caracteres.").max(128);
const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("signin"), email, password: z.string().min(1).max(128) }),
  z.object({ action: z.literal("signup"), email, password, name: z.string().trim().min(2).max(80) }),
  z.object({ action: z.literal("recover"), email }),
  z.object({ action: z.literal("password"), password }),
  z.object({ action: z.literal("signout") }),
]);
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });

export async function POST(request: Request) {
  if (authProvider() !== "supabase") return reply({ error: "Acesso indisponível nesta versão." }, 404);
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin) return reply({ error: "Origem da solicitação inválida." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 8000) return reply({ error: "Solicitação muito grande." }, 413);
  try {
    const text = await request.text();
    if (text.length > 8000) return reply({ error: "Solicitação muito grande." }, 413);
    const form = request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded");
    if (!form && !request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Envie os dados do formulário." }, 415);
    const input = inputSchema.parse(form ? Object.fromEntries(new URLSearchParams(text)) : JSON.parse(text));
    if (form && input.action !== "signout") return reply({ error: "Formato inválido." }, 400);
    const client = await createAuthClient();
    if (input.action === "signin") {
      const { error } = await client.auth.signInWithPassword({ email: input.email, password: input.password });
      if (error) return reply({ error: error.code === "email_not_confirmed" ? "Confirme seu e-mail antes de entrar." : "Não foi possível entrar. Confira o e-mail e a senha e tente novamente." }, error.status === 429 ? 429 : 401);
      return reply({ ok: true });
    }
    if (input.action === "signup") {
      const { data, error } = await client.auth.signUp({ email: input.email, password: input.password, options: { data: { full_name: input.name }, emailRedirectTo: `${origin}/auth/callback` } });
      if (error) return reply({ error: "Não foi possível criar a conta. Confira os dados ou tente novamente mais tarde." }, error.status === 429 ? 429 : 400);
      return reply({ ok: true, signedIn: !!data.session, message: "Confira seu e-mail para confirmar a conta. Depois, volte para entrar." });
    }
    if (input.action === "recover") {
      const { error } = await client.auth.resetPasswordForEmail(input.email, { redirectTo: `${origin}/auth/callback?next=/auth/password` });
      if (error && error.status === 429) return reply({ error: "Aguarde alguns minutos antes de pedir outro e-mail." }, 429);
      return reply({ ok: true, message: "Se houver uma conta com este e-mail, você receberá as instruções de recuperação." });
    }
    if (input.action === "password") {
      const { data, error: identityError } = await client.auth.getUser();
      if (identityError || !data.user) return reply({ error: "Abra novamente o link de recuperação para continuar." }, 401);
      const { error } = await client.auth.updateUser({ password: input.password });
      if (error) return reply({ error: "Não foi possível alterar a senha. Use uma senha nova e tente novamente." }, 400);
      return reply({ ok: true });
    }
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) return reply({ error: "Não foi possível sair. Tente novamente." }, 503);
    return form ? new Response(null, { status: 303, headers: { Location: "/", "Cache-Control": "private, no-store" } }) : reply({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return reply({ error: error.issues[0]?.message || "Confira os dados informados." }, 400);
    if (error instanceof SyntaxError) return reply({ error: "Não foi possível ler os dados enviados." }, 400);
    return reply({ error: "O acesso à conta está temporariamente indisponível. Tente novamente." }, 503);
  }
}

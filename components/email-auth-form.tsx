"use client";
import { useEffect, useState, type FormEvent } from "react";
import { safeReturnPath } from "../lib/auth/return-path";
type Mode = "signin" | "signup" | "recover" | "password";
const labels: Record<Mode, string> = { signin: "Entrar na minha conta", signup: "Criar minha conta", recover: "Enviar recuperação", password: "Salvar nova senha" };
export default function EmailAuthForm({ initialMode = "signin" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("auth_error")) setError("Este link expirou ou foi aberto em outro navegador. Entre com sua senha ou peça um novo link.");
  }, []);
  function changeMode(next: Mode) { setMode(next); setError(""); setMessage(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), action: mode }), cache: "no-store", redirect: "error" });
      const body = await response.json() as { ok?: boolean; signedIn?: boolean; error?: string; message?: string };
      if (!response.ok || body.ok !== true) throw new Error(body.error || "Não foi possível concluir. Tente novamente.");
      if (mode === "signin" || mode === "password" || body.signedIn) {
        window.location.assign(safeReturnPath(new URLSearchParams(window.location.search).get("return_to")));
        return;
      }
      form.reset(); setMessage(body.message || "Solicitação enviada.");
    } catch (error) { setError(error instanceof Error ? error.message : "Confira sua conexão e tente novamente."); }
    finally { setBusy(false); }
  }
  return <div className="email-auth">
    <p>{mode === "signup" ? "Crie sua conta para guardar personagens e reunir sua mesa." : mode === "recover" ? "Enviaremos um link para você escolher uma nova senha." : mode === "password" ? "Use pelo menos 10 caracteres." : "Entre com seu e-mail e senha para continuar sua aventura."}</p>
    <form onSubmit={submit} className="auth-form" key={mode}>
      {mode === "signup" && <label>Seu nome<input name="name" autoComplete="name" required minLength={2} maxLength={80} disabled={busy} /></label>}
      {mode !== "password" && <label>E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} /></label>}
      {mode !== "recover" && <label>{mode === "password" ? "Nova senha" : "Senha"}<input name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={mode === "signin" ? 1 : 10} maxLength={128} disabled={busy} /></label>}
      {error && <p role="alert" className="auth-error">{error}</p>}
      {message && <p role="status" className="auth-message">{message}</p>}
      <button className="button primary" type="submit" disabled={busy}>{busy ? "Aguarde…" : labels[mode]}</button>
    </form>
    {initialMode !== "password" && <div className="auth-actions">
      <button className="text-button" type="button" disabled={busy} onClick={() => changeMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Já tenho uma conta" : "Criar conta"}</button>
      <button className="text-button" type="button" disabled={busy} onClick={() => changeMode(mode === "recover" ? "signin" : "recover")}>{mode === "recover" ? "Voltar para entrar" : "Esqueci minha senha"}</button>
    </div>}
    {initialMode !== "password" && <a className="auth-link" href="https://nexo-rpg-fichas.warmspark10.chatgpt.site" target="_top">Acessar minha conta do ChatGPT</a>}
  </div>;
}

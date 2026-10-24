"use client";

import { Check, Cloud, CloudOff, LoaderCircle, LogIn, RefreshCw } from "lucide-react";
import type { SyncStatus } from "../lib/game/client-sync";

export default function SyncIndicator({ status, lastSavedAt, demo = false }: { status: SyncStatus; lastSavedAt?: string; demo?: boolean }) {
  const Icon = demo ? CloudOff : status === "saving" || status === "loading" ? LoaderCircle : status === "ready" ? Check : status === "expired" ? LogIn : CloudOff;
  const label = demo ? "Exemplos neste navegador" : status === "saving" ? "Salvando na sua conta…" : status === "loading" ? "Conectando à sua conta…" : status === "ready" ? lastSavedAt ? "Salvo na sua conta" : "Conta sincronizada" : status === "expired" ? "Entre novamente" : status === "offline" ? "Sem conexão" : "Verifique a sincronização";
  return <span className={`sync-indicator ${demo ? "demo" : status}`} role="status" title={lastSavedAt && !demo ? `Último salvamento confirmado: ${new Date(lastSavedAt).toLocaleString("pt-BR")}` : label}><Icon size={14} /><span>{label}</span></span>;
}

export function SyncNotice({ status, message, signInHref, onRetry }: { status: SyncStatus; message: string; signInHref: string; onRetry: () => void }) {
  if (status !== "error" && status !== "offline" && status !== "expired") return null;
  return (
    <div className="sync-notice" role="alert">
      <Cloud size={17} />
      <p>{status === "offline" ? "Você está sem conexão. As alterações só ficam salvas na conta após a confirmação. Seus rascunhos de edição continuam nesta aba." : message}</p>
      {status === "expired" ? <a className="text-button" href={signInHref} target="_top"><LogIn size={15} />Entrar novamente</a> : <button className="text-button" onClick={onRetry}><RefreshCw size={15} />Sincronizar</button>}
    </div>
  );
}

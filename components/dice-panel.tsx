"use client";
import { useState } from "react";
import { ArrowUpRight, Dices, EyeOff, History, Sparkles } from "lucide-react";
import type { Campaign, Roll } from "../lib/game/types";
import { Button, Die, Empty, Field } from "./ui";

export function RollRow({
  roll,
  compact = false,
}: {
  roll: Roll;
  compact?: boolean;
}) {
  return (
    <div
      className={`roll-row ${roll.critical ? "is-critical" : ""} ${compact ? "compact" : ""}`}
    >
      <div className="roll-number">{roll.total}</div>
      <div className="roll-details">
        <strong>
          {roll.label}
          {roll.critical && <Sparkles size={12} />}
        </strong>
        <span>
          {roll.characterName}
          {!compact && (
            <>
              {" "}
              <span className="dot">·</span> {roll.formula}
            </>
          )}
        </span>
      </div>
      <div className="roll-meta">
        {roll.visibility === "gm" && <EyeOff size={13} aria-label="Privada" />}
        {!compact && (
          <span className="roll-dice">
            [{roll.dice.join(", ")}]
            {roll.bonus !== 0
              ? `${roll.bonus > 0 ? " + " : " − "}${Math.abs(roll.bonus)}`
              : ""}
          </span>
        )}
        {roll.mode === "percentile" && (
          <span className={roll.success ? "success-text" : "danger-text"}>
            {roll.success ? "Sucesso" : "Falha"} / {roll.target}%
          </span>
        )}
        <time dateTime={roll.createdAt}>
          {new Date(roll.createdAt).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo",
          })}
        </time>
      </div>
    </div>
  );
}
export function DicePanel({
  campaigns,
  rolls,
  busy,
  expanded = false,
  onRoll,
  onHistory,
  onCreateCampaign,
}: {
  campaigns: Campaign[];
  rolls: Roll[];
  busy: boolean;
  expanded?: boolean;
  onRoll: (
    formula: string,
    campaignId: string,
    visibility: "table" | "gm",
  ) => Promise<void>;
  onHistory?: () => void;
  onCreateCampaign: () => void;
}) {
  const [die, setDie] = useState(20),
    [count, setCount] = useState(1),
    [bonus, setBonus] = useState(0),
    [formula, setFormula] = useState("1d20"),
    [campaignId, setCampaignId] = useState(campaigns[0]?.id || ""),
    [privateRoll, setPrivateRoll] = useState(false);
  const activeCampaignId = campaigns.some((c) => c.id === campaignId)
    ? campaignId
    : campaigns[0]?.id || "";
  const canPrivate =
    campaigns.find((c) => c.id === activeCampaignId)?.role === "gm";
  const last = rolls[0];
  function update(c: number, d: number, b: number) {
    setCount(c);
    setDie(d);
    setBonus(b);
    setFormula(`${c}d${d}${b > 0 ? `+${b}` : b < 0 ? b : ""}`);
  }
  return (
    <div className={`dice-panel ${expanded ? "expanded" : ""}`}>
      <div className="dice-panel-title">
        <span className="eyebrow">
          <Dices size={14} />
          DEIXE O DESTINO DECIDIR
        </span>
        {!expanded && <span className="live-dot" />}
      </div>
      <h3>Qual é a sua próxima jogada?</h3>
      <div className={`dice-stage ${busy ? "rolling" : ""}`}>
        <div className="orbit orbit-1" />
        <div className="orbit orbit-2" />
        <span className="orbit-star star-1">✦</span>
        <span className="orbit-star star-2">✦</span>
        <Die value={last?.total ?? "20"} />
        <span className="dice-stage-caption">
          {last
            ? last.critical
              ? "O destino sorriu. Crítico!"
              : `${last.label} · ${last.formula}`
            : "Toda história precisa de um pouco de sorte."}
        </span>
      </div>
      <div className="dice-types">
        {[4, 6, 8, 10, 12, 20, 100].map((d) => (
          <button
            key={d}
            className={die === d ? "active" : ""}
            onClick={() => update(count, d, bonus)}
          >
            d{d}
          </button>
        ))}
      </div>
      {expanded && (
        <div className="form-grid dice-controls">
          <Field label="Quantidade">
            <input
              type="number"
              min={1}
              max={30}
              value={count}
              onChange={(e) => update(Number(e.target.value), die, bonus)}
            />
          </Field>
          <Field label="Bônus">
            <input
              type="number"
              min={-1000}
              max={1000}
              value={bonus}
              onChange={(e) => update(count, die, Number(e.target.value))}
            />
          </Field>
        </div>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!activeCampaignId) {
            onCreateCampaign();
            return;
          }
          await onRoll(
            formula,
            activeCampaignId,
            privateRoll && canPrivate ? "gm" : "table",
          );
        }}
      >
        <label className="dice-formula">
          <span className="sr-only">Fórmula de dados</span>
          <Dices size={17} />
          <input
            aria-label="Fórmula de dados"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            maxLength={40}
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Rolando…" : "Rolar"}
            <ArrowUpRight size={15} />
          </Button>
        </label>
        {campaigns.length > 0 && (
          <div className="dice-context">
            <select
              aria-label="Campanha da rolagem"
              value={activeCampaignId}
              onChange={(e) => {
                setCampaignId(e.target.value);
                setPrivateRoll(false);
              }}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {expanded && canPrivate && (
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={privateRoll}
                  onChange={(e) => setPrivateRoll(e.target.checked)}
                />
                <EyeOff size={13} />
                Só para o mestre
              </label>
            )}
          </div>
        )}
      </form>
      {expanded && (
        <p className="small muted formula-guide">
          Ex.: 2d6+3 soma os dados. 3d20kh1+5 usa o maior. 2d20kl1 usa o menor.
        </p>
      )}
      {!expanded && (
        <div className="dice-panel-foot">
          <span>Um clique. Infinitas possibilidades.</span>
          <button
            className="icon-button"
            aria-label="Abrir histórico de rolagens"
            onClick={onHistory}
          >
            <History size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
export function RollHistory({
  rolls,
  compact = false,
}: {
  rolls: Roll[];
  compact?: boolean;
}) {
  return rolls.length ? (
    <div className="roll-list">
      {rolls.map((r) => (
        <RollRow key={r.id} roll={r} compact={compact} />
      ))}
    </div>
  ) : (
    <Empty
      icon={<Dices />}
      title="O destino ainda não foi lançado"
      description="Role uma perícia, um ataque ou um dado livre. O resultado aparece aqui."
    />
  );
}

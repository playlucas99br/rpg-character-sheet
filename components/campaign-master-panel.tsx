"use client";
import { useId, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { MasterPanelRoster } from "../lib/game/master-panel";
import {
  MAX_QUICK_ACTION_AMOUNT,
  quickResourceChange,
  type QuickAction,
} from "../lib/game/quick-actions";
import { systemById } from "../lib/game/systems";
import type { ResourceKey, Sheet } from "../lib/game/types";
import { Button, PageHeading } from "./ui";

const resources = ["hp", "ep", "sanity"] as const;

type OnResource = (
  sheetId: string,
  key: ResourceKey,
  delta: number,
) => Promise<boolean>;

function QuickActions({
  sheet,
  busy,
  onResource,
}: {
  sheet: Sheet;
  busy: boolean;
  onResource: OnResource;
}) {
  const amountId = useId();
  const feedbackId = useId();
  const pending = useRef(false);
  const [amount, setAmount] = useState("5");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const actions = [
    ["damage", "Dano"],
    ["heal", "Cura"],
    ["spend", `Gastar ${systemById(sheet.system).resourceLabels.ep}`],
  ] as const;
  const validAmount = quickResourceChange(sheet, "damage", Number(amount)) !== null;

  async function apply(action: QuickAction) {
    const change = quickResourceChange(sheet, action, Number(amount));
    if (busy || pending.current || !change) return;
    pending.current = true;
    setSaving(true);
    setFeedback("");
    try {
      if (await onResource(sheet.id, change.key, change.delta)) {
        setFeedback(`Alteração salva para ${sheet.name}.`);
      } else {
        setFeedback("Não foi possível confirmar o ajuste. Confira a sincronização antes de repetir.");
      }
    } catch {
      setFeedback("Não foi possível confirmar o ajuste. Confira a sincronização antes de repetir.");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="master-quick-actions" role="group" aria-label={`Ações rápidas de ${sheet.name}`}>
      <label htmlFor={amountId}>
        Quantidade
        <input
          id={amountId}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_QUICK_ACTION_AMOUNT}
          step={1}
          value={amount}
          disabled={busy || saving}
          aria-label={`Quantidade para ${sheet.name}`}
          aria-describedby={feedbackId}
          aria-invalid={!validAmount}
          onChange={(event) => {
            setAmount(event.target.value);
            setFeedback("");
          }}
        />
      </label>
      {actions.map(([action, label]) => {
        const change = quickResourceChange(sheet, action, Number(amount));
        return (
          <Button
            key={action}
            type="button"
            variant={action === "damage" ? "danger" : "secondary"}
            aria-label={`${label} em ${sheet.name}`}
            disabled={busy || saving || !change || change.next === sheet.resources[change.key].current}
            onClick={() => void apply(action)}
          >
            {label}
          </Button>
        );
      })}
      <p id={feedbackId} className="master-quick-feedback" role="status" aria-atomic="true">
        {!validAmount
          ? `Informe um número inteiro entre 1 e ${MAX_QUICK_ACTION_AMOUNT}.`
          : saving
            ? "Salvando ajuste…"
            : feedback || "Os ajustes respeitam zero e o valor máximo de cada recurso."}
      </p>
    </div>
  );
}

function SheetRoster({
  title,
  empty,
  sheets,
  onSheet,
  busy,
  onResource,
}: {
  title: string;
  empty: string;
  sheets: Sheet[];
  onSheet: (id: string) => void;
  busy: boolean;
  onResource: OnResource;
}) {
  return (
    <section className="master-roster-section">
      <h2>{title}</h2>
      {sheets.length ? (
        <ul className="master-roster" role="list">
          {sheets.map((sheet) => {
            const { resourceLabels } = systemById(sheet.system);
            return (
              <li key={sheet.id} className="master-roster-row">
                <div className="master-roster-identity">
                  <button
                    type="button"
                    className="text-button"
                    aria-label={`Abrir ficha de ${sheet.name}`}
                    onClick={() => onSheet(sheet.id)}
                  >
                    <span>{sheet.name}</span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </button>
                  {sheet.type === "character" && sheet.ownerName && (
                    <span>{sheet.ownerName}</span>
                  )}
                </div>
                <dl className="master-roster-stats">
                  {resources.map((key) => (
                    <div key={key} className={key}>
                      <dt>{resourceLabels[key]}</dt>
                      <dd aria-live="polite" aria-atomic="true">
                        {sheet.resources[key].current}
                        <small> / {sheet.resources[key].max}</small>
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt>Defesa</dt>
                    <dd>{sheet.defense}</dd>
                  </div>
                </dl>
                <QuickActions sheet={sheet} busy={busy} onResource={onResource} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">{empty}</p>
      )}
    </section>
  );
}

export default function CampaignMasterPanel({
  roster,
  onBack,
  onSheet,
  busy = false,
  onResource,
}: {
  roster: MasterPanelRoster;
  onBack: () => void;
  onSheet: (id: string) => void;
  busy?: boolean;
  onResource: OnResource;
}) {
  return (
    <div className="campaign-master-panel">
      <PageHeading title="Painel do mestre" description={roster.campaign.name}>
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft size={17} aria-hidden="true" />
          Voltar à campanha
        </Button>
      </PageHeading>
      <SheetRoster
        title="Personagens"
        empty="Esta campanha ainda não tem personagens."
        sheets={roster.characters}
        onSheet={onSheet}
        busy={busy}
        onResource={onResource}
      />
      <SheetRoster
        title="Criaturas"
        empty="Esta campanha ainda não tem criaturas."
        sheets={roster.creatures}
        onSheet={onSheet}
        busy={busy}
        onResource={onResource}
      />
    </div>
  );
}

"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import type { EncounterCondition } from "../lib/game/types";
import {
  conditionInputSchema,
  MAX_CONDITION_ROUNDS,
  MAX_ENCOUNTER_CONDITIONS,
} from "../lib/game/conditions";
import { Button } from "./ui";

export default function ConditionControls({
  conditions = [],
  participantName,
  disabled = false,
  onAdd,
  onRemove,
}: {
  conditions?: EncounterCondition[];
  participantName: string;
  disabled?: boolean;
  onAdd: (name: string, rounds: number | null) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
}) {
  const formId = useId();
  const pending = useRef(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<"rounds" | "manual">("rounds");
  const [rounds, setRounds] = useState("2");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const locked = disabled || saving;
  const atLimit = conditions.length >= MAX_ENCOUNTER_CONDITIONS;

  async function perform(operation: () => Promise<boolean>, success: string) {
    if (disabled || pending.current) return false;
    pending.current = true;
    setSaving(true);
    setError("");
    setFeedback("");
    try {
      if (!await operation()) {
        setError("Não foi possível confirmar a alteração. Sincronize antes de repetir.");
        return false;
      }
      setFeedback(success);
      return true;
    } catch {
      setError("Não foi possível confirmar a alteração. Sincronize antes de repetir.");
      return false;
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked || pending.current || atLimit) return;
    const input = conditionInputSchema.safeParse({
      name,
      remainingRounds: duration === "manual" ? null : Number(rounds),
    });
    if (!input.success) {
      setFeedback("");
      setError(`Informe o nome da condição e uma duração inteira de 1 a ${MAX_CONDITION_ROUNDS} rodadas, ou escolha até remover.`);
      return;
    }
    if (await perform(
      () => onAdd(input.data.name, input.data.remainingRounds),
      `Condição ${input.data.name} adicionada a ${participantName}.`,
    )) setName("");
  }

  return (
    <section className="encounter-conditions" aria-label={`Condições de ${participantName}`}>
      <h4>Condições</h4>
      {conditions.length ? (
        <ul className="encounter-condition-list" role="list">
          {conditions.map((condition) => (
            <li key={condition.id}>
              <div>
                <strong>{condition.name}</strong>
                <span>
                  {condition.remainingRounds === null
                    ? "Até remover"
                    : `${condition.remainingRounds} ${condition.remainingRounds === 1 ? "rodada restante" : "rodadas restantes"}`}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                disabled={locked}
                aria-label={`Remover ${condition.name} de ${participantName}`}
                onClick={() => void perform(
                  () => onRemove(condition.id),
                  `Condição ${condition.name} removida de ${participantName}.`,
                )}
              >
                <X size={16} aria-hidden="true" />
                Remover
              </Button>
            </li>
          ))}
        </ul>
      ) : <p className="encounter-condition-empty">Nenhuma condição ativa.</p>}
      <form className="encounter-condition-form" onSubmit={(event) => void add(event)}>
        <label htmlFor={`${formId}-name`} className="encounter-condition-name">
          Nova condição
          <input
            id={`${formId}-name`}
            aria-label={`Nova condição de ${participantName}`}
            aria-describedby={`${formId}-feedback`}
            required
            maxLength={80}
            value={name}
            disabled={locked || atLimit}
            onChange={(event) => { setName(event.target.value); setError(""); }}
          />
        </label>
        <label htmlFor={`${formId}-duration`}>
          Duração
          <select
            id={`${formId}-duration`}
            aria-label={`Duração da condição de ${participantName}`}
            value={duration}
            disabled={locked || atLimit}
            onChange={(event) => {
              setDuration(event.target.value as "rounds" | "manual");
              setError("");
            }}
          >
            <option value="rounds">Em rodadas</option>
            <option value="manual">Até remover</option>
          </select>
        </label>
        {duration === "rounds" && (
          <label htmlFor={`${formId}-rounds`}>
            Rodadas
            <input
              id={`${formId}-rounds`}
              aria-label={`Rodadas da condição de ${participantName}`}
              aria-describedby={`${formId}-feedback`}
              type="number"
              inputMode="numeric"
              required
              min={1}
              max={MAX_CONDITION_ROUNDS}
              step={1}
              value={rounds}
              disabled={locked || atLimit}
              onChange={(event) => { setRounds(event.target.value); setError(""); }}
            />
          </label>
        )}
        <Button type="submit" variant="secondary" disabled={locked || atLimit}>
          <Plus size={16} aria-hidden="true" />
          Adicionar condição
        </Button>
      </form>
      <p className="encounter-condition-help">A duração diminui ao completar a rodada. As condições não alteram atributos ou recursos automaticamente.</p>
      {atLimit && <p className="encounter-condition-help">Limite de {MAX_ENCOUNTER_CONDITIONS} condições. Remova uma para adicionar outra.</p>}
      <p id={`${formId}-feedback`} className="encounter-condition-feedback" role={error ? "alert" : "status"} aria-atomic="true">
        {error || (saving ? "Salvando condição…" : feedback)}
      </p>
    </section>
  );
}

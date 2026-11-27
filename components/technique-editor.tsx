"use client";

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { randomId } from "../lib/game/id";
import {
  MAX_TECHNIQUE_COOLDOWN,
  MAX_TECHNIQUE_COUNTERS,
  MAX_TECHNIQUE_VALUE,
  type AbilityTracking,
  type TrackedAbility,
} from "../lib/game/techniques";
import { Button, Field } from "./ui";

function bounded(value: string, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(Number(value) || 0)));
}

export function TechniqueEditor({ ability, onChange }: {
  ability: TrackedAbility;
  onChange: (ability: TrackedAbility) => void;
}) {
  const id = useId();
  const tracking = ability.tracking ?? {};
  const counters = tracking.counters ?? [];

  function setTracking<K extends keyof AbilityTracking>(key: K, value: AbilityTracking[K]) {
    const next = { ...tracking, [key]: value };
    if (value === undefined || (key === "counters" && Array.isArray(value) && value.length === 0))
      delete next[key];
    onChange({ ...ability, tracking: Object.keys(next).length ? next : null });
  }

  function changeCounter(index: number, patch: Partial<(typeof counters)[number]>) {
    setTracking("counters", counters.map((counter, position) => position === index ? { ...counter, ...patch } : counter));
  }

  return (
    <fieldset className="technique-settings">
      <legend>Usos, recarga e contadores</legend>
      <p className="technique-help">
        Configure somente o que a técnica precisa. Os controles são manuais pela ficha.
      </p>
      <label className="technique-toggle" htmlFor={`${id}-uses`}>
        <input
          id={`${id}-uses`}
          type="checkbox"
          checked={Boolean(tracking.uses)}
          onChange={(event) => setTracking("uses", event.target.checked ? { current: 1, max: 1 } : undefined)}
        />
        Limitar usos por combate
      </label>
      {tracking.uses && (
        <div className="technique-config-grid">
          <Field label="Usos por combate">
            <input
              type="number" min={1} max={MAX_TECHNIQUE_VALUE} required
              value={tracking.uses.max}
              onChange={(event) => {
                const max = bounded(event.target.value, 1, MAX_TECHNIQUE_VALUE);
                setTracking("uses", { max, current: Math.min(tracking.uses!.current, max) });
              }}
            />
          </Field>
          <Field label="Usos restantes">
            <input
              type="number" min={0} max={tracking.uses.max} required
              value={tracking.uses.current}
              onChange={(event) => setTracking("uses", {
                ...tracking.uses!, current: bounded(event.target.value, 0, tracking.uses!.max),
              })}
            />
          </Field>
        </div>
      )}
      <label className="technique-toggle" htmlFor={`${id}-cooldown`}>
        <input
          id={`${id}-cooldown`}
          type="checkbox"
          checked={Boolean(tracking.cooldown)}
          onChange={(event) => setTracking("cooldown", event.target.checked ? { rounds: 1, remaining: 0 } : undefined)}
        />
        Exigir recarga em rodadas após o uso
      </label>
      {tracking.cooldown && (
        <div className="technique-config-grid">
          <Field label="Recarga em rodadas">
            <input
              type="number" min={1} max={MAX_TECHNIQUE_COOLDOWN} required
              value={tracking.cooldown.rounds}
              onChange={(event) => {
                const rounds = bounded(event.target.value, 1, MAX_TECHNIQUE_COOLDOWN);
                setTracking("cooldown", { rounds, remaining: Math.min(tracking.cooldown!.remaining, rounds) });
              }}
            />
          </Field>
          <Field label="Rodadas restantes agora">
            <input
              type="number" min={0} max={tracking.cooldown.rounds} required
              value={tracking.cooldown.remaining}
              onChange={(event) => setTracking("cooldown", {
                ...tracking.cooldown!, remaining: bounded(event.target.value, 0, tracking.cooldown!.rounds),
              })}
            />
          </Field>
        </div>
      )}
      <div className="technique-custom-heading">
        <strong>Contadores próprios</strong>
        <span>{counters.length} / {MAX_TECHNIQUE_COUNTERS}</span>
      </div>
      <p className="technique-help">
        Por exemplo, sorte ou concentração. Ajuste cada contador manualmente; usar a técnica e iniciar um novo combate não alteram esses valores.
      </p>
      {counters.map((counter, index) => (
        <div className="technique-counter-editor" key={counter.id}>
          <div className="technique-counter-editor-heading">
            <strong>Contador {index + 1}</strong>
            <button
              type="button" className="icon-button danger-text"
              aria-label={`Remover contador ${counter.name || index + 1} de ${ability.name}`}
              onClick={() => setTracking("counters", counters.filter((item) => item.id !== counter.id))}
            >
              <Trash2 size={16} />
            </button>
          </div>
          <Field label="Nome do contador">
            <input
              value={counter.name} maxLength={80} required placeholder="Ex.: Sorte"
              onChange={(event) => changeCounter(index, { name: event.target.value })}
            />
          </Field>
          <div className="technique-config-grid">
            <Field label="Máximo do contador">
              <input
                type="number" min={1} max={MAX_TECHNIQUE_VALUE} required value={counter.max}
                onChange={(event) => {
                  const max = bounded(event.target.value, 1, MAX_TECHNIQUE_VALUE);
                  changeCounter(index, { max, current: Math.min(counter.current, max) });
                }}
              />
            </Field>
            <Field label="Valor atual do contador">
              <input
                type="number" min={0} max={counter.max} required value={counter.current}
                onChange={(event) => changeCounter(index, { current: bounded(event.target.value, 0, counter.max) })}
              />
            </Field>
          </div>
        </div>
      ))}
      <Button
        type="button" variant="secondary"
        disabled={counters.length >= MAX_TECHNIQUE_COUNTERS}
        onClick={() => setTracking("counters", [...counters, { id: randomId(), name: "Novo contador", current: 1, max: 1 }])}
      >
        <Plus size={15} /> Adicionar contador
      </Button>
    </fieldset>
  );
}

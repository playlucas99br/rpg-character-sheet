"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  MAX_INVENTORY_COUNTER,
  inventoryCounterLabel,
  inventoryCounterWarning,
  type CounterInventoryItem,
  type InventoryCounter,
  type InventoryCounterOperation,
} from "../lib/game/inventory-counters";
import { Button, Field } from "./ui";

export function InventoryCounterEditor({
  item,
  onChangeItem,
}: {
  item: CounterInventoryItem;
  onChangeItem: (item: CounterInventoryItem) => void;
}) {
  const counter = item.counter;
  const setCounter = (next: InventoryCounter | null) => onChangeItem({ ...item, counter: next });
  return (
    <div className="inventory-counter-editor">
      <label className="inventory-counter-toggle">
        <input
          type="checkbox"
          checked={!!counter}
          onChange={(event) => setCounter(event.target.checked ? { kind: "charges", current: 1, max: 1 } : null)}
        />
        Controlar munição ou cargas
      </label>
      {counter && (
        <>
          <div className="inventory-counter-fields">
            <Field label="Tipo de contador">
              <select value={counter.kind} onChange={(event) => setCounter({ ...counter, kind: event.target.value as InventoryCounter["kind"] })}>
                <option value="ammunition">Munição</option>
                <option value="charges">Cargas</option>
                <option value="consumable">Usos de consumível</option>
              </select>
            </Field>
            <Field label="Nome do contador" hint="Opcional. Ex.: balas no carregador.">
              <input value={counter.label ?? ""} maxLength={80} onChange={(event) => setCounter({ ...counter, label: event.target.value })} />
            </Field>
            <Field label="Usos disponíveis">
              <input type="number" min={0} max={counter.max} step={1} inputMode="numeric" value={counter.current} onChange={(event) => setCounter({ ...counter, current: Number(event.target.value) })} />
            </Field>
            <Field label="Máximo de usos">
              <input type="number" min={1} max={MAX_INVENTORY_COUNTER} step={1} inputMode="numeric" value={counter.max} onChange={(event) => setCounter({ ...counter, max: Number(event.target.value) })} />
            </Field>
          </div>
          <p className="inventory-counter-hint">Ajuste os usos manualmente durante a sessão. A quantidade de itens é controlada separadamente.</p>
        </>
      )}
    </div>
  );
}

export function InventoryCounterControls({
  item,
  busy = false,
  onAdjust,
}: {
  item: CounterInventoryItem;
  busy?: boolean;
  onAdjust?: (operation: InventoryCounterOperation, amount: number) => Promise<boolean>;
}) {
  const [amount, setAmount] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const counter = item.counter;
  if (!counter) return null;
  const label = inventoryCounterLabel(counter);
  const adjust = async (operation: InventoryCounterOperation) => {
    const value = Number(amount);
    const warning = inventoryCounterWarning(counter, operation, value);
    setError(warning);
    if (warning || !onAdjust) return;
    await onAdjust(operation, value);
  };
  return (
    <div className="inventory-counter-controls">
      <p className="inventory-counter-value"><span>{label}</span><strong aria-live="polite">{counter.current} / {counter.max}</strong></p>
      {onAdjust && (
        <>
          <div className="inventory-counter-actions">
            <label htmlFor={inputId}>Quantidade a ajustar</label>
            <input
              id={inputId}
              type="number"
              min={1}
              max={MAX_INVENTORY_COUNTER}
              step={1}
              inputMode="numeric"
              value={amount}
              disabled={busy}
              aria-label={`Quantidade de ${label} de ${item.name}`}
              aria-invalid={!!error}
              aria-describedby={error ? `${inputId}-error` : undefined}
              onChange={(event) => { setAmount(event.target.value); setError(null); }}
            />
            <Button type="button" variant="secondary" disabled={busy} aria-label={`Gastar ${label} de ${item.name}`} onClick={() => { void adjust("consume"); }}><Minus size={15} />Gastar</Button>
            <Button type="button" variant="secondary" disabled={busy} aria-label={`Repor ${label} de ${item.name}`} onClick={() => { void adjust("replenish"); }}><Plus size={15} />Repor</Button>
          </div>
          {error && <p className="form-error" id={`${inputId}-error`} role="alert">{error}</p>}
        </>
      )}
    </div>
  );
}

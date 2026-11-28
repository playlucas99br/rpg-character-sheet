"use client";

import { Clock3, Minus, Plus, RotateCcw } from "lucide-react";
import type { Sheet } from "../lib/game/types";
import { hasTechniqueTracking, type TechniqueControl, type TrackedAbility } from "../lib/game/techniques";
import { Button } from "./ui";

export function AbilityTrackingSummary({ ability }: { ability: TrackedAbility }) {
  const tracking = ability.tracking;
  if (!tracking || !hasTechniqueTracking(ability)) return null;
  return (
    <div className="technique-status" aria-label={`Controles de ${ability.name}`}>
      {tracking.uses && (
        <span className={tracking.uses.current === 0 ? "technique-status-blocked" : ""}>
          Usos no combate: {tracking.uses.current} / {tracking.uses.max}
        </span>
      )}
      {tracking.cooldown && (
        <span className={tracking.cooldown.remaining > 0 ? "technique-status-blocked" : ""}>
          {tracking.cooldown.remaining > 0
            ? `Recarga: ${tracking.cooldown.remaining} ${tracking.cooldown.remaining === 1 ? "rodada" : "rodadas"}`
            : "Recarga pronta"}
        </span>
      )}
    </div>
  );
}

export function TechniqueControls({ sheet, busy, onControl, onWarning }: {
  sheet: Sheet;
  busy: boolean;
  onControl: (control: TechniqueControl) => Promise<boolean>;
  onWarning: (message: string) => void;
}) {
  const abilities = sheet.abilities.filter(hasTechniqueTracking) as TrackedAbility[];
  if (!abilities.length) return null;
  const hasCombatControl = abilities.some((ability) => ability.tracking?.uses || ability.tracking?.cooldown);
  const hasCooldown = abilities.some((ability) => ability.tracking?.cooldown);
  const resetNeeded = abilities.some((ability) => {
    const tracking = ability.tracking;
    return (tracking?.uses && tracking.uses.current < tracking.uses.max)
      || (tracking?.cooldown && tracking.cooldown.remaining > 0);
  });
  const cooldownRunning = abilities.some((ability) => (ability.tracking?.cooldown?.remaining ?? 0) > 0);
  const customCounters = abilities.filter((ability) => ability.tracking?.counters?.length);

  async function control(value: TechniqueControl) {
    if (busy) return;
    try {
      await onControl(value);
    } catch (error) {
      onWarning(error instanceof Error ? error.message : "Não foi possível atualizar os controles da técnica.");
    }
  }

  return (
    <div className="technique-controls">
      <h4>Controles manuais das técnicas</h4>
      {hasCombatControl && (
        <>
          <p className="technique-help">
            Novo combate restaura os usos e libera as recargas desta ficha. A energia e os contadores próprios permanecem como estão.
          </p>
          <div className="technique-toolbar">
            <Button type="button" variant="secondary" disabled={busy || !resetNeeded}
              onClick={() => void control({ kind: "reset_combat" })}>
              <RotateCcw size={15} /> Novo combate
            </Button>
            {hasCooldown && (
              <Button type="button" variant="secondary" disabled={busy || !cooldownRunning}
                onClick={() => void control({ kind: "advance_cooldown" })}>
                <Clock3 size={15} /> Avançar recarga em 1 rodada
              </Button>
            )}
          </div>
          {hasCooldown && (
            <p className="technique-help">Avance a recarga uma vez quando a mesa mudar de rodada. Os encontros não alteram esses valores automaticamente.</p>
          )}
        </>
      )}
      {customCounters.map((ability) => (
        <div className="technique-counter-group" key={ability.id}>
          <h5>{ability.name}</h5>
          {ability.tracking!.counters!.map((counter) => (
            <div className="technique-counter-row" key={counter.id}>
              <strong>{counter.name}</strong>
              <div className="technique-counter-stepper">
                <button type="button" className="icon-button"
                  aria-label={`Consumir 1 de ${counter.name} de ${ability.name}`}
                  disabled={busy || counter.current === 0}
                  onClick={() => void control({ kind: "adjust_counter", abilityId: ability.id, counterId: counter.id, delta: -1 })}>
                  <Minus size={16} />
                </button>
                <span aria-live="polite" aria-atomic="true">{counter.current} / {counter.max}</span>
                <button type="button" className="icon-button"
                  aria-label={`Repor 1 de ${counter.name} de ${ability.name}`}
                  disabled={busy || counter.current === counter.max}
                  onClick={() => void control({ kind: "adjust_counter", abilityId: ability.id, counterId: counter.id, delta: 1 })}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
      {customCounters.length > 0 && (
        <p className="technique-help">Os contadores são ajustados pelos botões. O uso da técnica não os consome automaticamente.</p>
      )}
    </div>
  );
}

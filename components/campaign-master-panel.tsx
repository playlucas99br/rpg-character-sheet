"use client";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { MasterPanelRoster } from "../lib/game/master-panel";
import { systemById } from "../lib/game/systems";
import type { Sheet } from "../lib/game/types";
import { Button, PageHeading } from "./ui";

const resources = ["hp", "ep", "sanity"] as const;

function SheetRoster({
  title,
  empty,
  sheets,
  onSheet,
}: {
  title: string;
  empty: string;
  sheets: Sheet[];
  onSheet: (id: string) => void;
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
                      <dd>
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
}: {
  roster: MasterPanelRoster;
  onBack: () => void;
  onSheet: (id: string) => void;
}) {
  return (
    <div className="campaign-master-panel">
      <PageHeading title="Painel do mestre" description={roster.campaign.name}>
        <Button type="button" variant="secondary" onClick={onBack}>
          <ArrowLeft size={17} aria-hidden="true" />
          Voltar à campanha
        </Button>
      </PageHeading>
      <SheetRoster
        title="Personagens"
        empty="Esta campanha ainda não tem personagens."
        sheets={roster.characters}
        onSheet={onSheet}
      />
      <SheetRoster
        title="Criaturas"
        empty="Esta campanha ainda não tem criaturas."
        sheets={roster.creatures}
        onSheet={onSheet}
      />
    </div>
  );
}

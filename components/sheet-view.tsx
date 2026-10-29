"use client";
import { useId, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Brain,
  Copy,
  Download,
  Dices,
  EyeOff,
  Heart,
  Minus,
  Pencil,
  Plus,
  Printer,
  Search,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Trash2,
  Zap,
} from "lucide-react";
import type {
  Campaign,
  ResourceKey,
  Roll,
  RollRequest,
  Sheet,
} from "../lib/game/types";
import { attributeFormula } from "../lib/game/dice";
import { isOrdem, systemById } from "../lib/game/systems";
import {
  Button,
  Empty,
  Field,
  Modal,
  Portrait,
  SectionTitle,
  SystemMark,
  TabList,
} from "./ui";
import SheetEditor from "./sheet-editor";
import { RollHistory } from "./dice-panel";
import SyncIndicator from "./sync-status";
import type { SyncStatus } from "../lib/game/client-sync";

function ResourceCard({
  sheet,
  resourceKey,
  busy,
  onChange,
}: {
  sheet: Sheet;
  resourceKey: ResourceKey;
  busy: boolean;
  onChange: (key: ResourceKey, delta: number) => Promise<boolean>;
}) {
  const [adjust, setAdjust] = useState(false),
    [amount, setAmount] = useState(5);
  const r = sheet.resources[resourceKey],
    Icon = resourceKey === "hp" ? Heart : resourceKey === "ep" ? Zap : Brain;
  return (
    <div className={`resource-card ${resourceKey}`}>
      <div>
        <span>
          <Icon size={16} />
          {systemById(sheet.system).resourceLabels[resourceKey]}
        </span>
        <button
          className="icon-button"
          aria-label={`Ajustar ${systemById(sheet.system).resourceLabels[resourceKey]}`}
          onClick={() => setAdjust(true)}
        >
          <Pencil size={13} />
        </button>
      </div>
      <div className="resource-value">
        <button
          aria-label={`Diminuir ${systemById(sheet.system).resourceLabels[resourceKey]} em 1`}
          className="resource-step"
          disabled={busy || r.current === 0}
          onClick={() => onChange(resourceKey, -1)}
        >
          <Minus size={16} />
        </button>
        <strong aria-live="polite" aria-atomic="true">
          {r.current}
          <span>/ {r.max}</span>
        </strong>
        <button
          aria-label={`Aumentar ${systemById(sheet.system).resourceLabels[resourceKey]} em 1`}
          className="resource-step"
          disabled={busy || r.current === r.max}
          onClick={() => onChange(resourceKey, 1)}
        >
          <Plus size={16} />
        </button>
      </div>
      <progress
        max={r.max}
        value={r.current}
        aria-label={`${systemById(sheet.system).resourceLabels[resourceKey]}: ${r.current} de ${r.max}`}
      />
      {adjust && (
        <Modal
          title={`Ajustar ${systemById(sheet.system).resourceLabels[resourceKey].toLowerCase()}`}
          subtitle={`Atual: ${r.current} / ${r.max}`}
          onClose={() => setAdjust(false)}
        >
          <div className="modal-body">
            <Field label="Quantidade">
              <input
                type="number"
                min={1}
                max={9999}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                autoFocus
              />
            </Field>
            <div className="form-grid">
              <Button
                variant="danger"
                disabled={
                  busy ||
                  !Number.isInteger(amount) ||
                  amount < 1 ||
                  amount > 9999
                }
                onClick={async () => {
                  if (await onChange(resourceKey, -amount)) setAdjust(false);
                }}
              >
                <Minus size={16} />
                {resourceKey === "hp" ? "Receber dano" : "Gastar"}
              </Button>
              <Button
                disabled={
                  busy ||
                  !Number.isInteger(amount) ||
                  amount < 1 ||
                  amount > 9999
                }
                onClick={async () => {
                  if (await onChange(resourceKey, amount)) setAdjust(false);
                }}
              >
                <Plus size={16} />
                Recuperar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
function SkillList({
  sheet,
  busy,
  onRoll,
}: {
  sheet: Sheet;
  busy: boolean;
  onRoll: (request: RollRequest) => void;
}) {
  const [query, setQuery] = useState(""),
    [trained, setTrained] = useState(false);
  const filtered = sheet.skills.filter(
    (s) =>
      s.name
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")) &&
      (!trained || s.bonus > 0),
  );
  return (
    <div className="panel skills-panel">
      <div className="panel-heading">
        <div>
          <h3>Perícias</h3>
          <p>Escolha uma perícia para fazer seu teste.</p>
        </div>
        <button
          className={`filter-pill ${trained ? "active" : ""}`}
          aria-pressed={trained}
          onClick={() => setTrained(!trained)}
        >
          {sheet.system === "cthulhu" ? "Com pontos" : "Treinadas"}
        </button>
      </div>
      <label className="search-field">
        <Search size={16} />
        <input
          placeholder="Buscar perícia…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar perícia"
        />
      </label>
      <div className="skill-table">
        {filtered.map((s) => (
          <button
            key={s.id}
            disabled={busy}
            title={
              sheet.system === "cthulhu"
                ? `1d100 ≤ ${s.bonus}%`
                : attributeFormula(sheet, s.attribute, s.bonus)
            }
            className="skill-row"
            onClick={() => onRoll({ kind: "skill", id: s.id })}
          >
            <span className={`training-dot ${s.bonus > 0 ? "trained" : ""}`} />
            <strong>{s.name}</strong>
            <span className="attribute-chip">{s.attribute}</span>
            <span className="skill-bonus">
              {sheet.system === "cthulhu"
                ? `${s.bonus}%`
                : `${s.bonus >= 0 ? "+" : ""}${s.bonus}`}
            </span>
            <Dices size={16} />
          </button>
        ))}
      </div>
      {!filtered.length && (
        <p className="inline-empty">Nenhuma perícia encontrada.</p>
      )}
    </div>
  );
}
export default function SheetView({
  sheet,
  campaign,
  rolls,
  busy,
  draftScope,
  syncStatus,
  lastSavedAt,
  demo,
  onBack,
  onSave,
  onResource,
  onRoll,
  onDelete,
  onDuplicate,
  notify,
}: {
  sheet: Sheet;
  campaign: Campaign;
  rolls: Roll[];
  busy: boolean;
  draftScope: string;
  syncStatus: SyncStatus;
  lastSavedAt?: string;
  demo: boolean;
  onBack: () => void;
  onSave: (s: Sheet) => Promise<boolean>;
  onResource: (key: ResourceKey, delta: number) => Promise<boolean>;
  onRoll: (request: RollRequest) => void;
  onDelete: () => Promise<boolean>;
  onDuplicate: () => void;
  notify: (message: string) => void;
}) {
  const tabsId = useId();
  const [tab, setTab] = useState("combat"),
    [editing, setEditing] = useState<string | null>(null),
    [deleting, setDeleting] = useState(false);
  const system = systemById(sheet.system),
    ordem = isOrdem(sheet.system);
  const exportSheet = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: "nexo-sheet",
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            sheet,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${sheet.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-ficha.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    notify("Ficha exportada.");
  };
  return (
    <>
      <div className="sheet-screen">
        <div className="sheet-topline">
          <button className="text-button" onClick={onBack}>
            <ArrowLeft size={15} />
            {campaign.name}
          </button>
          <div>
            {sheet.type === "monster" && (
              <span className="private-tag">
                <EyeOff size={13} />
                Visível só para o mestre
              </span>
            )}
            <SyncIndicator status={syncStatus} lastSavedAt={lastSavedAt} demo={demo} />
          </div>
        </div>
        <div className="character-header">
          <Portrait sheet={sheet} size="large" />
          <div className="character-title">
            <SystemMark system={sheet.system} />
            <h1>{sheet.name}</h1>
            <p>
              {sheet.className || "Sua história está apenas começando"}
              <span className="dot">·</span>
              {ordem ? `NEX ${sheet.exposure}%` : `Nível ${sheet.level}`}
              <span className="dot">·</span>
              {sheet.ownerName}
            </p>
          </div>
          <div className="heading-actions">
            <button
              className="icon-button"
              aria-label="Exportar ficha em JSON"
              title="Exportar JSON"
              onClick={exportSheet}
            >
              <Download size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Imprimir ficha"
              onClick={() => window.print()}
            >
              <Printer size={18} />
            </button>
            <Button variant="secondary" onClick={() => setEditing("general")}>
              <Pencil size={15} />
              Editar ficha
            </Button>
            <Button variant="secondary" disabled={busy} onClick={onDuplicate}>
              <Copy size={15} />
              Duplicar ficha
            </Button>
          </div>
        </div>
        <div className="resource-grid">
          {(["hp", "ep", "sanity"] as const).map((k) => (
            <ResourceCard
              key={k}
              sheet={sheet}
              resourceKey={k}
              busy={busy}
              onChange={onResource}
            />
          ))}
        </div>
        <div className="attributes-bar">
          {system.attributes.map((a) => (
            <button
              key={a.key}
              className="attribute-card"
              title={`Rolar ${a.name}`}
              aria-label={`Rolar ${a.name}: ${sheet.attributes[a.key]}`}
              disabled={busy}
              onClick={() => onRoll({ kind: "attribute", id: a.key })}
            >
              <span>{a.key}</span>
              <strong>{sheet.attributes[a.key]}</strong>
              <small>{a.name}</small>
              <Dices size={14} />
            </button>
          ))}
          <div className="defense-card">
            <Shield size={20} />
            <strong>{sheet.defense}</strong>
            <small>Defesa</small>
          </div>
        </div>
        <TabList
          id={tabsId}
          className="sheet-tabs"
          label="Seções da ficha"
          value={tab}
          onChange={setTab}
          tabs={[
            ["combat", "Combate e técnicas"],
            ["skills", "Perícias"],
            ["story", "História e equipamento"],
            ["history", "Rolagens"],
          ]}
        />
        <div role="tabpanel" id={`${tabsId}-panel-${tab}`} aria-labelledby={`${tabsId}-tab-${tab}`} tabIndex={0}>
        {tab === "combat" && (
          <div className="sheet-content-grid">
            <div>
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>
                      <Swords size={17} />
                      Ataques
                    </h3>
                    <p>Acerto e dano, na ponta dos dedos.</p>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Editar ataques"
                    onClick={() => setEditing("attacks")}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {sheet.attacks.length ? (
                  sheet.attacks.map((a) => (
                    <div className="attack-row" key={a.id}>
                      <div className="attack-icon">
                        <Swords size={19} />
                      </div>
                      <div className="attack-info">
                        <h4>{a.name}</h4>
                        <span>
                          {a.range || "Alcance livre"}
                          <span className="dot">·</span>
                          {a.damage}
                          <span className="dot">·</span>Crítico {a.critical}
                        </span>
                        {a.description && <p>{a.description}</p>}
                      </div>
                      <div className="attack-actions">
                        <Button
                          disabled={busy}
                          variant="secondary"
                          aria-label={`Rolar acerto de ${a.name}`}
                          onClick={() => onRoll({ kind: "attack", id: a.id })}
                        >
                          <Dices size={14} />
                          Acerto
                        </Button>
                        <Button
                          disabled={busy}
                          variant="ghost"
                          aria-label={`Rolar dano de ${a.name}`}
                          onClick={() =>
                            onRoll({ kind: "attack", id: a.id, damage: true })
                          }
                        >
                          Dano
                          <ArrowUpRight size={14} />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="panel-empty">
                    <Swords size={24} />
                    <p>Prepare suas armas.</p>
                    <button
                      className="text-button"
                      onClick={() => setEditing("attacks")}
                    >
                      Adicionar ataque
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
              {sheet.rituals?.length > 0 && (
                <div className="panel section-gap-small">
                  <div className="panel-heading">
                    <div>
                      <h3><Sparkles size={17} /> Rituais conhecidos</h3>
                      <p>Adicionados pela biblioteca da mesa.</p>
                    </div>
                  </div>
                  <div className="ritual-chip-list">
                    {sheet.rituals.map((ritual) => (
                      <div className="ritual-chip" key={ritual.id}>
                        <strong>{ritual.name}</strong>
                        <span>{ritual.element} · {ritual.circle}º círculo</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="panel section-gap-small">
                <div className="panel-heading">
                  <div>
                    <h3>
                      <Sparkles size={17} />
                      {sheet.system === "jujutsu"
                        ? "Técnicas amaldiçoadas"
                        : "Habilidades e rituais"}
                    </h3>
                    <p>Seu poder, do seu jeito.</p>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Editar habilidades"
                    onClick={() => setEditing("abilities")}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {sheet.abilities.length ? (
                  sheet.abilities.map((a) => (
                    <div className="ability-row" key={a.id}>
                      <div>
                        <span className="ability-cost">
                          <Zap size={12} />
                          {a.cost} {sheet.system === "jujutsu" ? "EA" : "PE"}
                        </span>
                        <h4>{a.name}</h4>
                        <p>
                          {a.description ||
                            "Uma habilidade à espera de sua descrição."}
                        </p>
                        <Button
                          variant="secondary"
                          disabled={busy || sheet.resources.ep.current < a.cost}
                          onClick={() => {
                            if (a.formula)
                              onRoll({ kind: "ability", id: a.id });
                            else void onResource("ep", -a.cost);
                          }}
                        >
                          {a.formula ? <Dices size={14} /> : <Zap size={14} />}
                          {a.formula
                            ? `Usar e rolar ${a.formula}`
                            : "Usar habilidade"}
                          <ArrowUpRight size={14} />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="panel-empty">
                    <Sparkles size={24} />
                    <p>O que torna seu personagem único?</p>
                    <button
                      className="text-button"
                      onClick={() => setEditing("abilities")}
                    >
                      Adicionar habilidade
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <aside>
              <div className="panel character-about">
                <span className="eyebrow">POR TRÁS DO PERSONAGEM</span>
                <h3>Todo herói tem uma história.</h3>
                <p>
                  {sheet.description ||
                    "Descreva a aparência, a personalidade e os caminhos que trouxeram seu personagem até aqui."}
                </p>
                {sheet.origin && (
                  <div className="info-line">
                    <span>Origem</span>
                    <strong>{sheet.origin}</strong>
                  </div>
                )}
                <div className="info-line">
                  <span>Jogador</span>
                  <strong>{sheet.ownerName}</strong>
                </div>
                <div className="info-line">
                  <span>Campanha</span>
                  <strong>{campaign.name}</strong>
                </div>
                <button
                  className="text-button"
                  onClick={() => setEditing("general")}
                >
                  Continuar a história
                  <ArrowUpRight size={14} />
                </button>
              </div>
              <div className="hint-box sheet-hint">
                <Dices size={18} />
                <p>
                  {ordem
                    ? "Clique em um atributo ou perícia para rolar seus d20. O maior resultado é somado ao bônus; com atributo 0, vale o menor de 2d20."
                    : "Clique em um atributo ou perícia para fazer o teste. Você também pode usar fórmulas livres no rolador."}
                </p>
              </div>
            </aside>
          </div>
        )}
        {tab === "skills" && (
          <SkillList sheet={sheet} busy={busy} onRoll={onRoll} />
        )}
        {tab === "story" && (
          <div className="story-grid">
            <div className="panel notes-panel">
              <SectionTitle
                title="Equipamento"
                action="Editar"
                onAction={() => setEditing("notes")}
              />
              <p className="preserve-lines">
                {sheet.inventory || "Sua mochila ainda está vazia."}
              </p>
            </div>
            <div className="panel notes-panel">
              <SectionTitle
                title="Notas da jornada"
                action="Editar"
                onAction={() => setEditing("notes")}
              />
              <p className="preserve-lines">
                {sheet.notes ||
                  "As melhores histórias merecem ser lembradas. Registre a sua aqui."}
              </p>
            </div>
          </div>
        )}
        {tab === "history" && (
          <div className="panel history-panel">
            <SectionTitle
              title="O destino deste personagem"
              subtitle="Os últimos testes, ataques e habilidades desta ficha."
            />
            <RollHistory rolls={rolls.filter((r) => r.sheetId === sheet.id)} />
          </div>
        )}
        </div>
        <div className="sheet-bottom">
          <span>
            Ficha de {system.name} <span className="dot">·</span>{" "}
            {system.support === "base"
              ? "Modelo inicial • regras específicas editáveis"
              : "Regras e valores configuráveis pela mesa"}
          </span>
          <button
            className="text-button danger-text"
            onClick={() => setDeleting(true)}
          >
            <Trash2 size={13} />
            Excluir ficha
          </button>
        </div>
      </div>
      <div className="print-sheet">
        <h1>{sheet.name}</h1>
        <p>
          {system.name} · {campaign.name} · {sheet.className} ·{" "}
          {sheet.ownerName}
        </p>
        <h2>Recursos e atributos</h2>
        <p>
          Defesa: {sheet.defense} ·{" "}
          {Object.entries(sheet.resources)
            .map(
              ([k, v]) =>
                `${system.resourceLabels[k as ResourceKey]}: ${v.current}/${v.max}`,
            )
            .join(" · ")}
        </p>
        <p>
          {system.attributes
            .map((a) => `${a.name}: ${sheet.attributes[a.key]}`)
            .join(" · ")}
        </p>
        <h2>Perícias</h2>
        <div className="print-skills">
          {sheet.skills.map((s) => (
            <p key={s.id}>
              {s.name} ({s.attribute}): {s.bonus}
            </p>
          ))}
        </div>
        <h2>Ataques e habilidades</h2>
        {sheet.attacks.map((a) => (
          <p key={a.id}>
            <b>{a.name}</b> · {a.damage} · {a.range} · {a.description}
          </p>
        ))}
        {sheet.abilities.map((a) => (
          <p key={a.id}>
            <b>{a.name}</b> · Custo {a.cost} · {a.formula} · {a.description}
          </p>
        ))}
        <h2>História</h2>
        <p className="preserve-lines">{sheet.description}</p>
        <h2>Equipamento</h2>
        <p className="preserve-lines">{sheet.inventory}</p>
        <h2>Notas</h2>
        <p className="preserve-lines">{sheet.notes}</p>
      </div>
      {editing && (
        <SheetEditor
          key={`${draftScope}:${sheet.id}`}
          draftScope={draftScope}
          sheet={sheet}
          initialTab={editing}
          busy={busy}
          onSave={onSave}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <Modal
          title={`Excluir ${sheet.name}?`}
          subtitle="Esta ficha será excluída permanentemente."
          onClose={() => setDeleting(false)}
        >
          <div className="modal-body">
            <p className="muted">
              Exporte uma cópia antes, se quiser guardar os dados. As rolagens
              anteriores continuam no histórico da campanha.
            </p>
          </div>
          <div className="modal-footer">
            <Button variant="ghost" onClick={() => setDeleting(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                if (await onDelete()) setDeleting(false);
              }}
            >
              <Trash2 size={16} />
              Excluir ficha
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

"use client";
import { randomId } from "../lib/game/id";
import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import type { Sheet } from "../lib/game/types";
import { isOrdem, systemById } from "../lib/game/systems";
import { sheetSchema } from "../lib/game/validation";
import { Button, Field, Modal } from "./ui";

export default function SheetEditor({
  sheet,
  initialTab = "general",
  busy,
  onSave,
  onClose,
}: {
  sheet: Sheet;
  initialTab?: string;
  busy: boolean;
  onSave: (value: Sheet) => Promise<boolean>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Sheet>(() => structuredClone(sheet)),
    [tab, setTab] = useState(initialTab),
    [error, setError] = useState("");
  const system = systemById(sheet.system),
    ordem = isOrdem(sheet.system);
  const set = <K extends keyof Sheet>(key: K, value: Sheet[K]) =>
    setDraft((s) => ({ ...s, [key]: value }));
  const tabs = [
    ["general", "Identidade"],
    ["attributes", "Atributos"],
    ["skills", "Perícias"],
    ["attacks", "Ataques"],
    ["abilities", "Habilidades"],
    ["notes", "Equipamento e notas"],
  ];
  return (
    <Modal
      title={`Editar ${sheet.type === "monster" ? "criatura" : "personagem"}`}
      subtitle="Deixe a ficha com a cara da sua história."
      wide
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const parsed = sheetSchema.safeParse(draft);
          if (!parsed.success) {
            setError(parsed.error.issues[0].message);
            return;
          }
          setError("");
          if (await onSave(draft)) onClose();
        }}
      >
        <div
          className="editor-tabs"
          role="tablist"
          aria-label="Seções de edição"
        >
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => {
                setTab(key);
                setError("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="modal-body editor-body">
          {tab === "general" && (
            <>
              <Field label="Nome">
                <input
                  value={draft.name}
                  maxLength={100}
                  required
                  onChange={(e) => set("name", e.target.value)}
                />
              </Field>
              <div className="form-grid">
                <Field
                  label={
                    sheet.type === "monster"
                      ? "Categoria / grau"
                      : "Classe / trilha"
                  }
                >
                  <input
                    value={draft.className}
                    maxLength={100}
                    onChange={(e) => set("className", e.target.value)}
                    placeholder={
                      ordem ? "Ex.: Combatente • Guerreiro" : "Ex.: Guerreiro"
                    }
                  />
                </Field>
                <Field label="Origem / espécie">
                  <input
                    value={draft.origin}
                    maxLength={100}
                    onChange={(e) => set("origin", e.target.value)}
                    placeholder="Sua origem"
                  />
                </Field>
                <Field label={ordem ? "NEX (%)" : "Nível"}>
                  <input
                    type="number"
                    value={ordem ? draft.exposure : draft.level}
                    min={ordem ? 0 : 1}
                    max={100}
                    onChange={(e) =>
                      ordem
                        ? set("exposure", Number(e.target.value))
                        : set("level", Number(e.target.value))
                    }
                  />
                </Field>
                <Field label="Defesa">
                  <input
                    type="number"
                    value={draft.defense}
                    min={0}
                    max={999}
                    onChange={(e) => set("defense", Number(e.target.value))}
                  />
                </Field>
              </div>
              <Field label="História e aparência">
                <textarea
                  rows={4}
                  maxLength={4000}
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
              <div className="field">
                <span>Cor do personagem</span>
                <div className="tone-picker">
                  {["blue", "violet", "rose", "amber", "green"].map((t, i) => (
                    <button
                      aria-label={
                        ["Azul", "Violeta", "Rosa", "Âmbar", "Verde"][i]
                      }
                      className={`${t} ${draft.tone === t ? "selected" : ""}`}
                      key={t}
                      type="button"
                      onClick={() => set("tone", t)}
                    >
                      {draft.tone === t && <Check size={15} />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {tab === "attributes" && (
            <>
              <p className="muted small">
                {ordem
                  ? "O atributo define quantos d20 serão rolados. Atributo 0 usa o menor entre 2d20."
                  : sheet.system === "dnd"
                    ? "Insira os valores dos atributos. O modificador é calculado como (valor − 10) ÷ 2, arredondado para baixo."
                    : sheet.system === "cthulhu"
                      ? "Os atributos são alvos percentuais em testes d100."
                      : "Os valores dos atributos serão somados aos testes d20."}
              </p>
              <div className="attribute-editor">
                {system.attributes.map((a) => (
                  <Field key={a.key} label={`${a.name} (${a.key})`}>
                    <input
                      type="number"
                      min={ordem ? 0 : -10}
                      max={ordem ? 10 : 100}
                      value={draft.attributes[a.key]}
                      onChange={(e) =>
                        set("attributes", {
                          ...draft.attributes,
                          [a.key]: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
              <h3 className="form-section-title">Recursos</h3>
              <div className="resource-editor">
                {(["hp", "ep", "sanity"] as const).map((k) => (
                  <div key={k}>
                    <strong>{system.resourceLabels[k]}</strong>
                    <div className="form-grid">
                      <Field label="Atual">
                        <input
                          type="number"
                          value={draft.resources[k].current}
                          min={0}
                          max={draft.resources[k].max}
                          onChange={(e) =>
                            set("resources", {
                              ...draft.resources,
                              [k]: {
                                ...draft.resources[k],
                                current: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </Field>
                      <Field label="Máximo">
                        <input
                          type="number"
                          min={1}
                          max={9999}
                          value={draft.resources[k].max}
                          onChange={(e) =>
                            set("resources", {
                              ...draft.resources,
                              [k]: {
                                max: Number(e.target.value),
                                current: Math.min(
                                  draft.resources[k].current,
                                  Number(e.target.value),
                                ),
                              },
                            })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === "skills" && (
            <>
              <p className="small muted">
                {sheet.system === "cthulhu"
                  ? "Informe o valor percentual de cada perícia."
                  : "O bônus informado é somado ao teste do atributo. Em Ordem, use 0, 5, 10 ou 15 conforme o treinamento."}
              </p>
              <div className="skill-edit-header">
                <span>Perícia</span>
                <span>Atributo</span>
                <span>{sheet.system === "cthulhu" ? "%" : "Bônus"}</span>
                <span />
              </div>
              {draft.skills.map((s, i) => (
                <div className="skill-edit-row" key={s.id}>
                  <input
                    aria-label={`Nome da perícia ${i + 1}`}
                    value={s.name}
                    maxLength={100}
                    required
                    onChange={(e) =>
                      set(
                        "skills",
                        draft.skills.map((k, j) =>
                          j === i ? { ...k, name: e.target.value } : k,
                        ),
                      )
                    }
                  />
                  <select
                    aria-label={`Atributo de ${s.name}`}
                    value={s.attribute}
                    onChange={(e) =>
                      set(
                        "skills",
                        draft.skills.map((k, j) =>
                          j === i ? { ...k, attribute: e.target.value } : k,
                        ),
                      )
                    }
                  >
                    {system.attributes.map((a) => (
                      <option key={a.key}>{a.key}</option>
                    ))}
                  </select>
                  <input
                    aria-label={`Bônus de ${s.name}`}
                    type="number"
                    min={-100}
                    max={200}
                    value={s.bonus}
                    onChange={(e) =>
                      set(
                        "skills",
                        draft.skills.map((k, j) =>
                          j === i ? { ...k, bonus: Number(e.target.value) } : k,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="icon-button danger-text"
                    aria-label={`Remover ${s.name}`}
                    disabled={draft.attacks.some((a) => a.skillId === s.id)}
                    title="Perícias usadas por ataques precisam ser desvinculadas antes de remover."
                    onClick={() =>
                      set(
                        "skills",
                        draft.skills.filter((k) => k.id !== s.id),
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                disabled={draft.skills.length >= 60}
                onClick={() =>
                  set("skills", [
                    ...draft.skills,
                    {
                      id: randomId(),
                      name: "Nova perícia",
                      attribute: system.attributes[0].key,
                      bonus: 0,
                    },
                  ])
                }
              >
                <Plus size={15} />
                Adicionar perícia
              </Button>
            </>
          )}
          {tab === "attacks" && (
            <>
              <p className="small muted">
                Configure acerto e dano separadamente. O crítico sinaliza o
                acerto; aplique multiplicadores de dano conforme as regras da
                mesa.
              </p>
              {draft.attacks.map((a, i) => (
                <div className="repeatable-field" key={a.id}>
                  <div className="repeatable-heading">
                    <strong>Ataque {i + 1}</strong>
                    <button
                      type="button"
                      className="icon-button danger-text"
                      aria-label={`Remover ${a.name}`}
                      onClick={() =>
                        set(
                          "attacks",
                          draft.attacks.filter((k) => k.id !== a.id),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <Field label="Nome">
                    <input
                      value={a.name}
                      required
                      maxLength={100}
                      onChange={(e) =>
                        set(
                          "attacks",
                          draft.attacks.map((k, j) =>
                            j === i ? { ...k, name: e.target.value } : k,
                          ),
                        )
                      }
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label="Perícia de acerto">
                      <select
                        value={a.skillId}
                        required
                        onChange={(e) =>
                          set(
                            "attacks",
                            draft.attacks.map((k, j) =>
                              j === i ? { ...k, skillId: e.target.value } : k,
                            ),
                          )
                        }
                      >
                        {draft.skills.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Fórmula de dano">
                      <input
                        value={a.damage}
                        required
                        maxLength={40}
                        placeholder="2d8+3"
                        onChange={(e) =>
                          set(
                            "attacks",
                            draft.attacks.map((k, j) =>
                              j === i ? { ...k, damage: e.target.value } : k,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label="Alcance">
                      <input
                        value={a.range}
                        maxLength={80}
                        onChange={(e) =>
                          set(
                            "attacks",
                            draft.attacks.map((k, j) =>
                              j === i ? { ...k, range: e.target.value } : k,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label="Crítico a partir de (d20)">
                      <input
                        type="number"
                        min={2}
                        max={20}
                        value={a.critical}
                        onChange={(e) =>
                          set(
                            "attacks",
                            draft.attacks.map((k, j) =>
                              j === i
                                ? { ...k, critical: Number(e.target.value) }
                                : k,
                            ),
                          )
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Descrição / efeitos">
                    <textarea
                      value={a.description}
                      maxLength={2000}
                      rows={2}
                      onChange={(e) =>
                        set(
                          "attacks",
                          draft.attacks.map((k, j) =>
                            j === i ? { ...k, description: e.target.value } : k,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                disabled={draft.attacks.length >= 30 || !draft.skills.length}
                onClick={() =>
                  set("attacks", [
                    ...draft.attacks,
                    {
                      id: randomId(),
                      name: "Novo ataque",
                      skillId:
                        draft.skills.find((s) => s.name === "Luta")?.id ||
                        draft.skills[0].id,
                      damage: "1d6",
                      critical: 20,
                      range: "Corpo a corpo",
                      description: "",
                    },
                  ])
                }
              >
                <Plus size={15} />
                Adicionar ataque
              </Button>
            </>
          )}
          {tab === "abilities" && (
            <>
              <p className="small muted">
                Crie rituais, técnicas e poderes da sua mesa. Usar uma
                habilidade desconta automaticamente seu custo de energia.
              </p>
              {draft.abilities.map((a, i) => (
                <div className="repeatable-field" key={a.id}>
                  <div className="repeatable-heading">
                    <strong>Habilidade {i + 1}</strong>
                    <button
                      type="button"
                      className="icon-button danger-text"
                      aria-label={`Remover ${a.name}`}
                      onClick={() =>
                        set(
                          "abilities",
                          draft.abilities.filter((k) => k.id !== a.id),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <Field label="Nome">
                    <input
                      value={a.name}
                      maxLength={100}
                      required
                      onChange={(e) =>
                        set(
                          "abilities",
                          draft.abilities.map((k, j) =>
                            j === i ? { ...k, name: e.target.value } : k,
                          ),
                        )
                      }
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label="Custo de energia">
                      <input
                        type="number"
                        min={0}
                        max={9999}
                        value={a.cost}
                        onChange={(e) =>
                          set(
                            "abilities",
                            draft.abilities.map((k, j) =>
                              j === i
                                ? { ...k, cost: Number(e.target.value) }
                                : k,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label="Rolagem (opcional)">
                      <input
                        value={a.formula}
                        maxLength={40}
                        placeholder="Ex.: 2d6+3"
                        onChange={(e) =>
                          set(
                            "abilities",
                            draft.abilities.map((k, j) =>
                              j === i ? { ...k, formula: e.target.value } : k,
                            ),
                          )
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Efeito / regras">
                    <textarea
                      value={a.description}
                      maxLength={4000}
                      rows={3}
                      onChange={(e) =>
                        set(
                          "abilities",
                          draft.abilities.map((k, j) =>
                            j === i ? { ...k, description: e.target.value } : k,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                disabled={draft.abilities.length >= 40}
                onClick={() =>
                  set("abilities", [
                    ...draft.abilities,
                    {
                      id: randomId(),
                      name: "Nova habilidade",
                      cost: 1,
                      formula: "",
                      description: "",
                    },
                  ])
                }
              >
                <Plus size={15} />
                Adicionar habilidade
              </Button>
            </>
          )}
          {tab === "notes" && (
            <>
              <Field
                label="Equipamento e inventário"
                hint="Armas, itens, dinheiro e tudo o que seu personagem carrega."
              >
                <textarea
                  rows={7}
                  value={draft.inventory}
                  maxLength={12000}
                  onChange={(e) => set("inventory", e.target.value)}
                />
              </Field>
              <Field
                label="Anotações e história"
                hint="Essas notas podem ser lidas pelo dono da ficha e pelo mestre."
              >
                <textarea
                  rows={8}
                  value={draft.notes}
                  maxLength={20000}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </Field>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="modal-footer">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Salvando…" : "Salvar ficha"}
            <Check size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Layers3, Plus, Search, Swords, Sparkles } from "lucide-react";
import { ORDEM_BOOK, ORDEM_RITUALS, ORDEM_WEAPONS } from "../lib/game/ordem-library";
import type { KnownRitual, KnownWeapon, Sheet } from "../lib/game/types";
import { Button, Field, Modal } from "./ui";

function RitualModal({ ritual, onClose }: { ritual: KnownRitual; onClose: () => void }) {
  const details = ritual.details ?? { description: [] };
  const facts = [
    ["Execução", details.execution], ["Alcance", details.range], ["Alvo", details.target],
    ["Área", details.area], ["Efeito", details.effect], ["Duração", details.duration], ["Resistência", details.resistance],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));
  return <Modal title={ritual.name} subtitle={`${ritual.element} · ${ritual.circle}º círculo`} onClose={onClose} wide>
    <div className="modal-body ritual-modal-body">
      <section className="ritual-facts" aria-label={`Dados gerais de ${ritual.name}`}>
        <div className="ritual-detail-heading"><Sparkles size={15} /><span>Dados gerais</span></div>
        <dl>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>
      <section className="ritual-description">
        <div className="ritual-detail-heading"><BookOpen size={15} /><span>Descrição completa</span></div>
        {details.description.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </section>
    </div>
  </Modal>;
}

function WeaponModal({ weapon, onClose }: { weapon: KnownWeapon; onClose: () => void }) {
  const facts = [
    ["Categoria", weapon.category],
    ["Dano", weapon.damage],
    ["Alcance", weapon.range],
    ["Crítico", weapon.criticalDetail ?? String(weapon.critical)],
    ["Tipo", weapon.damageType],
    ["Espaços", weapon.slots ? String(weapon.slots) : undefined],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));
  return <Modal title={weapon.name} subtitle={weapon.category} onClose={onClose} wide>
    <div className="modal-body ritual-modal-body">
      <section className="ritual-facts" aria-label={`Dados gerais de ${weapon.name}`}>
        <div className="ritual-detail-heading"><Swords size={15} /><span>Dados gerais</span></div>
        <dl>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>
      <section className="ritual-description weapon-description">
        <div className="ritual-detail-heading"><BookOpen size={15} /><span>Descrição da arma</span></div>
        <p>{weapon.description ?? `${weapon.name} é uma arma ${weapon.category.toLowerCase()}.`}</p>
      </section>
    </div>
  </Modal>;
}

export default function OrdemLibrary({
  sheets,
  onAddRitual,
  onAddWeapon,
}: {
  sheets: Sheet[];
  onAddRitual: (sheet: Sheet, ritual: KnownRitual) => Promise<void>;
  onAddWeapon: (sheet: Sheet, weapon: KnownWeapon) => Promise<void>;
}) {
  const [tab, setTab] = useState<"reader" | "rituals" | "weapons">("reader");
  const [query, setQuery] = useState("");
  const [element, setElement] = useState<KnownRitual["element"]>("Conhecimento");
  const [selectedRitual, setSelectedRitual] = useState<KnownRitual | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<KnownWeapon | null>(null);
  const [targetId, setTargetId] = useState(sheets[0]?.id ?? "");
  const target = sheets.find((sheet) => sheet.id === targetId);
  const rituals = useMemo(() => ORDEM_RITUALS.filter((ritual) =>
    ritual.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")) &&
    ritual.element === element,
  ), [query, element]);
  const weapons = useMemo(() => ORDEM_WEAPONS.filter((weapon) =>
    `${weapon.name} ${weapon.category}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")),
  ), [query]);
  const readerLink = `${ORDEM_BOOK.localPdf}#page=1`;
  return (
    <section className="book-library">
      <div className="book-library-hero">
        <div className="book-cover" aria-hidden="true">
          <span>ORDEM</span><i>PARANORMAL</i><small>RPG</small>
        </div>
        <div className="book-library-head">
          <span className="eyebrow"><Layers3 size={12} /> ARQUIVO DA MESA</span>
          <h2>{ORDEM_BOOK.title}</h2>
          <p>O livro de regras da sua campanha, agora como uma central de consulta rápida.</p>
          <div className="book-meta"><span>{ORDEM_BOOK.edition}</span><i /> <span>{ORDEM_BOOK.pages} páginas</span><i /> <span>{ORDEM_RITUALS.length} rituais</span></div>
        </div>
        <button className="button secondary" onClick={() => setTab("reader")}><BookOpen size={15} /> Abrir leitor</button>
      </div>
      <div className="sheet-tabs book-tabs" role="tablist" aria-label="Conteúdo do livro">
        <button role="tab" aria-selected={tab === "reader"} onClick={() => setTab("reader")}><BookOpen size={15} /> Leitor do PDF</button>
        <button role="tab" aria-selected={tab === "rituals"} onClick={() => setTab("rituals")}><Sparkles size={15} /> Rituais</button>
        <button role="tab" aria-selected={tab === "weapons"} onClick={() => setTab("weapons")}><Swords size={15} /> Armas</button>
      </div>
      {tab === "reader" && (
        <div className="pdf-reader-wrap">
          <p className="muted small">Use a busca, o zoom e a paginação do leitor. Este arquivo está disponível apenas na prévia local da mesa.</p>
          <iframe title="Leitor do livro Ordem Paranormal" src={readerLink} className="pdf-reader" />
        </div>
      )}
      {tab !== "reader" && (
        <>
          <div className="library-toolbar">
            <div className="library-controls">
            <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${tab === "rituals" ? "ritual" : "arma"}…`} /></label>
            </div>
            <div className="library-count">{tab === "rituals" ? rituals.length : weapons.length} <span>itens</span></div>
          </div>
          {tab === "rituals" && (
            <div className="element-tabs" role="tablist" aria-label="Elementos dos rituais">
              {(["Conhecimento", "Energia", "Morte", "Sangue", "Medo"] as const).map((item) => (
                <button key={item} role="tab" aria-selected={element === item} className={item.toLowerCase()} onClick={() => setElement(item)}>
                  <span />{item}
                </button>
              ))}
            </div>
          )}
          <div className="library-add-target">
            <div className="target-icon"><Plus size={17} /></div>
            <Field label="Equipar em uma das suas fichas">
              <select value={targetId} onChange={(event) => setTargetId(event.target.value)} disabled={!sheets.length}>
                {!sheets.length && <option>Crie uma ficha de Ordem primeiro</option>}
                {sheets.map((sheet) => <option value={sheet.id} key={sheet.id}>{sheet.name} · {sheet.className || "personagem"}</option>)}
              </select>
            </Field>
            <p className="muted small">O item será incluído instantaneamente na ficha selecionada.</p>
          </div>
          {tab === "rituals" ? (
            <div className="circle-sections">
              {[1, 2, 3, 4].map((currentCircle) => {
                const circleRituals = rituals.filter((ritual) => ritual.circle === currentCircle);
                if (!circleRituals.length) return null;
                return <section className="circle-section" key={currentCircle}>
                  <div className="circle-heading"><span>{currentCircle}</span><div><small>{element.toUpperCase()}</small><h3>{currentCircle}º Círculo</h3></div><i /></div>
                  <div className="reference-grid">
                    {circleRituals.map((entry) => {
                      const ritual = entry;
                      return <article className="reference-card" key={ritual.id}>
                        <div className={`reference-mark ${ritual.element.toLowerCase()}`}><Sparkles size={17} /></div>
                        <button className="reference-toggle" aria-haspopup="dialog" onClick={() => setSelectedRitual(ritual)}><span className="reference-kicker">{ritual.element} · {ritual.circle}º círculo</span><strong className="reference-title">{ritual.name}</strong><p>{ritual.summary}</p><span className="expand-label">Ver detalhes<ArrowUpRight size={14} /></span></button>
                        <div className="reference-actions"><Button variant="secondary" disabled={!target} onClick={() => target && onAddRitual(target, ritual)}><Plus size={14} /> Adicionar</Button></div>
                      </article>;
                    })}
                  </div>
                </section>;
              })}
            </div>
          ) : <div className="reference-grid">
            {weapons.map((entry) => {
              const weapon = entry as KnownWeapon;
              return <article className="reference-card" key={entry.id}>
                <div className="reference-mark weapon"><Swords size={17} /></div>
                <button className="reference-toggle" aria-haspopup="dialog" onClick={() => setSelectedWeapon(weapon)}><span className="reference-kicker">{weapon.category}</span><strong className="reference-title">{entry.name}</strong><p>{weapon.damage} · {weapon.range} · crítico {weapon.critical}</p><span className="expand-label">Ver detalhes<ArrowUpRight size={14} /></span></button>
                <div className="reference-actions">
                  <Button variant="secondary" disabled={!target} onClick={() => target && onAddWeapon(target, weapon)}><Plus size={14} /> Adicionar</Button>
                </div>
              </article>;
            })}
          </div>}
        </>
      )}
      {selectedRitual && <RitualModal ritual={selectedRitual} onClose={() => setSelectedRitual(null)} />}
      {selectedWeapon && <WeaponModal weapon={selectedWeapon} onClose={() => setSelectedWeapon(null)} />}
    </section>
  );
}

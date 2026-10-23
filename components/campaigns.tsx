"use client";
import { useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Crown,
  Users,
  Plus,
  Copy,
  RefreshCw,
  UserMinus,
  Check,
  BookOpen,
  Settings2,
  UserPlus,
  Skull,
} from "lucide-react";
import type { Campaign, Sheet, SystemId } from "../lib/game/types";
import { SYSTEMS, systemById } from "../lib/game/systems";
import { ORDEM_RITUALS, ORDEM_WEAPONS } from "../lib/game/ordem-library";
import {
  Button,
  Empty,
  Field,
  Modal,
  PageHeading,
  Portrait,
  SectionTitle,
  SystemMark,
} from "./ui";

export function CampaignCard({
  campaign,
  count,
  onOpen,
}: {
  campaign: Campaign;
  count: number;
  onOpen: () => void;
}) {
  return (
    <button className="campaign-card" onClick={onOpen}>
      <div
        className={`campaign-art ${campaign.banner}`}
        style={{ backgroundImage: `url('/art/${campaign.banner}.svg')` }}
      >
        <div className="art-vignette" />
        <span className={`status-tag ${campaign.status}`}>
          <i />
          {campaign.status === "active" ? "Em andamento" : "Em pausa"}
        </span>
        <span className="card-open">
          <ArrowUpRight size={18} />
        </span>
        <div className="art-caption">
          <SystemMark system={campaign.system} />
          <h3>{campaign.name}</h3>
        </div>
      </div>
      <div className="campaign-card-bottom">
        <span className="member-avatars">
          {campaign.members.slice(0, 3).map((m, i) => (
            <span key={m.id} className={`member-avatar color-${i}`}>
              {m.name.slice(0, 1)}
            </span>
          ))}
        </span>
        <span>
          {campaign.members.length} participantes<span className="dot">·</span>
          {count} fichas
        </span>
        <span className={`role-tag ${campaign.role}`}>
          {campaign.role === "gm" ? <Crown size={12} /> : <Users size={12} />}{" "}
          {campaign.role === "gm" ? "Mestre" : "Jogador"}
        </span>
      </div>
    </button>
  );
}
export function SheetCard({
  sheet,
  campaign,
  onOpen,
}: {
  sheet: Sheet;
  campaign?: Campaign;
  onOpen: () => void;
}) {
  return (
    <button className="sheet-card" onClick={onOpen}>
      <div className="sheet-card-head">
        <Portrait sheet={sheet} />
        <ArrowUpRight size={17} />
      </div>
      <SystemMark system={sheet.system} />
      <h3>{sheet.name}</h3>
      <p>
        {sheet.className ||
          (sheet.type === "monster" ? "Criatura" : "Uma história por escrever")}
      </p>
      <div className="mini-resource">
        <span>
          <i className="hp-dot" />
          PV <b>{sheet.resources.hp.current}</b>
          <small>/{sheet.resources.hp.max}</small>
        </span>
        <span>
          {sheet.system === "ordem" || sheet.system === "jujutsu"
            ? `NEX ${sheet.exposure}%`
            : `Nível ${sheet.level}`}
        </span>
      </div>
      <div className="sheet-card-foot">
        <span>{campaign?.name || "Campanha"}</span>
        {sheet.type === "monster" ? (
          <Skull size={13} />
        ) : (
          <span>{sheet.ownerName}</span>
        )}
      </div>
    </button>
  );
}
export function CampaignForm({
  campaign,
  initialSystem,
  busy,
  onSubmit,
  onClose,
}: {
  campaign?: Campaign;
  initialSystem?: SystemId;
  busy: boolean;
  onSubmit: (value: {
    name: string;
    description: string;
    system: SystemId;
    banner: string;
    status: string;
  }) => Promise<boolean>;
  onClose: () => void;
}) {
  const [name, setName] = useState(campaign?.name || ""),
    [description, setDescription] = useState(campaign?.description || ""),
    [system, setSystem] = useState<SystemId>(
      campaign?.system || initialSystem || "ordem",
    ),
    [banner, setBanner] = useState(
      campaign?.banner || (initialSystem === "jujutsu" ? "shrine" : "forest"),
    ),
    [status, setStatus] = useState(campaign?.status || "active");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await onSubmit({ name, description, system, banner, status }))
      onClose();
  }
  return (
    <Modal
      title={campaign ? "Editar campanha" : "Uma nova história começa aqui"}
      subtitle={
        campaign
          ? "Ajuste os detalhes da sua mesa."
          : "Escolha um universo. Reúna seu grupo. O resto é história."
      }
      onClose={onClose}
      wide
    >
      <form onSubmit={submit}>
        <div className="modal-body">
          <Field label="Nome da campanha">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Os ecos do outro lado"
              maxLength={100}
              required
              autoFocus
            />
          </Field>
          {!campaign && (
            <div className="field">
              <span>Qual sistema vamos jogar?</span>
              <div className="system-picker">
                {SYSTEMS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`system-option ${system === s.id ? "selected" : ""}`}
                    onClick={() => {
                      setSystem(s.id);
                      setBanner(
                        s.id === "jujutsu"
                          ? "shrine"
                          : s.id === "ordem"
                            ? "forest"
                            : s.id === "cthulhu"
                              ? "abyss"
                              : "ruins",
                      );
                    }}
                  >
                    <SystemMark system={s.id} />
                    <small>
                      {s.support === "ready"
                        ? "Ficha dedicada"
                        : "Modelo inicial"}
                    </small>
                    {system === s.id && <Check size={15} />}
                  </button>
                ))}
              </div>
              <small>
                Os modelos iniciais têm campos editáveis e rolagens básicas.
                Automações específicas poderão ser adicionadas depois.
              </small>
            </div>
          )}
          <Field label="Sobre a campanha">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Que mistérios aguardam seus jogadores?"
            />
          </Field>
          <div className="field">
            <span>Escolha a atmosfera</span>
            <div className="banner-picker">
              {["forest", "shrine", "ruins", "abyss"].map((b, i) => (
                <button
                  type="button"
                  key={b}
                  aria-label={["Floresta", "Santuário", "Ruínas", "Abismo"][i]}
                  className={banner === b ? "selected" : ""}
                  style={{ backgroundImage: `url('/art/${b}.svg')` }}
                  onClick={() => setBanner(b)}
                >
                  {banner === b && <Check size={18} />}
                </button>
              ))}
            </div>
          </div>
          {campaign && (
            <Field label="Status">
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as Campaign["status"])
                }
              >
                <option value="active">Em andamento</option>
                <option value="paused">Em pausa</option>
              </select>
            </Field>
          )}
          {!campaign && (
            <div className="hint-box">
              <Crown size={19} />
              <p>
                Você será o mestre desta campanha e poderá convidar jogadores,
                acompanhar suas fichas e criar criaturas.
              </p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={busy} type="submit">
            {busy
              ? "Salvando…"
              : campaign
                ? "Salvar alterações"
                : "Criar campanha"}
            <ArrowUpRight size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function JoinForm({
  busy,
  onJoin,
  onClose,
}: {
  busy: boolean;
  onJoin: (code: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  return (
    <Modal
      title="Seu lugar na mesa está reservado"
      subtitle="Peça o código de convite para o mestre da campanha."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await onJoin(code)) onClose();
        }}
      >
        <div className="modal-body">
          <Field label="Código de convite">
            <input
              className="code-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              minLength={6}
              maxLength={64}
              placeholder="COLE O CÓDIGO AQUI"
              autoFocus
            />
          </Field>
          <p className="muted small">
            Depois de entrar, você poderá criar seus personagens. Apenas você e
            o mestre terão acesso às suas fichas.
          </p>
        </div>
        <div className="modal-footer">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy}>
            Entrar na campanha
            <UserPlus size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function NewSheetForm({
  campaigns,
  initialCampaignId,
  type,
  userId,
  busy,
  onCreate,
  onClose,
}: {
  campaigns: Campaign[];
  initialCampaignId?: string;
  type: Sheet["type"];
  userId: string;
  busy: boolean;
  onCreate: (value: {
    campaignId: string;
    ownerId: string;
    name: string;
    type: Sheet["type"];
    ritualId?: string;
    weaponId?: string;
  }) => Promise<boolean>;
  onClose: () => void;
}) {
  const eligible = campaigns.filter(
    (c) => type !== "monster" || c.role === "gm",
  );
  const [campaignId, setCampaignId] = useState(
      initialCampaignId || eligible[0]?.id || "",
    ),
    [name, setName] = useState(""),
    [ownerId, setOwnerId] = useState(userId),
    [ritualId, setRitualId] = useState(""),
    [weaponId, setWeaponId] = useState("");
  const campaign = eligible.find((c) => c.id === campaignId);
  return (
    <Modal
      title={
        type === "monster"
          ? "Dê forma ao desconhecido"
          : "Quem vai viver esta história?"
      }
      subtitle={
        type === "monster"
          ? "Criaturas ficam visíveis apenas para o mestre."
          : "Comece pelo nome. Sua ficha poderá ser editada por completo."
      }
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await onCreate({ campaignId, ownerId, name, type, ritualId, weaponId })) onClose();
        }}
      >
        <div className="modal-body">
          <Field label="Campanha">
            <select
              value={campaignId}
              required
              onChange={(e) => {
                setCampaignId(e.target.value);
                setOwnerId(userId);
              }}
            >
              {eligible.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {systemById(c.system).short}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={
              type === "monster" ? "Nome da criatura" : "Nome do personagem"
            }
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              autoFocus
              placeholder={
                type === "monster"
                  ? "Ex.: A sombra do santuário"
                  : "Ex.: Kaori Sato"
              }
            />
          </Field>
          {campaign?.role === "gm" && type === "character" && (
            <Field label="Dono da ficha">
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              >
                {campaign.members.map((m) => (
                  <option value={m.id} key={m.id}>
                    {m.name}
                    {m.id === userId ? " (você)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {campaign && (
            <div className="hint-box">
              <BookOpen size={20} />
              <p>
                Esta ficha usará{" "}
                <strong>{systemById(campaign.system).name}</strong>. Atributos e
                perícias já vêm organizados para você começar.
              </p>
            </div>
          )}
          {campaign?.system === "ordem" && type === "character" && (
            <div className="form-grid">
              <Field label="Ritual inicial (opcional)">
                <select value={ritualId} onChange={(e) => setRitualId(e.target.value)}>
                  <option value="">Escolher depois na biblioteca</option>
                  {ORDEM_RITUALS.map((ritual) => <option value={ritual.id} key={ritual.id}>{ritual.name} · {ritual.element} {ritual.circle}º</option>)}
                </select>
              </Field>
              <Field label="Arma inicial (opcional)">
                <select value={weaponId} onChange={(e) => setWeaponId(e.target.value)}>
                  <option value="">Escolher depois na biblioteca</option>
                  {ORDEM_WEAPONS.map((weapon) => <option value={weapon.id} key={weapon.id}>{weapon.name} · {weapon.damage}</option>)}
                </select>
              </Field>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={busy || !eligible.length} type="submit">
            Criar {type === "monster" ? "criatura" : "personagem"}
            <Plus size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function CampaignDetail({
  campaign,
  sheets,
  onBack,
  onSheet,
  onCreate,
  onEdit,
  onMembers,
}: {
  campaign: Campaign;
  sheets: Sheet[];
  onBack: () => void;
  onSheet: (id: string) => void;
  onCreate: (type: Sheet["type"]) => void;
  onEdit: () => void;
  onMembers: () => void;
}) {
  const characters = sheets.filter((s) => s.type === "character"),
    monsters = sheets.filter((s) => s.type === "monster");
  return (
    <>
      <button className="text-button back-button" onClick={onBack}>
        ← Todas as campanhas
      </button>
      <div
        className={`campaign-detail-banner ${campaign.banner}`}
        style={{ backgroundImage: `url('/art/${campaign.banner}.svg')` }}
      >
        <div className="art-vignette" />
        <div>
          <SystemMark system={campaign.system} />
          <h1>{campaign.name}</h1>
          <p>
            {campaign.description ||
              "Uma nova história está prestes a começar."}
          </p>
          <span className={`status-tag ${campaign.status}`}>
            <i />
            {campaign.status === "active" ? "Em andamento" : "Em pausa"}
          </span>
        </div>
      </div>
      <div className="campaign-toolbar">
        <div>
          <span className="role-tag gm">
            <Crown size={14} /> Mestre: {campaign.gmName}
          </span>
          <span className="muted">{campaign.members.length} participantes</span>
        </div>
        <div>
          <Button variant="secondary" onClick={onMembers}>
            <Users size={16} />
            {campaign.role === "gm" ? "Convidar e gerenciar" : "Participantes"}
          </Button>
          {campaign.role === "gm" && (
            <button
              className="icon-button"
              aria-label="Editar campanha"
              onClick={onEdit}
            >
              <Settings2 size={19} />
            </button>
          )}
        </div>
      </div>
      <SectionTitle
        title={
          campaign.role === "gm"
            ? "Personagens da campanha"
            : "Seus personagens"
        }
        subtitle={
          campaign.role === "gm"
            ? "Cada jogador, uma nova perspectiva da história."
            : "Suas fichas ficam acessíveis para você e para o mestre."
        }
      />
      <div className="sheet-grid">
        {characters.map((s) => (
          <SheetCard
            sheet={s}
            campaign={campaign}
            key={s.id}
            onOpen={() => onSheet(s.id)}
          />
        ))}
        <button
          className="add-sheet-card"
          onClick={() => onCreate("character")}
        >
          <span>
            <Plus size={24} />
          </span>
          <h3>Novo personagem</h3>
          <p>Uma nova história para contar</p>
        </button>
      </div>
      {campaign.role === "gm" && (
        <div className="section-gap">
          <SectionTitle
            title="Além do véu"
            subtitle="Suas criaturas. Seus segredos. Visíveis só para você."
            action="Criar criatura"
            onAction={() => onCreate("monster")}
          />
          {monsters.length ? (
            <div className="sheet-grid">
              {monsters.map((s) => (
                <SheetCard
                  key={s.id}
                  sheet={s}
                  campaign={campaign}
                  onOpen={() => onSheet(s.id)}
                />
              ))}
            </div>
          ) : (
            <Empty
              icon={<Skull />}
              title="O desconhecido espera por você"
              description="Crie monstros com atributos, ataques e técnicas para desafiar a mesa."
            >
              <Button variant="secondary" onClick={() => onCreate("monster")}>
                <Plus size={16} />
                Criar primeira criatura
              </Button>
            </Empty>
          )}
        </div>
      )}
    </>
  );
}
export function MembersModal({
  campaign,
  busy,
  onClose,
  onRotate,
  onRemove,
  notify,
}: {
  campaign: Campaign;
  busy: boolean;
  onClose: () => void;
  onRotate: () => void;
  onRemove: (id: string) => void;
  notify: (s: string) => void;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  return (
    <Modal title="Sua mesa, reunida" subtitle={campaign.name} onClose={onClose}>
      <div className="modal-body">
        {campaign.role === "gm" && (
          <div className="invite-box">
            <span className="eyebrow">CONVIDE SEUS JOGADORES</span>
            <p>Compartilhe este código com quem vai jogar.</p>
            <div>
              <code>{campaign.inviteCode}</code>
              <button
                className="icon-button"
                aria-label="Copiar código de convite"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(campaign.inviteCode!);
                    notify("Código copiado!");
                  } catch {
                    notify("Selecione o código acima para copiar.");
                  }
                }}
              >
                <Copy size={17} />
              </button>
            </div>
            <button className="text-button" disabled={busy} onClick={onRotate}>
              <RefreshCw size={13} />
              Gerar novo código e invalidar o anterior
            </button>
          </div>
        )}
        <div className="member-list">
          {campaign.members.map((m) => (
            <div key={m.id}>
              <span className="avatar-circle">{m.name.slice(0, 1)}</span>
              <div>
                <strong>{m.name}</strong>
                <span>
                  {m.role === "gm" ? "Mestre da campanha" : "Jogador"}
                </span>
              </div>
              {m.role === "gm" ? (
                <Crown size={17} className="accent" />
              ) : (
                campaign.role === "gm" &&
                (removing === m.id ? (
                  <div className="inline-confirm">
                    <button onClick={() => setRemoving(null)}>Cancelar</button>
                    <button
                      className="danger-text"
                      disabled={busy}
                      onClick={() => {
                        onRemove(m.id);
                        setRemoving(null);
                      }}
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <button
                    aria-label={`Remover ${m.name}`}
                    className="icon-button"
                    onClick={() => setRemoving(m.id)}
                  >
                    <UserMinus size={16} />
                  </button>
                ))
              )}
            </div>
          ))}
        </div>
        {removing && (
          <p className="small muted">
            Ao remover, o jogador perde o acesso à campanha. Suas fichas
            continuam preservadas para o mestre.
          </p>
        )}
      </div>
      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose}>
          Concluir
        </Button>
      </div>
    </Modal>
  );
}

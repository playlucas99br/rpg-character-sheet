"use client";
import { randomId } from "../lib/game/id";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  Crown,
  Dices,
  Eye,
  EyeOff,
  FlaskConical,
  FolderOpen,
  History,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Search,
  Shield,
  Skull,
  Sparkles,
  Users,
  UserRound,
  X,
} from "lucide-react";
import type {
  Campaign,
  ResourceKey,
  Roll,
  RollRequest,
  Sheet,
  SystemId,
  User,
  Workspace,
} from "../lib/game/types";
import { createDemo } from "../lib/game/demo";
import { newSheet, SYSTEMS, systemById } from "../lib/game/systems";
import { resolveRoll } from "../lib/game/dice";
import { ORDEM_RITUALS, ORDEM_WEAPONS } from "../lib/game/ordem-library";
import { campaignSchema, duplicateSheetSchema, sheetSchema } from "../lib/game/validation";
import { makeSheetCopy, suggestedCopyName } from "../lib/game/duplicate-sheet";
import { canReadSheet } from "../lib/game/access";
import {
  Button,
  Die,
  Empty,
  Field,
  Modal,
  PageHeading,
  Portrait,
  SectionTitle,
  SystemMark,
} from "./ui";
import {
  CampaignCard,
  CampaignDetail,
  CampaignForm,
  JoinForm,
  MembersModal,
  NewSheetForm,
  SheetCard,
} from "./campaigns";
import { DicePanel, RollHistory } from "./dice-panel";
import SheetView from "./sheet-view";
import OrdemLibrary from "./ordem-library";
import SignIn from "./sign-in";
import SyncIndicator, { SyncNotice } from "./sync-status";
import CampaignAssets from "./campaign-assets";
import DashboardResume from "./dashboard-resume";
import DuplicateSheetForm from "./duplicate-sheet-form";
import { activityKey, resumeTargets } from "../lib/game/recent-activity";
import { useRecentActivity } from "../lib/game/use-recent-activity";
import { useCampaignRealtime } from "../lib/game/use-campaign-realtime";
import { GameApiError, requestGame, type SyncStatus } from "../lib/game/client-sync";

type Page =
  | "dashboard"
  | "campaigns"
  | "sheets"
  | "bestiary"
  | "history"
  | "systems"
  | "campaign"
  | "sheet";
type Route = { page: Page; id?: string };
type ModalState = {
  type:
    | "campaign"
    | "join"
    | "new-sheet"
    | "duplicate-sheet"
    | "edit-campaign"
    | "members"
    | "dice"
    | "help"
    | "profile";
  campaignId?: string;
  sheetType?: Sheet["type"];
  sheetId?: string;
  system?: SystemId;
} | null;
type Result = { id?: string; roll?: Roll };
const EMPTY: Workspace = { campaigns: [], sheets: [], rolls: [] };
const DEMO_USER: User = { id: "demo-me", name: "Você" };
const navigation = [
  { page: "dashboard" as Page, label: "Visão geral", Icon: LayoutDashboard },
  { page: "campaigns" as Page, label: "Campanhas", Icon: Compass },
  { page: "sheets" as Page, label: "Minhas fichas", Icon: BookOpen },
  { page: "bestiary" as Page, label: "Bestiário", Icon: Skull },
  { page: "history" as Page, label: "Histórico de rolagens", Icon: History },
];
function demoMutation(
  data: Workspace,
  input: Record<string, unknown>,
): { state: Workspace; result: Result } {
  const state = structuredClone(data),
    now = new Date().toISOString();
  let result: Result = {};
  if (input.action === "create_campaign") {
    const value = campaignSchema.parse(input.campaign),
      id = randomId();
    state.campaigns.unshift({
      ...value,
      id,
      role: "gm",
      members: [{ ...DEMO_USER, role: "gm" }],
      gmName: "Você",
      createdAt: now,
      inviteCode: `DEMO-${id.slice(0, 8).toUpperCase()}`,
    });
    result = { id };
  } else if (input.action === "join") {
    const c = state.campaigns.find(
      (c) => c.inviteCode === String(input.code).trim().toUpperCase(),
    );
    if (!c)
      throw new Error(
        "Convite não encontrado. No modo demonstração, use um código das campanhas de exemplo.",
      );
    result = { id: c.id };
  } else if (input.action === "create_sheet") {
    const c = state.campaigns.find((c) => c.id === input.campaignId);
    if (!c) throw new Error("Escolha uma campanha.");
    const owner = c.members.find((m) => m.id === input.ownerId) || DEMO_USER;
    const sheet = {
      ...newSheet(
        c.system,
        c.id,
        owner.id,
        owner.name,
        input.type as Sheet["type"],
      ),
      name: String(input.name).trim(),
    };
    if (c.system === "ordem" && input.ritualId) {
      const ritual = ORDEM_RITUALS.find((item) => item.id === input.ritualId);
      if (ritual) sheet.rituals = [ritual];
    }
    if (c.system === "ordem" && input.weaponId) {
      const weapon = ORDEM_WEAPONS.find((item) => item.id === input.weaponId);
      const skill = sheet.skills.find((item) => weapon?.category.includes("corpo a corpo") ? item.name === "Luta" : item.name === "Pontaria") ?? sheet.skills[0];
      if (weapon && skill) sheet.attacks = [{ id: `library-${weapon.id}`, name: weapon.name, skillId: skill.id, damage: weapon.damage, range: weapon.range, critical: weapon.critical, description: `${weapon.category}. Adicionada da biblioteca de Ordem Paranormal.` }];
    }
    if (!sheet.name) throw new Error("Informe o nome.");
    state.sheets.unshift(sheet);
    result = { id: sheet.id };
  } else if (input.action === "duplicate_sheet") {
    const value = duplicateSheetSchema.parse(input);
    const source = state.sheets.find((s) => s.id === value.sheetId);
    if (!source) throw new Error("Ficha não encontrada.");
    if (source.version !== value.version) throw new Error("A ficha mudou. Confira os valores antes de duplicar.");
    const copy = makeSheetCopy(source, value.name, now);
    state.sheets.unshift(copy);
    result = { id: copy.id };
  } else if (input.action === "update_sheet") {
    const index = state.sheets.findIndex((s) => s.id === input.sheetId);
    if (index < 0) throw new Error("Ficha não encontrada.");
    const content = sheetSchema.parse(input.sheet);
    state.sheets[index] = {
      ...state.sheets[index],
      ...content,
      version: state.sheets[index].version + 1,
      updatedAt: now,
    };
    result = { id: state.sheets[index].id };
  } else if (input.action === "resource") {
    const s = state.sheets.find((s) => s.id === input.sheetId);
    if (!s) throw new Error("Ficha não encontrada.");
    const key = input.key as ResourceKey,
      r = s.resources[key];
    r.current = Math.max(0, Math.min(r.max, r.current + Number(input.delta)));
    s.updatedAt = now;
    result = { id: s.id };
  } else if (input.action === "delete_sheet")
    state.sheets = state.sheets.filter((s) => s.id !== input.sheetId);
  else if (input.action === "edit_campaign") {
    const c = state.campaigns.find((c) => c.id === input.campaignId);
    if (c) Object.assign(c, campaignSchema.parse(input.campaign));
  } else if (input.action === "rotate_invite") {
    const c = state.campaigns.find((c) => c.id === input.campaignId);
    if (c) c.inviteCode = `DEMO-${randomId().slice(0, 8).toUpperCase()}`;
  } else if (input.action === "remove_member") {
    const c = state.campaigns.find((c) => c.id === input.campaignId);
    if (c) c.members = c.members.filter((m) => m.id !== input.memberId);
  } else if (input.action === "roll") {
    const s = state.sheets.find((s) => s.id === input.sheetId) || null,
      request = input.request as RollRequest;
    const rolled = resolveRoll(s, request);
    if (s && request.kind === "ability") {
      const a = s.abilities.find((a) => a.id === request.id)!;
      if (s.resources.ep.current < a.cost)
        throw new Error("Energia insuficiente para esta habilidade.");
      s.resources.ep.current -= a.cost;
    }
    const roll: Roll = {
      ...rolled,
      id: randomId(),
      campaignId: String(input.campaignId),
      userId: DEMO_USER.id,
      userName: DEMO_USER.name,
      characterName: s?.name || "Você",
      visibility: input.visibility as Roll["visibility"],
      createdAt: now,
    };
    state.rolls.unshift(roll);
    state.rolls = state.rolls.slice(0, 150);
    result = { roll };
  }
  return { state, result };
}
function readRoute(): Route {
  const params = new URLSearchParams(window.location.search),
    page = params.get("view");
  return {
    page: ([
      "dashboard",
      "campaigns",
      "sheets",
      "bestiary",
      "history",
      "systems",
      "campaign",
      "sheet",
    ].includes(page || "")
      ? page
      : "dashboard") as Page,
    id: params.get("id") || undefined,
  };
}

export default function NexoApp({
  initialUser,
  initialDemo = false,
  authProvider = "sites",
  signInHref: baseSignInHref,
  signOutHref,
}: {
  initialUser: User | null;
  initialDemo?: boolean;
  authProvider?: "sites" | "supabase";
  signInHref: string;
  signOutHref: string;
}) {
  const [route, setRoute] = useState<Route>({ page: "dashboard" }),
    [welcome, setWelcome] = useState(!initialUser && !initialDemo),
    [modal, setModal] = useState<ModalState>(null),
    [mobile, setMobile] = useState(false),
    [demo, setDemo] = useState(!initialUser),
    [playerPreview, setPlayerPreview] = useState(false);
  const [sample, setSample] = useState(createDemo),
    [sampleLoaded, setSampleLoaded] = useState(false),
    [real, setReal] = useState<Workspace>(EMPTY),
    [realUser, setRealUser] = useState(initialUser),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(!!initialUser),
    [loadError, setLoadError] = useState(""),
    [hasLoadedReal, setHasLoadedReal] = useState(false),
    [syncStatus, setSyncStatus] = useState<SyncStatus>("loading"),
    [lastSavedAt, setLastSavedAt] = useState<string>();
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [historyCampaign, setHistoryCampaign] = useState("all"),
    [toast, setToast] = useState<{ text: string; error?: boolean } | null>(
      null,
    ),
    [rollResult, setRollResult] = useState<Roll | null>(null),
    [profileName, setProfileName] = useState(initialUser?.name || "");
  const busyRef = useRef(false),
    sequence = useRef(0);
  const returnParams = new URLSearchParams();
  if (!demo && route.page !== "dashboard") returnParams.set("view", route.page);
  if (!demo && route.id) returnParams.set("id", route.id);
  const signInHref = `${baseSignInHref.split("?")[0]}?return_to=${encodeURIComponent(`/${returnParams.size ? `?${returnParams}` : ""}`)}`;
  const user = demo ? DEMO_USER : realUser || DEMO_USER;
  const raw = demo ? sample : real;
  const campaigns = useMemo(() =>
    demo && playerPreview
      ? raw.campaigns.map((c) => ({
          ...c,
          role: "player" as const,
          inviteCode: undefined,
        }))
      : raw.campaigns, [demo, playerPreview, raw.campaigns]);
  const sheets = useMemo(() => raw.sheets.filter((s) =>
    canReadSheet(
      user.id,
      campaigns.find((c) => c.id === s.campaignId)?.role || null,
      s,
    ),
  ), [user.id, campaigns, raw.sheets]);
  const recentActivity = useRecentActivity(
    activityKey(initialUser?.id, demo ? playerPreview ? "demo-player" : "demo-gm" : "account"),
    route, campaigns, sheets, user.id, demo ? sampleLoaded : hasLoadedReal && syncStatus !== "expired",
  );
  const resume = resumeTargets(recentActivity, campaigns, sheets, user.id);
  const resumeCampaign = resume.campaign;
  const rolls = raw.rolls.filter(
    (r) =>
      r.visibility === "table" ||
      campaigns.find((c) => c.id === r.campaignId)?.role === "gm" ||
      r.userId === user.id,
  );
  const currentCampaign = campaigns.find((c) => c.id === route.id),
    currentSheet = sheets.find((s) => s.id === route.id),
    modalCampaign = campaigns.find((c) => c.id === modal?.campaignId),
    modalSheet = sheets.find((s) => s.id === modal?.sheetId);
  const notify = useCallback(
    (text: string, error = false) => setToast({ text, error }),
    [],
  );
  const navigate = useCallback((page: Page, id?: string) => {
    setRoute({ page, id });
    setQuery("");
    setMobile(false);
    setFilter("all");
    const params = new URLSearchParams();
    if (demo && !initialUser) params.set("demo", "1");
    if (page !== "dashboard") params.set("view", page);
    if (id) params.set("id", id);
    window.history.pushState({}, "", `/${params.size ? `?${params}` : ""}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [demo, initialUser]);
  useEffect(() => {
    setRoute(readRoute());
    const pop = () => setRoute(readRoute());
    window.addEventListener("popstate", pop);
    try {
      const saved = localStorage.getItem("nexo-demo-v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed.campaigns) &&
          Array.isArray(parsed.sheets) &&
          Array.isArray(parsed.rolls)
        )
          setSample(parsed);
      }
    } catch {}
    setSampleLoaded(true);
    return () => window.removeEventListener("popstate", pop);
  }, [initialUser]);
  useEffect(() => {
    if (sampleLoaded)
      try {
        localStorage.setItem("nexo-demo-v1", JSON.stringify(sample));
      } catch {}
  }, [sample, sampleLoaded]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  const refresh = useCallback(async () => {
    if (!initialUser || busyRef.current) return;
    const token = ++sequence.current;
    try {
      const state = await requestGame<Result>(undefined, initialUser.id);
      if (state.user.id !== initialUser.id) {
        window.location.reload();
        return;
      }
      if (token === sequence.current) {
        setReal(state);
        setRealUser(state.user);
        setLoadError("");
        setHasLoadedReal(true);
        setSyncStatus("ready");
      }
    } catch (error) {
      if (token === sequence.current) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Falha ao carregar as campanhas.",
        );
        const expired = error instanceof GameApiError && error.status === 401;
        setSyncStatus(expired ? "expired" : navigator.onLine ? "error" : "offline");
        if (expired) { setReal(EMPTY); setHasLoadedReal(false); }
      }
    } finally {
      if (token === sequence.current) setLoading(false);
    }
  }, [initialUser]);
  useEffect(() => {
    if (demo) return;
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 20000);
    const online = () => void refresh();
    const offline = () => setSyncStatus("offline");
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [demo, refresh]);
  useCampaignRealtime(!demo && authProvider === "supabase" && hasLoadedReal, initialUser?.id, JSON.stringify(real.campaigns.map((c) => c.id).sort()), refresh);
  async function mutation(
    input: Record<string, unknown>,
  ): Promise<Result | null> {
    if (busyRef.current) return null;
    if (!demo && (!hasLoadedReal || syncStatus === "expired" || !navigator.onLine)) {
      notify(syncStatus === "expired" ? "Entre novamente antes de salvar." : !navigator.onLine ? "Sem conexão. Seu rascunho continua nesta aba; conecte-se para salvar na conta." : "Aguarde a conexão com sua conta antes de alterar os dados.", true);
      return null;
    }
    busyRef.current = true;
    setBusy(true);
    ++sequence.current;
    if (!demo) setSyncStatus("saving");
    try {
      if (demo) {
        const { state, result } = demoMutation(sample, input);
        setSample(state);
        return result;
      }
      const state = await requestGame<Result>(input, initialUser?.id);
      if (state.user.id !== initialUser?.id) {
        window.location.reload();
        return null;
      }
      setReal(state);
      setRealUser(state.user);
      setLoadError("");
      setSyncStatus("ready");
      setLastSavedAt(new Date().toISOString());
      return state.result || {};
    } catch (error) {
      if (!demo) {
        if (error instanceof GameApiError && error.status === 409) {
          busyRef.current = false;
          await refresh();
          busyRef.current = true;
        }
        const expired = error instanceof GameApiError && error.status === 401;
        setSyncStatus(expired ? "expired" : navigator.onLine ? "error" : "offline");
        setLoadError(error instanceof Error ? error.message : "Não foi possível confirmar o salvamento. Sincronize antes de repetir a ação.");
        if (expired) { setReal(EMPTY); setHasLoadedReal(false); }
      }
      notify(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a ação.",
        true,
      );
      return null;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  function createCampaign(system?: SystemId) {
    setModal({ type: "campaign", system });
  }
  function createSheet(type: Sheet["type"] = "character", campaignId?: string) {
    const eligible = campaigns.filter(
      (c) => type !== "monster" || c.role === "gm",
    );
    if (!eligible.length) {
      if (type === "monster" && campaigns.length) {
        notify("Apenas o mestre pode criar criaturas.", true);
        return;
      }
      notify("Crie uma campanha antes de adicionar fichas.");
      createCampaign();
      return;
    }
    setModal({ type: "new-sheet", sheetType: type, campaignId });
  }
  async function roll(
    request: RollRequest,
    campaignId: string,
    sheetId?: string,
    visibility: Roll["visibility"] = "table",
  ) {
    const result = await mutation({
      action: "roll",
      campaignId,
      sheetId,
      request,
      visibility,
    });
    if (result?.roll) setRollResult(result.roll);
  }
  function switchMode() {
    setDemo(!demo);
    setPlayerPreview(false);
    setModal(null);
    navigate("dashboard");
  }
  const matchingCampaigns = campaigns.filter((c) =>
    c.name
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR")),
  );
  const matchingSheets = sheets.filter((s) =>
    s.name
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR")),
  );
  const canCreateThreat = !campaigns.length || campaigns.some((c) => c.role === "gm");
  const chars = sheets.filter((s) => s.type === "character"),
    monsters = sheets.filter((s) => s.type === "monster");
  const sheetCampaign = currentSheet
    ? campaigns.find((c) => c.id === currentSheet.campaignId)
    : null;
  const title =
    route.page === "campaign"
      ? currentCampaign?.name
      : route.page === "sheet"
        ? currentSheet?.name
        : route.page === "systems"
          ? "Biblioteca de sistemas"
          : navigation.find((n) => n.page === route.page)?.label;
  const diceProps = {
    campaigns,
    rolls,
    busy,
    onRoll: async (
      formula: string,
      campaignId: string,
      visibility: Roll["visibility"],
    ) => roll({ kind: "manual", formula }, campaignId, undefined, visibility),
    onCreateCampaign: () => {
      setModal(null);
      createCampaign();
    },
  };
  if (welcome && !initialUser) {
    return <SignIn authProvider={authProvider} signInHref={signInHref} onDemo={() => {
      setWelcome(false);
      setDemo(true);
      window.history.replaceState({}, "", "/?demo=1");
    }} />;
  }
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMobile(false)}
          aria-label="Fechar navegação"
        />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <button
          className="brand"
          onClick={() => navigate("dashboard")}
          aria-label="Nexo, página inicial"
        >
          <Die />
          <span>
            NEXO<small>SEU UNIVERSO DE RPG</small>
          </span>
        </button>
        <div className="sidebar-label">SEU ESPAÇO</div>
        <nav aria-label="Navegação principal">
          {navigation.map(({ page, label, Icon }) => (
            <button
              key={page}
              className={`nav-item ${route.page === page || (page === "campaigns" && route.page === "campaign") || (page === "sheets" && route.page === "sheet") ? "active" : ""}`}
              onClick={() => navigate(page)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {page === "campaigns" && campaigns.length > 0 && (
                <b>{campaigns.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-label library-label">EXPLORE</div>
        <button
          className={`nav-item ${route.page === "systems" ? "active" : ""}`}
          onClick={() => navigate("systems")}
        >
          <FolderOpen size={18} />
          <span>Biblioteca de sistemas</span>
          <span className="new-dot" />
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sparkles size={20} />
            <strong>
              A próxima lenda
              <br />
              pode ser a sua.
            </strong>
            <p>
              Mais histórias.
              <br />
              Menos papelada.
            </p>
            <button
              className="text-button"
              onClick={() => setModal({ type: "help" })}
            >
              Conheça o Nexo
              <ArrowUpRight size={13} />
            </button>
          </div>
          <button
            className="sidebar-help"
            onClick={() => setModal({ type: "help" })}
          >
            <CircleHelp size={17} />
            Ajuda e primeiros passos
            <ArrowUpRight size={13} />
          </button>
          {initialUser ? (
            <button
              className="user-profile"
              onClick={() => {
                setProfileName(realUser?.name || "");
                setModal({ type: "profile" });
              }}
            >
              <span className="avatar-circle">
                {(realUser?.name || "V").slice(0, 1)}
              </span>
              <span>
                <strong>{realUser?.name}</strong>
                <small>Sua conta pessoal</small>
              </span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <a className="user-profile sign-in" href={signInHref} target="_top">
              <span className="avatar-circle">
                <UserRound size={18} />
              </span>
              <span>
                <strong>Seu lugar na mesa</strong>
                <small>Entre com sua conta</small>
              </span>
              <LogIn size={17} />
            </a>
          )}
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir navegação"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb-root">Seu espaço</span>
            <ChevronRight size={13} />
            <strong>{title || "Nexo"}</strong>
          </div>
          <div className="topbar-actions">
            <SyncIndicator status={syncStatus} lastSavedAt={lastSavedAt} demo={demo} />
            <div className="global-search">
              <Search size={16} />
              <input
                aria-label="Buscar campanhas e personagens"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar no seu universo…"
              />
              {query ? (
                <button
                  className="icon-button"
                  aria-label="Limpar busca"
                  onClick={() => setQuery("")}
                >
                  <X size={13} />
                </button>
              ) : (
                <kbd>⌕</kbd>
              )}
              {query && (
                <div className="search-results">
                  <span className="eyebrow">CAMPANHAS</span>
                  {matchingCampaigns.slice(0, 4).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate("campaign", c.id)}
                    >
                      <Compass size={15} />
                      {c.name}
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
                  {!matchingCampaigns.length && (
                    <p>Nenhuma campanha encontrada.</p>
                  )}
                  <span className="eyebrow">FICHAS</span>
                  {matchingSheets.slice(0, 5).map((s) => (
                    <button key={s.id} onClick={() => navigate("sheet", s.id)}>
                      <UserRound size={15} />
                      {s.name}
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
                  {!matchingSheets.length && <p>Nenhuma ficha encontrada.</p>}
                </div>
              )}
            </div>
            <span className="topbar-divider" />
            <button
              className="icon-button top-dice"
              aria-label="Abrir rolador de dados"
              title="Rolador de dados"
              onClick={() => setModal({ type: "dice" })}
            >
              <Dices size={20} />
            </button>
            <button
              className="icon-button"
              aria-label="Abrir ajuda"
              onClick={() => setModal({ type: "help" })}
            >
              <CircleHelp size={19} />
            </button>
            <span className="top-avatar">{user.name.slice(0, 1)}</span>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <div>
              <FlaskConical size={14} />
              <span>
                Você está em uma mesa de demonstração.
                <span className="demo-extra"> Explore à vontade.</span>
              </span>
            </div>
            <div>
              <button
                className="demo-role"
                onClick={() => {
                  setPlayerPreview(!playerPreview);
                  navigate("dashboard");
                }}
              >
                {playerPreview ? <UserRound size={13} /> : <Crown size={13} />}
                Visão de {playerPreview ? "jogador" : "mestre"}
              </button>
              {initialUser ? (
                <button onClick={switchMode}>
                  Minhas campanhas
                  <ArrowRight size={13} />
                </button>
              ) : (
                <a href={signInHref} target="_top">
                  Entrar e criar meu universo
                  <ArrowUpRight size={13} />
                </a>
              )}
            </div>
          </div>
        )}
        <main className="main-content" id="main-content">
          {!demo && <SyncNotice status={syncStatus} message={loadError} signInHref={signInHref} onRetry={() => void refresh()} />}
          {loading && !demo ? (
            <div className="loading-state">
              <Die value="N" />
              <h2>Abrindo seu universo…</h2>
              <p>Reunindo suas campanhas e personagens.</p>
            </div>
          ) : loadError && !demo && !hasLoadedReal ? (
            <Empty title="Sua mesa está a um passo" description={loadError}>
              {syncStatus === "expired" ? <a className="button primary" href={signInHref} target="_top"><LogIn size={16} />Entrar novamente</a> : <Button
                onClick={() => {
                  setLoading(true);
                  void refresh();
                }}
              >
                Tentar novamente
              </Button>}
              <Button variant="secondary" onClick={switchMode}>
                Explorar demonstração
              </Button>
            </Empty>
          ) : (
            <>
              {route.page === "dashboard" && (
                <>
                  <PageHeading
                    eyebrow="SEU UNIVERSO, EM UM SÓ LUGAR"
                    title="Bom ter você na mesa."
                    description="Suas campanhas, seus personagens e todas as histórias que vêm por aí."
                  >
                    <Button
                      variant="secondary"
                      onClick={() => setModal({ type: "join" })}
                    >
                      <Users size={16} />
                      Entrar em campanha
                    </Button>
                    <Button onClick={() => createCampaign()}>
                      <Plus size={17} />
                      Nova campanha
                    </Button>
                  </PageHeading>
                  {resumeCampaign ? (
                    <DashboardResume
                      campaign={resumeCampaign}
                      sheet={resume.sheet}
                      sheetCampaign={campaigns.find((c) => c.id === resume.sheet?.campaignId)}
                      campaignVisited={resume.campaignVisited}
                      sheetVisited={resume.sheetVisited}
                      onCampaign={() => navigate("campaign", resumeCampaign.id)}
                      onSheet={() => { if (resume.sheet) navigate("sheet", resume.sheet.id); }}
                      onCreateSheet={(type) => createSheet(type, resumeCampaign.id)}
                      onDice={() => setModal({ type: "dice", campaignId: resumeCampaign.id })}
                      onHistory={() => { setHistoryCampaign(resumeCampaign.id); navigate("history"); }}
                    />
                  ) : <div className="welcome-banner">
                    <div className="hero-copy">
                      <span className="eyebrow">
                        <span className="little-line" />O PRÓXIMO CAPÍTULO É SEU
                      </span>
                      <h2>
                        Toda grande história
                        <br />
                        começa com <em>uma escolha.</em>
                      </h2>
                      <p>
                        Crie seu personagem. Encontre sua mesa.
                        <br />
                        Deixe os dados contarem o resto.
                      </p>
                      <button
                        className="hero-link"
                        onClick={() => createSheet()}
                      >
                        Dê vida a um personagem
                        <ArrowUpRight size={17} />
                      </button>
                    </div>
                    <div className="hero-visual" aria-hidden="true">
                      <div className="hero-ring ring-outer" />
                      <div className="hero-ring ring-middle" />
                      <div className="hero-ring ring-inner" />
                      <span className="hero-star hero-star-1">✦</span>
                      <span className="hero-star hero-star-2">✧</span>
                      <span className="hero-star hero-star-3">✦</span>
                      <Die value="N" />
                      <span className="hero-coordinate">
                        EST. 2026 / INFINITAS POSSIBILIDADES
                      </span>
                    </div>
                  </div>}
                  <div className="stats-row">
                    {[
                      {
                        label: "Campanhas",
                        value: campaigns.length,
                        Icon: Compass,
                        sub: "mundos para explorar",
                      },
                      {
                        label: "Personagens",
                        value: chars.length,
                        Icon: Users,
                        sub: "histórias em construção",
                      },
                      {
                        label: "Criaturas",
                        value: monsters.length,
                        Icon: Skull,
                        sub: "além do desconhecido",
                      },
                      {
                        label: "Sistemas",
                        value: new Set(campaigns.map((c) => c.system)).size,
                        Icon: BookOpen,
                        sub: "maneiras de jogar",
                      },
                    ].map(({ label, value, Icon, sub }) => (
                      <div className="stat" key={label}>
                        <span className="stat-icon">
                          <Icon size={19} />
                        </span>
                        <div>
                          <span>{label}</span>
                          <strong>{String(value).padStart(2, "0")}</strong>
                          <small>{sub}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="dashboard-columns">
                    <div className="dashboard-primary">
                      <SectionTitle
                        title="Suas campanhas"
                        subtitle="Universos diferentes. A mesma vontade de jogar."
                        action="Ver todas"
                        onAction={() => navigate("campaigns")}
                      />
                      {campaigns.length ? (
                        <div className="campaign-grid">
                          {campaigns.slice(0, 2).map((c) => (
                            <CampaignCard
                              key={c.id}
                              campaign={c}
                              count={
                                sheets.filter((s) => s.campaignId === c.id)
                                  .length
                              }
                              onOpen={() => navigate("campaign", c.id)}
                            />
                          ))}
                        </div>
                      ) : (
                        <Empty
                          icon={<Compass />}
                          title="Um universo inteiro por criar"
                          description="Comece uma campanha como mestre ou entre na mesa de um amigo."
                        >
                          <Button onClick={() => createCampaign()}>
                            <Plus size={16} />
                            Criar minha primeira campanha
                          </Button>
                        </Empty>
                      )}
                      <div className="section-gap">
                        <SectionTitle
                          title="Seus personagens"
                          subtitle="Prontos para o próximo capítulo."
                          action="Ver fichas"
                          onAction={() => navigate("sheets")}
                        />
                        {chars.length ? (
                          <div className="recent-characters">
                            {chars.slice(0, 3).map((s) => (
                              <button
                                className="recent-character"
                                key={s.id}
                                onClick={() => navigate("sheet", s.id)}
                              >
                                <Portrait sheet={s} size="small" />
                                <div>
                                  <strong>{s.name}</strong>
                                  <span>
                                    {s.className || systemById(s.system).name}
                                  </span>
                                </div>
                                <div className="recent-health">
                                  <i /> {s.resources.hp.current}
                                  <small>/{s.resources.hp.max} PV</small>
                                </div>
                                <ArrowUpRight size={16} />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-characters">
                            <BookOpen size={23} />
                            <p>
                              Seu primeiro personagem está esperando um nome.
                            </p>
                            <button
                              className="text-button"
                              onClick={() => createSheet()}
                            >
                              Criar personagem
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <aside className="dashboard-secondary">
                      <DicePanel
                        {...diceProps}
                        onHistory={() => navigate("history")}
                      />
                      <div className="small-tip">
                        <span className="tip-icon">
                          <Sparkles size={18} />
                        </span>
                        <div>
                          <span className="eyebrow">FEITO PARA SUA MESA</span>
                          <h4>Suas regras têm espaço aqui.</h4>
                          <p>
                            De Ordem a Jujutsu: personalize técnicas, ataques e
                            habilidades do seu jeito.
                          </p>
                          <button
                            className="text-button"
                            onClick={() => navigate("systems")}
                          >
                            Explorar sistemas
                            <ArrowUpRight size={13} />
                          </button>
                        </div>
                      </div>
                    </aside>
                  </div>
                  <div className="app-footer">
                    <span>
                      NEXO <i />
                      Histórias que conectam.
                    </span>
                    <span>Feito para quem vive outras vidas.</span>
                  </div>
                </>
              )}
              {route.page === "campaigns" && (
                <>
                  <PageHeading
                    eyebrow="NOVOS MUNDOS, VELHAS AMIZADES"
                    title="Suas campanhas"
                    description="Cada mesa é um universo. Escolha por onde continuar."
                  >
                    <Button
                      variant="secondary"
                      onClick={() => setModal({ type: "join" })}
                    >
                      <Users size={16} />
                      Entrar com código
                    </Button>
                    <Button onClick={() => createCampaign()}>
                      <Plus size={17} />
                      Nova campanha
                    </Button>
                  </PageHeading>
                  <div className="filter-bar">
                    <div className="segmented-control">
                      {[
                        ["all", "Todas"],
                        ["gm", "Como mestre"],
                        ["player", "Como jogador"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          className={filter === key ? "active" : ""}
                          onClick={() => setFilter(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <span className="muted small">
                      {campaigns.length} campanhas no seu universo
                    </span>
                  </div>
                  <div className="campaign-grid large">
                    {campaigns
                      .filter((c) => filter === "all" || c.role === filter)
                      .map((c) => (
                        <CampaignCard
                          key={c.id}
                          campaign={c}
                          count={
                            sheets.filter((s) => s.campaignId === c.id).length
                          }
                          onOpen={() => navigate("campaign", c.id)}
                        />
                      ))}
                    <button
                      className="new-campaign-card"
                      onClick={() => createCampaign()}
                    >
                      <span>
                        <Plus size={26} />
                      </span>
                      <h3>O próximo universo é seu</h3>
                      <p>Crie uma campanha e reúna sua mesa.</p>
                    </button>
                  </div>
                </>
              )}
              {route.page === "campaign" &&
                (currentCampaign ? (
                  <>
                  <CampaignDetail
                    campaign={currentCampaign}
                    sheets={sheets.filter(
                      (s) => s.campaignId === currentCampaign.id,
                    )}
                    onBack={() => navigate("campaigns")}
                    onSheet={(id) => navigate("sheet", id)}
                    onCreate={(type) => createSheet(type, currentCampaign.id)}
                    onEdit={() =>
                      setModal({
                        type: "edit-campaign",
                        campaignId: currentCampaign.id,
                      })
                    }
                    onMembers={() =>
                      setModal({
                        type: "members",
                        campaignId: currentCampaign.id,
                      })
                    }
                  />
                  {!demo && authProvider === "supabase" && <CampaignAssets key={currentCampaign.id} campaign={currentCampaign} sheets={sheets.filter((s) => s.campaignId === currentCampaign.id)} user={user} onRefresh={refresh} />}
                  </>
                ) : (
                  <Empty
                    title="Campanha não encontrada"
                    description="Confira se você entrou na conta e na campanha corretas."
                  >
                    <Button onClick={() => navigate("campaigns")}>
                      Voltar às campanhas
                    </Button>
                  </Empty>
                ))}
              {(route.page === "sheets" || route.page === "bestiary") && (
                <>
                  <PageHeading
                    eyebrow={
                      route.page === "bestiary"
                        ? "O DESCONHECIDO TEM MUITAS FORMAS"
                        : "CADA PERSONAGEM, UMA NOVA VIDA"
                    }
                    title={
                      route.page === "bestiary" ? "Além do véu" : "Suas fichas"
                    }
                    description={
                      route.page === "bestiary"
                        ? "Criaturas e ameaças das suas campanhas. Um espaço reservado ao mestre."
                        : "Acompanhe seus personagens e as fichas das campanhas que você mestra."
                    }
                  >
                    {(route.page !== "bestiary" || canCreateThreat) && <Button
                      onClick={() =>
                        createSheet(
                          route.page === "bestiary" ? "monster" : "character",
                        )
                      }
                    >
                      <Plus size={16} />
                      {route.page === "bestiary"
                        ? "Nova criatura"
                        : "Novo personagem"}
                    </Button>}
                  </PageHeading>
                  <div className="filter-bar">
                    <div className="segmented-control">
                      <button
                        className={filter === "all" ? "active" : ""}
                        onClick={() => setFilter("all")}
                      >
                        Todas as campanhas
                      </button>
                      {campaigns.map((c) => (
                        <button
                          key={c.id}
                          className={filter === c.id ? "active" : ""}
                          onClick={() => setFilter(c.id)}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(route.page === "bestiary" ? monsters : chars).filter(
                    (s) => filter === "all" || s.campaignId === filter,
                  ).length ? (
                    <div className="sheet-grid library-sheets">
                      {(route.page === "bestiary" ? monsters : chars)
                        .filter(
                          (s) => filter === "all" || s.campaignId === filter,
                        )
                        .map((s) => (
                          <SheetCard
                            key={s.id}
                            sheet={s}
                            campaign={campaigns.find(
                              (c) => c.id === s.campaignId,
                            )}
                            onOpen={() => navigate("sheet", s.id)}
                          />
                        ))}
                    </div>
                  ) : (
                    <Empty
                      icon={
                        route.page === "bestiary" ? <Skull /> : <BookOpen />
                      }
                      title={
                        route.page === "bestiary"
                          ? "O mistério ainda não ganhou forma"
                          : "Quem será você nesta história?"
                      }
                      description={
                        route.page === "bestiary"
                          ? "Crie uma campanha como mestre para adicionar monstros. Jogadores não têm acesso ao bestiário."
                          : "Crie um personagem para começar a preencher sua ficha."
                      }
                    >
                      {(route.page !== "bestiary" || canCreateThreat) && <Button
                        onClick={() =>
                          createSheet(
                            route.page === "bestiary" ? "monster" : "character",
                          )
                        }
                      >
                        <Plus size={16} />
                        Começar uma ficha
                      </Button>}
                    </Empty>
                  )}
                </>
              )}
              {route.page === "sheet" &&
                (currentSheet && sheetCampaign ? (
                  <SheetView
                    key={currentSheet.id}
                    draftScope={demo ? "demo" : user.id}
                    syncStatus={syncStatus}
                    lastSavedAt={lastSavedAt}
                    demo={demo}
                    sheet={currentSheet}
                    campaign={sheetCampaign}
                    rolls={rolls}
                    busy={busy}
                    onBack={() => navigate("campaign", currentSheet.campaignId)}
                    onDuplicate={() => setModal({ type: "duplicate-sheet", sheetId: currentSheet.id, campaignId: currentSheet.campaignId })}
                    onSave={async (s) => {
                      const result = await mutation({
                        action: "update_sheet",
                        sheetId: s.id,
                        sheet: s,
                        version: s.version,
                      });
                      if (result) notify("Ficha salva. A história continua.");
                      return !!result;
                    }}
                    onResource={async (key, delta) =>
                      !!(await mutation({
                        action: "resource",
                        sheetId: currentSheet.id,
                        key,
                        delta,
                      }))
                    }
                    onRoll={(request) =>
                      void roll(
                        request,
                        currentSheet.campaignId,
                        currentSheet.id,
                        currentSheet.type === "monster" ? "gm" : "table",
                      )
                    }
                    onDelete={async () => {
                      const result = await mutation({
                        action: "delete_sheet",
                        sheetId: currentSheet.id,
                      });
                      if (result) {
                        navigate("campaign", currentSheet.campaignId);
                        notify("Ficha excluída.");
                      }
                      return !!result;
                    }}
                    notify={notify}
                  />
                ) : (
                  <Empty
                    title="Ficha não encontrada"
                    description="Esta ficha pode ter sido removida ou pertencer a outro jogador."
                  >
                    <Button onClick={() => navigate("sheets")}>
                      Voltar às fichas
                    </Button>
                  </Empty>
                ))}
              {route.page === "history" && (
                <>
                  <PageHeading
                    eyebrow="CADA DADO CONTA UMA HISTÓRIA"
                    title="O que o destino decidiu"
                    description="Testes, ataques e momentos que ficaram marcados na sua mesa."
                  >
                    <Button onClick={() => setModal({ type: "dice" })}>
                      <Dices size={16} />
                      Rolar dados
                    </Button>
                  </PageHeading>
                  <div className="filter-bar">
                    <div className="segmented-control">
                      <button
                        className={historyCampaign === "all" ? "active" : ""}
                        onClick={() => setHistoryCampaign("all")}
                      >
                        Todas as campanhas
                      </button>
                      {campaigns.map((c) => (
                        <button
                          key={c.id}
                          className={historyCampaign === c.id ? "active" : ""}
                          onClick={() => setHistoryCampaign(c.id)}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                    <span className="muted small">
                      Até 150 rolagens recentes
                    </span>
                  </div>
                  <div className="panel history-panel">
                    <RollHistory
                      rolls={rolls.filter(
                        (r) =>
                          historyCampaign === "all" ||
                          r.campaignId === historyCampaign,
                      )}
                    />
                  </div>
                </>
              )}
              {route.page === "systems" && (
                <>
                  <PageHeading
                    eyebrow="UM NEXO. INFINITOS UNIVERSOS."
                    title="Qual história vamos viver?"
                    description="Escolha o sistema da sua próxima campanha. O seu jeito de jogar tem lugar aqui."
                  />
                  <div className="system-library">
                    {SYSTEMS.map((s, i) => (
                      <button
                        className={`system-library-card system-${s.id}`}
                        key={s.id}
                        onClick={() => createCampaign(s.id)}
                      >
                        <span className="system-index">
                          0{i + 1} / UNIVERSOS
                        </span>
                        <div className="system-symbol">
                          {s.id === "ordem" ? (
                            <Eye size={48} />
                          ) : s.id === "jujutsu" ? (
                            <Sparkles size={48} />
                          ) : s.id === "cthulhu" ? (
                            <Skull size={48} />
                          ) : (
                            <Die value={s.id === "dnd" ? "20" : "N"} />
                          )}
                        </div>
                        <SystemMark system={s.id} />
                        <h2>{s.name}</h2>
                        <p>{s.description}</p>
                        <div>
                          <span className={`support-tag ${s.support}`}>
                            {s.support === "ready"
                              ? "Ficha dedicada"
                              : "Modelo inicial"}
                          </span>
                          <ArrowUpRight size={18} />
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="hint-box section-gap">
                    <Sparkles size={20} />
                    <p>
                      Ordem e Jujutsu compartilham a base de testes de Ordem.
                      D&D, Cthulhu, Tormenta e o sistema personalizado começam
                      com modelos editáveis; criação de classes, regras de
                      descanso e outras automações poderão evoluir nas próximas
                      versões.
                    </p>
                  </div>
                  <div className="section-gap">
                    <OrdemLibrary
                      sheets={sheets.filter(
                        (sheet) =>
                          sheet.ownerId === user.id && sheet.system === "ordem",
                      )}
                      onAddRitual={async (sheet, ritual) => {
                        const knownRituals = sheet.rituals ?? [];
                        if (knownRituals.some((item) => item.id === ritual.id)) {
                          notify("Este ritual já está na ficha.", true);
                          return;
                        }
                        const result = await mutation({
                          action: "update_sheet",
                          sheetId: sheet.id,
                          version: sheet.version,
                          sheet: { ...sheet, rituals: [...knownRituals, ritual] },
                        });
                        if (result) notify(`${ritual.name} adicionado a ${sheet.name}.`);
                      }}
                      onAddWeapon={async (sheet, weapon) => {
                        if (sheet.attacks.some((item) => item.name === weapon.name)) {
                          notify("Esta arma já está na ficha.", true);
                          return;
                        }
                        const skill = sheet.skills.find((item) =>
                          weapon.category.includes("corpo a corpo")
                            ? item.name === "Luta"
                            : item.name === "Pontaria",
                        ) ?? sheet.skills[0];
                        if (!skill) {
                          notify("A ficha não possui uma perícia de ataque válida.", true);
                          return;
                        }
                        const result = await mutation({
                          action: "update_sheet",
                          sheetId: sheet.id,
                          version: sheet.version,
                          sheet: {
                            ...sheet,
                            attacks: [
                              ...sheet.attacks,
                              {
                                id: `library-${weapon.id}`,
                                name: weapon.name,
                                skillId: skill.id,
                                damage: weapon.damage,
                                range: weapon.range,
                                critical: weapon.critical,
                                description: `${weapon.category}. Adicionada da biblioteca de Ordem Paranormal.`,
                              },
                            ],
                          },
                        });
                        if (result) notify(`${weapon.name} adicionada a ${sheet.name}.`);
                      }}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
      {modal?.type === "campaign" && (
        <CampaignForm
          initialSystem={modal.system}
          busy={busy}
          onClose={() => setModal(null)}
          onSubmit={async (campaign) => {
            const result = await mutation({
              action: "create_campaign",
              campaign,
            });
            if (result?.id) {
              navigate("campaign", result.id);
              notify(
                demo
                  ? "Campanha criada na demonstração."
                  : "Campanha criada. Sua mesa está pronta!",
              );
            }
            return !!result;
          }}
        />
      )}
      {modal?.type === "edit-campaign" && modalCampaign && (
        <CampaignForm
          campaign={modalCampaign}
          busy={busy}
          onClose={() => setModal(null)}
          onSubmit={async (campaign) => {
            const result = await mutation({
              action: "edit_campaign",
              campaignId: modalCampaign.id,
              campaign,
            });
            if (result) notify("Campanha atualizada.");
            return !!result;
          }}
        />
      )}
      {modal?.type === "join" && (
        <JoinForm
          busy={busy}
          onClose={() => setModal(null)}
          onJoin={async (code) => {
            const result = await mutation({ action: "join", code });
            if (result?.id) {
              navigate("campaign", result.id);
              notify("Bem-vindo à mesa!");
            }
            return !!result;
          }}
        />
      )}
      {modal?.type === "new-sheet" && (
        <NewSheetForm
          campaigns={campaigns}
          initialCampaignId={modal.campaignId}
          type={modal.sheetType || "character"}
          userId={user.id}
          busy={busy}
          onClose={() => setModal(null)}
          onCreate={async (value) => {
            const result = await mutation({ action: "create_sheet", ...value });
            if (result?.id) {
              navigate("sheet", result.id);
              notify("Ficha criada. Dê vida à sua história.");
            }
            return !!result;
          }}
        />
      )}
      {modal?.type === "duplicate-sheet" && modalSheet && modalCampaign && (
        <DuplicateSheetForm
          key={modalSheet.id}
          sheet={modalSheet}
          campaign={modalCampaign}
          suggestedName={suggestedCopyName(modalSheet.name, sheets.filter((s) => s.campaignId === modalSheet.campaignId).map((s) => s.name))}
          busy={busy}
          onClose={() => setModal(null)}
          onDuplicate={async (name) => {
            const result = await mutation({ action: "duplicate_sheet", sheetId: modalSheet.id, name, version: modalSheet.version });
            if (!result?.id) return false;
            setModal(null);
            navigate("sheet", result.id);
            notify("Cópia criada. Sua nova ficha está pronta.");
            return true;
          }}
        />
      )}
      {modal?.type === "members" && modalCampaign && (
        <MembersModal
          campaign={modalCampaign}
          busy={busy}
          onClose={() => setModal(null)}
          onRotate={() =>
            void mutation({
              action: "rotate_invite",
              campaignId: modalCampaign.id,
            })
          }
          onRemove={(memberId) =>
            void mutation({
              action: "remove_member",
              campaignId: modalCampaign.id,
              memberId,
            })
          }
          notify={notify}
        />
      )}
      {modal?.type === "dice" && (
        <Modal
          title="Os dados estão na mesa"
          subtitle="Escolha seus dados e deixe a história acontecer."
          onClose={() => setModal(null)}
        >
          <div className="modal-body">
            <DicePanel {...diceProps} campaigns={modalCampaign ? [modalCampaign, ...campaigns.filter((c) => c.id !== modalCampaign.id)] : campaigns} expanded />
          </div>
        </Modal>
      )}
      {modal?.type === "help" && (
        <Modal
          title="Sua próxima aventura começa aqui"
          subtitle="O Nexo cuida da ficha. Você vive a história."
          onClose={() => setModal(null)}
        >
          <div className="modal-body help-steps">
            {[
              [
                "01",
                "Reúna sua mesa",
                "Crie uma campanha, escolha o sistema e compartilhe o código de convite com os jogadores.",
              ],
              [
                "02",
                "Dê vida aos personagens",
                "Cada jogador cria suas fichas. O mestre acompanha todas elas e prepara suas próprias criaturas.",
              ],
              [
                "03",
                "Deixe os dados decidirem",
                "Clique em atributos, perícias e ataques para rolar. Ajuste vida, energia e sanidade durante a sessão.",
              ],
            ].map(([n, t, d]) => (
              <div key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </div>
            ))}
            <div className="hint-box">
              <Shield size={20} />
              <p>
                O login usa sua conta ChatGPT. Suas fichas reais ficam salvas na
                sua conta. A demonstração guarda apenas os exemplos neste
                navegador.
              </p>
            </div>
            {initialUser && (
              <Button
                variant="secondary"
                onClick={() => {
                  switchMode();
                  setModal(null);
                }}
              >
                <FlaskConical size={16} />
                {demo
                  ? "Voltar às minhas campanhas"
                  : "Explorar mesa de demonstração"}
              </Button>
            )}
            {demo && (
              <button
                className="text-button reset-demo"
                onClick={() => {
                  setSample(createDemo());
                  setPlayerPreview(false);
                  navigate("dashboard");
                  setModal(null);
                  notify("Exemplos restaurados.");
                }}
              >
                Restaurar exemplos da demonstração
              </button>
            )}
          </div>
        </Modal>
      )}
      {modal?.type === "profile" && initialUser && (
        <Modal
          title="Seu nome na mesa"
          subtitle="Sua conta e o nome que aparece para os outros jogadores."
          onClose={() => setModal(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (demo) {
                notify("Volte às suas campanhas para editar seu perfil.");
                return;
              }
              const result = await mutation({
                action: "profile",
                name: profileName,
              });
              if (result) {
                notify("Perfil atualizado.");
                setModal(null);
              }
            }}
          >
            <div className="modal-body">
              <div className="hint-box">
                <Shield size={19} />
                <p>Conectado com ChatGPT. Campanhas, fichas e rolagens são salvas na sua conta. Seu nome de exibição não altera suas permissões na mesa.</p>
              </div>
              <Field label="Nome de exibição">
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  minLength={2}
                  maxLength={80}
                  required
                  autoFocus
                />
              </Field>
              {demo && (
                <p className="muted small">
                  Você está explorando os exemplos. Volte às suas campanhas para
                  editar sua conta.
                </p>
              )}
              <a
                className="text-button danger-text"
                href={signOutHref}
                target="_top"
              >
                <LogOut size={16} />
                Sair da conta
              </a>
            </div>
            <div className="modal-footer">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy || demo}>
                Salvar nome
                <Check size={15} />
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {rollResult && (
        <div
          className={`roll-result ${rollResult.critical ? "critical" : ""}`}
          role="status"
        >
          <button
            className="icon-button"
            aria-label="Fechar resultado"
            onClick={() => setRollResult(null)}
          >
            <X size={16} />
          </button>
          <span className="eyebrow">
            {rollResult.visibility === "gm" ? (
              <>
                <EyeOff size={12} />
                ROLAGEM PRIVADA
              </>
            ) : (
              "O DESTINO DECIDIU"
            )}
          </span>
          <div>
            <Die value={rollResult.total} />
            <div>
              <h3>{rollResult.label}</h3>
              <p>{rollResult.characterName}</p>
              <span className="result-formula">
                {rollResult.formula} <span className="dot">·</span> [
                {rollResult.dice.join(", ")}]
                {rollResult.bonus
                  ? `${rollResult.bonus > 0 ? " + " : " − "}${Math.abs(rollResult.bonus)}`
                  : ""}
              </span>
            </div>
          </div>
          {rollResult.critical && (
            <span className="critical-tag">
              <Sparkles size={13} />
              Acerto crítico!
            </span>
          )}
          {rollResult.mode === "percentile" && (
            <span
              className={rollResult.success ? "success-text" : "danger-text"}
            >
              {rollResult.success ? "Sucesso" : "Falha"} · alvo{" "}
              {rollResult.target}%
            </span>
          )}
          <span className="result-rule">
            {rollResult.mode === "highest"
              ? "Maior dado + bônus"
              : rollResult.mode === "lowest"
                ? "Menor dado + bônus"
                : rollResult.mode === "percentile"
                  ? "Resultado igual ou menor que o alvo"
                  : "Soma dos dados + bônus"}
          </span>
        </div>
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <CircleHelp size={17} /> : <Check size={17} />}
          <span>{toast.text}</span>
          <button
            className="icon-button"
            aria-label="Fechar aviso"
            onClick={() => setToast(null)}
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

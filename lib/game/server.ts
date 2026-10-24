import { z } from "zod";
import type {
  Campaign,
  Member,
  Roll,
  RollRequest,
  Sheet,
  User,
  Workspace,
} from "./types";
import { canEditSheet, canSeeRoll } from "./access";
import { campaignSchema, sheetSchema } from "./validation";
import { newSheet, systemById } from "./systems";
import { resolveRoll } from "./dice";
import { ORDEM_RITUALS, ORDEM_WEAPONS } from "./ordem-library";
import { GameError } from "./errors";
import { database, preparePersistence } from "./persistence";
export { GameError, database };

type CampaignRow = {
  id: string;
  name: string;
  description: string;
  system: Campaign["system"];
  banner: string;
  status: Campaign["status"];
  invite_code: string;
  created_at: string;
  role: Campaign["role"];
};
type SheetRow = {
  id: string;
  campaign_id: string;
  owner_id: string;
  type: Sheet["type"];
  data: string;
  version: number;
  updated_at: string;
  owner_name: string;
};
function hydrateSheet(row: SheetRow): Sheet {
  return {
    ...JSON.parse(row.data),
    rituals: JSON.parse(row.data).rituals ?? [],
    id: row.id,
    campaignId: row.campaign_id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    type: row.type,
    version: row.version,
    updatedAt: row.updated_at,
  };
}
export async function ensureProfile(user: User) {
  await preparePersistence();
  await database()
    .prepare(
      "INSERT INTO profiles (id, name, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING",
    )
    .bind(user.id, user.name.slice(0, 80), new Date().toISOString())
    .run();
}
export async function workspaceFor(
  user: User,
): Promise<Workspace & { user: User }> {
  const db = database();
  const profile = await db
    .prepare("SELECT name FROM profiles WHERE id = ?")
    .bind(user.id)
    .first<{ name: string }>();
  const campaignRows = (
    await db
      .prepare(
        "SELECT c.*, m.role FROM campaigns c JOIN memberships m ON m.campaign_id=c.id WHERE m.user_id=? ORDER BY c.created_at DESC",
      )
      .bind(user.id)
      .all<CampaignRow>()
  ).results;
  const members = (
    await db
      .prepare(
        "SELECT m.campaign_id, m.user_id AS id, p.name, m.role FROM memberships m JOIN profiles p ON p.id=m.user_id WHERE m.campaign_id IN (SELECT campaign_id FROM memberships WHERE user_id=?)",
      )
      .bind(user.id)
      .all<Member & { campaign_id: string }>()
  ).results;
  const campaigns: Campaign[] = campaignRows.map((c) => {
    const list = members
      .filter((m) => m.campaign_id === c.id)
      .map(({ id, name, role }) => ({ id, name, role }));
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      system: c.system,
      banner: c.banner,
      status: c.status,
      createdAt: c.created_at,
      role: c.role,
      members: list,
      gmName: list.find((m) => m.role === "gm")?.name ?? "Mestre",
      ...(c.role === "gm" ? { inviteCode: c.invite_code } : {}),
    };
  });
  const sheetRows = (
    await db
      .prepare(
        "SELECT s.*, p.name AS owner_name FROM sheets s JOIN profiles p ON p.id=s.owner_id JOIN memberships m ON m.campaign_id=s.campaign_id AND m.user_id=? WHERE m.role='gm' OR (s.owner_id=? AND s.type='character') ORDER BY s.updated_at DESC",
      )
      .bind(user.id, user.id)
      .all<SheetRow>()
  ).results;
  // Restrict private events before LIMIT so other users' private rolls cannot crowd out visible events.
  const rollRows = (
    await db
      .prepare(
        "SELECT r.data, r.visibility, r.user_id, r.campaign_id FROM rolls r JOIN memberships m ON m.campaign_id=r.campaign_id AND m.user_id=? WHERE r.visibility='table' OR m.role='gm' OR r.user_id=? ORDER BY r.created_at DESC LIMIT 150",
      )
      .bind(user.id, user.id)
      .all<{
        data: string;
        visibility: string;
        user_id: string;
        campaign_id: string;
      }>()
  ).results;
  const rolls = rollRows
    .filter((r) =>
      canSeeRoll(user.id, campaigns.find((c) => c.id === r.campaign_id)!.role, {
        userId: r.user_id,
        visibility: r.visibility,
      }),
    )
    .map((r) => JSON.parse(r.data) as Roll);
  return {
    campaigns,
    sheets: sheetRows.map(hydrateSheet),
    rolls,
    user: { id: user.id, name: profile?.name ?? user.name },
  };
}
async function membership(userId: string, campaignId: string) {
  const row = await database()
    .prepare("SELECT role FROM memberships WHERE campaign_id=? AND user_id=?")
    .bind(campaignId, userId)
    .first<{ role: Campaign["role"] }>();
  if (!row) throw new GameError("Você não participa desta campanha.", 403);
  return row.role;
}
async function requireGM(userId: string, campaignId: string) {
  if ((await membership(userId, campaignId)) !== "gm")
    throw new GameError("Somente o mestre pode fazer isso.", 403);
}
async function ownedSheet(userId: string, sheetId: string) {
  const row = await database()
    .prepare(
      "SELECT s.*, p.name AS owner_name FROM sheets s JOIN profiles p ON p.id=s.owner_id WHERE s.id=?",
    )
    .bind(sheetId)
    .first<SheetRow>();
  if (!row) throw new GameError("Ficha não encontrada.", 404);
  const sheet = hydrateSheet(row);
  const role = await membership(userId, sheet.campaignId);
  if (!canEditSheet(userId, role, sheet))
    throw new GameError("Você não tem acesso a esta ficha.", 403);
  return sheet;
}
async function saveSheet(sheet: Sheet, expectedVersion: number) {
  const updatedAt = new Date().toISOString();
  const result = await database()
    .prepare(
      "UPDATE sheets SET data=?, version=version+1, updated_at=? WHERE id=? AND version=?",
    )
    .bind(JSON.stringify(sheet), updatedAt, sheet.id, expectedVersion)
    .run();
  if (!result.meta.changes)
    throw new GameError(
      "Esta ficha foi alterada em outra janela. Seus dados foram atualizados; tente novamente.",
      409,
    );
}
const idSchema = z.string().min(1).max(100);
const rollRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("manual"),
    formula: z.string().max(40),
    label: z.string().max(80).optional(),
  }),
  z.object({ kind: z.literal("skill"), id: idSchema }),
  z.object({ kind: z.literal("attribute"), id: idSchema }),
  z.object({
    kind: z.literal("attack"),
    id: idSchema,
    damage: z.boolean().optional(),
  }),
  z.object({ kind: z.literal("ability"), id: idSchema }),
]);
export async function mutate(user: User, input: Record<string, unknown>) {
  const db = database(),
    now = new Date().toISOString();
  const action = z
    .enum([
      "create_campaign",
      "edit_campaign",
      "join",
      "rotate_invite",
      "remove_member",
      "create_sheet",
      "update_sheet",
      "resource",
      "delete_sheet",
      "roll",
      "profile",
    ])
    .parse(input.action);
  if (action === "create_campaign") {
    const c = campaignSchema.parse(input.campaign),
      id = crypto.randomUUID();
    const inviteCode = crypto
      .randomUUID()
      .replaceAll("-", "")
      .slice(0, 20)
      .toUpperCase();
    await db.batch([
      db
        .prepare(
          "INSERT INTO campaigns (id,name,description,system,banner,status,invite_code,created_at) VALUES (?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          c.name,
          c.description,
          c.system,
          c.banner,
          c.status,
          inviteCode,
          now,
        ),
      db
        .prepare(
          "INSERT INTO memberships (campaign_id,user_id,role) VALUES (?,?,'gm')",
        )
        .bind(id, user.id),
    ]);
    return { id };
  }
  if (action === "join") {
    const code = z
      .string()
      .trim()
      .min(6)
      .max(64)
      .parse(input.code)
      .toUpperCase()
      .replace(/\s/g, "");
    const c = await db
      .prepare("SELECT id FROM campaigns WHERE invite_code=?")
      .bind(code)
      .first<{ id: string }>();
    if (!c)
      throw new GameError(
        "Convite não encontrado. Confira o código com o mestre.",
        404,
      );
    await db
      .prepare(
        "INSERT INTO memberships (campaign_id,user_id,role) VALUES (?,?,'player') ON CONFLICT(campaign_id,user_id) DO NOTHING",
      )
      .bind(c.id, user.id)
      .run();
    return { id: c.id };
  }
  if (action === "profile") {
    const name = z.string().trim().min(2).max(80).parse(input.name);
    await db
      .prepare("UPDATE profiles SET name=? WHERE id=?")
      .bind(name, user.id)
      .run();
    return {};
  }
  if (
    action === "edit_campaign" ||
    action === "rotate_invite" ||
    action === "remove_member"
  ) {
    const campaignId = idSchema.parse(input.campaignId);
    await requireGM(user.id, campaignId);
    if (action === "edit_campaign") {
      const c = campaignSchema.parse(input.campaign);
      // The system is immutable once a campaign exists; sheets keep their rules.
      await db
        .prepare(
          "UPDATE campaigns SET name=?,description=?,banner=?,status=? WHERE id=?",
        )
        .bind(c.name, c.description, c.banner, c.status, campaignId)
        .run();
    } else if (action === "rotate_invite") {
      await db
        .prepare("UPDATE campaigns SET invite_code=? WHERE id=?")
        .bind(
          crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase(),
          campaignId,
        )
        .run();
    } else {
      const memberId = idSchema.parse(input.memberId);
      if (memberId === user.id)
        throw new GameError("O mestre não pode remover a si mesmo.");
      // Ownership remains with the player; sheets are hidden until they rejoin.
      await db
        .prepare(
          "DELETE FROM memberships WHERE campaign_id=? AND user_id=? AND role='player'",
        )
        .bind(campaignId, memberId)
        .run();
    }
    return {};
  }
  if (action === "create_sheet") {
    const campaignId = idSchema.parse(input.campaignId),
      role = await membership(user.id, campaignId);
    const type = z.enum(["character", "monster"]).parse(input.type);
    if (type === "monster" && role !== "gm")
      throw new GameError("Somente o mestre pode criar monstros.", 403);
    const ownerId =
      role === "gm" && type === "character" && input.ownerId
        ? idSchema.parse(input.ownerId)
        : user.id;
    await membership(ownerId, campaignId);
    const c = await db
      .prepare("SELECT system FROM campaigns WHERE id=?")
      .bind(campaignId)
      .first<{ system: Sheet["system"] }>();
    if (!c) throw new GameError("Campanha não encontrada.", 404);
    const sheet = newSheet(c.system, campaignId, ownerId, user.name, type);
    sheet.name = z.string().trim().min(1).max(100).parse(input.name);
    if (c.system === "ordem" && type === "character") {
      const ritualId = z.string().max(120).optional().parse(input.ritualId);
      const weaponId = z.string().max(120).optional().parse(input.weaponId);
      const ritual = ORDEM_RITUALS.find((item) => item.id === ritualId);
      const weapon = ORDEM_WEAPONS.find((item) => item.id === weaponId);
      if (ritual) sheet.rituals = [ritual];
      if (weapon) {
        const skill = sheet.skills.find((item) =>
          weapon.category.includes("corpo a corpo")
            ? item.name === "Luta"
            : item.name === "Pontaria",
        ) ?? sheet.skills[0];
        if (skill) sheet.attacks = [{
          id: `library-${weapon.id}`,
          name: weapon.name,
          skillId: skill.id,
          damage: weapon.damage,
          range: weapon.range,
          critical: weapon.critical,
          description: `${weapon.category}. Adicionada da biblioteca de Ordem Paranormal.`,
        }];
      }
    }
    await db
      .prepare(
        "INSERT INTO sheets (id,campaign_id,owner_id,type,data,version,updated_at) VALUES (?,?,?,?,?,1,?)",
      )
      .bind(sheet.id, campaignId, ownerId, type, JSON.stringify(sheet), now)
      .run();
    return { id: sheet.id };
  }
  if (
    action === "update_sheet" ||
    action === "resource" ||
    action === "delete_sheet"
  ) {
    const sheet = await ownedSheet(user.id, idSchema.parse(input.sheetId));
    if (action === "delete_sheet") {
      await db.prepare("DELETE FROM sheets WHERE id=?").bind(sheet.id).run();
      return {};
    }
    if (action === "resource") {
      const key = z.enum(["hp", "ep", "sanity"]).parse(input.key),
        delta = z.number().int().min(-9999).max(9999).parse(input.delta);
      const r = sheet.resources[key];
      sheet.resources[key] = {
        ...r,
        current: Math.max(0, Math.min(r.max, r.current + delta)),
      };
    } else {
      const content = sheetSchema.parse(input.sheet);
      const expected = z.number().int().min(1).parse(input.version);
      if (sheet.version !== expected)
        throw new GameError(
          "A ficha mudou enquanto você editava. Copie suas anotações, atualize e tente novamente.",
          409,
        );
      const required = systemById(sheet.system).attributes.map((a) => a.key);
      if (required.some((k) => content.attributes[k] === undefined))
        throw new GameError("Preencha todos os atributos do sistema.");
      if (
        (sheet.system === "ordem" || sheet.system === "jujutsu") &&
        required.some(
          (k) => content.attributes[k] < 0 || content.attributes[k] > 10,
        )
      )
        throw new GameError("Os atributos de Ordem devem ficar entre 0 e 10.");
      Object.assign(sheet, content);
    }
    await saveSheet(sheet, sheet.version);
    return { id: sheet.id };
  }
  const campaignId = idSchema.parse(input.campaignId),
    role = await membership(user.id, campaignId);
  const request = rollRequestSchema.parse(input.request) as RollRequest;
  const visibility = z.enum(["table", "gm"]).parse(input.visibility ?? "table");
  const sheet = input.sheetId
    ? await ownedSheet(user.id, idSchema.parse(input.sheetId))
    : null;
  if (sheet && sheet.campaignId !== campaignId)
    throw new GameError("A ficha pertence a outra campanha.", 403);
  if (sheet?.type === "monster" && visibility !== "gm")
    throw new GameError("Rolagens de monstros devem ser privadas.", 403);
  if (visibility === "gm" && role !== "gm")
    throw new GameError("A rolagem privada é exclusiva do mestre.", 403);
  let result: ReturnType<typeof resolveRoll>;
  try {
    result = resolveRoll(sheet, request);
  } catch (error) {
    throw new GameError(
      error instanceof Error ? error.message : "Rolagem inválida.",
    );
  }
  const roll: Roll = {
    ...result,
    id: crypto.randomUUID(),
    campaignId,
    userId: user.id,
    userName: user.name,
    characterName: sheet?.name ?? user.name,
    visibility,
    createdAt: now,
  };
  const insertRoll = db
    .prepare(
      "INSERT INTO rolls (id,campaign_id,user_id,sheet_id,visibility,data,created_at) VALUES (?,?,?,?,?,?,?)",
    )
    .bind(
      roll.id,
      campaignId,
      user.id,
      sheet?.id ?? null,
      visibility,
      JSON.stringify(roll),
      now,
    );
  if (sheet && request.kind === "ability") {
    const ability = sheet.abilities.find((a) => a.id === request.id)!;
    if (sheet.resources.ep.current < ability.cost)
      throw new GameError("Energia insuficiente para usar esta habilidade.");
    sheet.resources.ep.current -= ability.cost;
    // Conditional insert + update in a transactional D1 batch: charge once and record only when the version still matches.
    const conditionalRoll = db
      .prepare(
        "INSERT INTO rolls (id,campaign_id,user_id,sheet_id,visibility,data,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM sheets WHERE id=? AND version=?)",
      )
      .bind(
        roll.id,
        campaignId,
        user.id,
        sheet.id,
        visibility,
        JSON.stringify(roll),
        now,
        sheet.id,
        sheet.version,
      );
    const results = await db.batch([
      conditionalRoll,
      db
        .prepare(
          "UPDATE sheets SET data=?,version=version+1,updated_at=? WHERE id=? AND version=?",
        )
        .bind(JSON.stringify(sheet), now, sheet.id, sheet.version),
    ]);
    if (!results[1].meta.changes)
      throw new GameError(
        "A ficha acabou de mudar. Tente a habilidade novamente.",
        409,
      );
  } else await insertRoll.run();
  return { roll };
}

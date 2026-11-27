import { z } from "zod";
import type { Encounter, EncounterParticipant, User } from "./types";
import { database } from "./persistence";
import { GameError } from "./errors";
import { ENCOUNTER_ACTIONS, advanceEncounter, finishEncounter, parseEncounterDraft, startEncounter, type EncounterDraft } from "./encounters";
import { changeEncounterCondition, preserveParticipantConditions } from "./conditions";

type EncounterRow = { id: string; campaign_id: string; data: string; version: number; updated_at: string };
const idSchema = z.string().min(1).max(100);
const versionSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);

function hydrateEncounter(row: EncounterRow): Encounter {
  return { ...JSON.parse(row.data), id: row.id, campaignId: row.campaign_id, version: row.version, updatedAt: row.updated_at };
}

export async function encountersFor(user: User): Promise<Encounter[]> {
  const rows = (await database().prepare(
    "SELECT e.* FROM encounters e JOIN memberships m ON m.campaign_id=e.campaign_id WHERE m.user_id=? AND m.role='gm' ORDER BY e.updated_at DESC,e.id",
  ).bind(user.id).all<EncounterRow>()).results;
  return rows.map(hydrateEncounter);
}

async function requireEncounterMaster(userId: string, campaignId: string) {
  const member = await database().prepare("SELECT role FROM memberships WHERE campaign_id=? AND user_id=?")
    .bind(campaignId, userId).first<{ role: string }>();
  if (member?.role !== "gm") throw new GameError("Somente o mestre desta campanha pode conduzir encontros.", 403);
}

async function participantsFor(campaignId: string, draft: EncounterDraft): Promise<EncounterParticipant[]> {
  const rows = (await database().prepare("SELECT id,data FROM sheets WHERE campaign_id=?")
    .bind(campaignId).all<{ id: string; data: string }>()).results;
  const byId = new Map(rows.map((row) => [row.id, JSON.parse(row.data) as { name: string }]));
  return draft.participants.map((participant) => {
    const sheet = byId.get(participant.sheetId);
    if (!sheet) throw new GameError("Todos os participantes precisam ter uma ficha nesta campanha.", 403);
    return { sheetId: participant.sheetId, initiative: participant.initiative, name: sheet.name };
  });
}

export async function mutateEncounter(user: User, input: Record<string, unknown>): Promise<{ id: string }> {
  const action = z.enum(ENCOUNTER_ACTIONS).parse(input.action);
  const campaignId = idSchema.parse(input.campaignId);
  const now = new Date().toISOString();
  const db = database();
  if (action === "create_encounter") {
    await requireEncounterMaster(user.id, campaignId);
    const draft = parseEncounterDraft(input);
    const encounter: Encounter = {
      id: crypto.randomUUID(), campaignId, name: draft.name, participants: await participantsFor(campaignId, draft),
      status: "draft", round: 0, currentParticipantId: null, version: 1, updatedAt: now,
    };
    await db.prepare("INSERT INTO encounters (id,campaign_id,data,version,updated_at) VALUES (?,?,?,1,?)")
      .bind(encounter.id, campaignId, JSON.stringify(encounter), now).run();
    return { id: encounter.id };
  }

  const encounterId = idSchema.parse(input.encounterId);
  const row = await db.prepare("SELECT * FROM encounters WHERE id=?").bind(encounterId).first<EncounterRow>();
  if (!row) throw new GameError("Encontro não encontrado.", 404);
  // Authorization uses the stored campaign, never the campaign claimed by the caller.
  await requireEncounterMaster(user.id, row.campaign_id);
  if (campaignId !== row.campaign_id) throw new GameError("O encontro pertence a outra campanha.", 403);
  const expectedVersion = versionSchema.parse(input.version);
  if (row.version !== expectedVersion) throw new GameError("O encontro mudou em outra janela. Sincronize antes de repetir a ação.", 409);
  let encounter = hydrateEncounter(row);
  if (action === "update_encounter") {
    if (encounter.status !== "draft") throw new GameError("Os participantes só podem ser editados enquanto o encontro está em preparação.");
    const draft = parseEncounterDraft(input);
    encounter = { ...encounter, name: draft.name, participants: preserveParticipantConditions(await participantsFor(row.campaign_id, draft), encounter.participants) };
  } else if (action === "add_condition" || action === "remove_condition") {
    encounter = changeEncounterCondition(encounter, input);
  } else if (action === "start_encounter") encounter = startEncounter(encounter);
  else if (action === "advance_turn") encounter = advanceEncounter(encounter);
  else encounter = finishEncounter(encounter);
  encounter = { ...encounter, version: expectedVersion + 1, updatedAt: now };
  const result = await db.prepare("UPDATE encounters SET data=?,version=version+1,updated_at=? WHERE id=? AND version=?")
    .bind(JSON.stringify(encounter), now, row.id, expectedVersion).run();
  if (!result.meta.changes) throw new GameError("O encontro mudou em outra janela. Sincronize antes de repetir a ação.", 409);
  return { id: row.id };
}

import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Only this test process replaces platform bindings. Production has no mock path.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier === "cloudflare:workers" || specifier === "@/lib/runtime-env"))
      return {
        url: new URL("./cloudflare.mjs", import.meta.url).href,
        shortCircuit: true,
      };
    if (specifier === "next/headers" || specifier === "next/navigation")
      return {
        url: new URL("./request-context.mjs", import.meta.url).href,
        shortCircuit: true,
      };
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier))
        return nextResolve(`${specifier}.ts`, context);
      throw error;
    }
  },
});
const { env } = await import("./cloudflare.mjs");
const { fixture } = await import("./request-context.mjs");
const { GET, POST } = await import("../app/api/game/route.ts");

class LocalD1 {
  constructor(sql) {
    this.sqlite = sql;
  }
  prepare(query) {
    const db = this.sqlite;
    return {
      values: [],
      bind(...values) {
        this.values = values;
        return this;
      },
      async first() {
        return db.prepare(query).get(...this.values) ?? null;
      },
      async all() {
        return {
          success: true,
          results: db.prepare(query).all(...this.values),
        };
      },
      async run() {
        const r = db.prepare(query).run(...this.values);
        return {
          success: true,
          results: [],
          meta: { changes: Number(r.changes) },
        };
      },
    };
  }
  async batch(statements) {
    this.sqlite.exec("BEGIN");
    try {
      const result = [];
      for (const s of statements) result.push(await s.run());
      this.sqlite.exec("COMMIT");
      return result;
    } catch (e) {
      this.sqlite.exec("ROLLBACK");
      throw e;
    }
  }
}
const origin = "https://nexo.example.test";
function asUser(id) {
  fixture.headers = new Headers(
    id
      ? {
          "oai-authenticated-user-id": id,
          "oai-authenticated-user-email": `${id}@example.test`,
        }
      : {},
  );
}
async function read(id) {
  asUser(id);
  const response = await GET();
  return { status: response.status, data: await response.json() };
}
async function write(id, body, requestOrigin = origin, expectedUserId) {
  asUser(id);
  const response = await POST(
    new Request(`${origin}/api/game`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(requestOrigin ? { Origin: requestOrigin } : {}),
        ...(expectedUserId ? { "X-Nexo-Account": expectedUserId } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
  return { status: response.status, data: await response.json() };
}

test("API → SQLite → response: campaign, invitations, ownership, resources, rolls and isolation", async () => {
  const sql = new DatabaseSync(":memory:");
  env.DB = new LocalD1(sql);
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    sql.exec(
      readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"),
    );
  try {
    assert.equal((await read(null)).status, 401, "anonymous reads must fail");
    assert.equal(
      (await write(null, { action: "create_campaign" })).status,
      401,
      "anonymous writes must fail",
    );
    assert.equal(
      (
        await write(
          "gm",
          { action: "profile", name: "GM" },
          "https://other.example.test",
        )
      ).status,
      403,
      "cross-origin writes must fail",
    );
    assert.equal(
      (await write("gm", { action: "profile", name: "GM" }, null)).status,
      403,
      "missing-origin writes must fail",
    );
    assert.equal((await read("gm")).data.campaigns.length, 0);
    const created = await write("gm", {
      action: "create_campaign",
      campaign: {
        name: "Mesa de teste",
        description: "Integração",
        system: "jujutsu",
        banner: "shrine",
        status: "active",
      },
    });
    assert.equal(created.status, 200);
    const campaignId = created.data.result.id,
      invite = created.data.campaigns[0].inviteCode;
    assert.equal(created.data.campaigns[0].role, "gm");
    assert.ok(invite.length >= 20);
    assert.equal((await read("outsider")).data.campaigns.length, 0);
    assert.equal(
      (await write("player", { action: "join", code: invite })).status,
      200,
    );
    await write("player2", { action: "join", code: invite });
    const playerState = (await read("player")).data;
    assert.equal(playerState.campaigns[0].role, "player");
    assert.equal(playerState.campaigns[0].inviteCode, undefined);
    assert.equal(
      (await write("player", { action: "join", code: invite })).data
        .campaigns[0].role,
      "player",
      "joining never promotes a player",
    );
    assert.equal(
      (
        await write("player", {
          action: "edit_campaign",
          campaignId,
          campaign: {
            name: "Hacked",
            description: "",
            system: "ordem",
            banner: "forest",
          },
        })
      ).status,
      403,
    );
    const pcResult = await write("player", {
      action: "create_sheet",
      campaignId,
      type: "character",
      name: "Player One",
      ownerId: "player2",
    });
    const pc = pcResult.data.sheets[0];
    assert.equal(
      pc.ownerId,
      "player",
      "player cannot impersonate another owner",
    );
    assert.equal(pc.system, "jujutsu");
    const other = await write("player2", {
      action: "create_sheet",
      campaignId,
      type: "character",
      name: "Player Two",
    });
    const otherId = other.data.result.id;
    const monster = await write("gm", {
      action: "create_sheet",
      campaignId,
      type: "monster",
      name: "Monstro secreto",
    });
    const monsterId = monster.data.result.id;
    assert.equal(
      (
        await write("player", {
          action: "create_sheet",
          campaignId,
          type: "monster",
          name: "Monstro",
        })
      ).status,
      403,
    );
    assert.deepEqual(
      (await read("player")).data.sheets.map((s) => s.id),
      [pc.id],
    );
    assert.equal((await read("gm")).data.sheets.length, 3);
    assert.equal(
      (
        await write("player", {
          action: "resource",
          sheetId: otherId,
          key: "hp",
          delta: -10,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await write("outsider", {
          action: "resource",
          sheetId: pc.id,
          key: "hp",
          delta: -10,
        })
      ).status,
      403,
    );
    const updated = await write("player", {
      action: "resource",
      sheetId: pc.id,
      key: "hp",
      delta: -7,
    });
    assert.equal(updated.data.sheets[0].resources.hp.current, 13);
    assert.equal(
      (await read("player")).data.sheets[0].resources.hp.current,
      13,
      "state survives another request",
    );
    assert.equal(
      (
        await write("player", {
          action: "resource",
          sheetId: pc.id,
          key: "hp",
          delta: -999,
        })
      ).data.sheets[0].resources.hp.current,
      0,
    );
    assert.equal(
      (
        await write("player", {
          action: "resource",
          sheetId: pc.id,
          key: "hp",
          delta: 999,
        })
      ).data.sheets[0].resources.hp.current,
      20,
    );
    const fresh = (await read("player")).data.sheets[0];
    fresh.abilities = [
      {
        id: "ability",
        name: "Pulso",
        cost: 3,
        formula: "1d6",
        description: "Teste",
      },
    ];
    const saved = await write("player", {
      action: "update_sheet",
      sheetId: pc.id,
      sheet: fresh,
      version: fresh.version,
    });
    assert.equal(saved.status, 200);
    assert.equal(
      (
        await write("player", {
          action: "update_sheet",
          sheetId: pc.id,
          sheet: fresh,
          version: fresh.version,
        })
      ).status,
      409,
      "stale edits must not overwrite newer values",
    );
    const skill = saved.data.sheets[0].skills[0];
    const rolled = await write("player", {
      action: "roll",
      campaignId,
      sheetId: pc.id,
      request: { kind: "skill", id: skill.id },
      visibility: "table",
    });
    assert.equal(rolled.status, 200);
    assert.equal(rolled.data.result.roll.characterName, "Player One");
    assert.equal(
      (await read("player2")).data.rolls.length,
      1,
      "shared rolls reach the table",
    );
    const abilityRoll = await write("player", {
      action: "roll",
      campaignId,
      sheetId: pc.id,
      request: { kind: "ability", id: "ability" },
      visibility: "table",
    });
    assert.equal(abilityRoll.status, 200);
    assert.equal(
      abilityRoll.data.sheets[0].resources.ep.current,
      7,
      "ability cost persists with its roll",
    );
    await write("player", {
      action: "resource",
      sheetId: pc.id,
      key: "ep",
      delta: -7,
    });
    const denied = await write("player", {
      action: "roll",
      campaignId,
      sheetId: pc.id,
      request: { kind: "ability", id: "ability" },
      visibility: "table",
    });
    assert.equal(denied.status, 400);
    assert.equal(
      (await read("player")).data.rolls.length,
      2,
      "failed ability has no roll record",
    );
    assert.equal(
      (
        await write("player", {
          action: "roll",
          campaignId,
          request: { kind: "manual", formula: "1d20" },
          visibility: "gm",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await write("gm", {
          action: "roll",
          campaignId,
          sheetId: monsterId,
          request: { kind: "manual", formula: "1d20" },
          visibility: "table",
        })
      ).status,
      403,
      "monster cannot leak a table roll",
    );
    assert.equal(
      (
        await write("gm", {
          action: "roll",
          campaignId,
          sheetId: monsterId,
          request: { kind: "manual", formula: "1d20" },
          visibility: "gm",
        })
      ).status,
      200,
    );
    assert.equal(
      (await read("player")).data.rolls.length,
      2,
      "monster roll stays private",
    );
    assert.equal((await read("gm")).data.rolls.length, 3);
    assert.equal(
      (
        await write("player", {
          action: "roll",
          campaignId,
          request: { kind: "manual", formula: "99d999" },
        })
      ).status,
      400,
    );
    assert.equal(
      (await write("player", { action: "delete_sheet", sheetId: monsterId }))
        .status,
      403,
    );
    await write("gm", { action: "rotate_invite", campaignId });
    assert.equal(
      (await write("newplayer", { action: "join", code: invite })).status,
      404,
      "old invitations are invalidated",
    );
    await write("gm", {
      action: "remove_member",
      campaignId,
      memberId: "player",
    });
    assert.equal((await read("player")).data.sheets.length, 0);
    assert.equal((await read("player")).data.rolls.length, 0);
    assert.equal(
      (
        await write("player", {
          action: "resource",
          sheetId: pc.id,
          key: "hp",
          delta: 1,
        })
      ).status,
      403,
      "removal revokes write access",
    );
    assert.equal(
      (await read("gm")).data.sheets.length,
      3,
      "removed player's sheets remain for the GM",
    );
    assert.equal(
      (await write("gm", { action: "delete_sheet", sheetId: pc.id })).status,
      200,
    );
    assert.equal((await read("gm")).data.sheets.length, 2);
  } finally {
    sql.close();
    delete env.DB;
  }
});

test("account login and sheets survive database reopen; a stale signed-in tab cannot write as another account", async () => {
  const directory = mkdtempSync(join(tmpdir(), "nexo-account-"));
  const databasePath = join(directory, "game.sqlite");
  let sql = new DatabaseSync(databasePath);
  env.DB = new LocalD1(sql);
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url)).filter((file) => file.endsWith(".sql")).sort())
    sql.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  try {
    const { chatGPTSignInPath, chatGPTSignOutPath } = await import("../app/chatgpt-auth.ts");
    for (const unsafe of ["https://outside.example", "//outside.example", "/signin-with-chatgpt", "/callback", "/\\outside.example"])
      assert.equal(chatGPTSignInPath(unsafe), "/signin-with-chatgpt?return_to=%2F");
    assert.equal(chatGPTSignOutPath(), "/signout-with-chatgpt?return_to=%2F");
    assert.equal(chatGPTSignInPath("/?view=sheet&id=123"), "/signin-with-chatgpt?return_to=%2F%3Fview%3Dsheet%26id%3D123");
    await read("persisted");
    await write("persisted", { action: "profile", name: "Nome na mesa" });
    const created = await write("persisted", { action: "create_campaign", campaign: { name: "Heian persistente", description: "", system: "jujutsu", banner: "shrine" } });
    const campaignId = created.data.result.id;
    const createdSheet = await write("persisted", { action: "create_sheet", campaignId, type: "character", name: "Kenshō" });
    let sheet = createdSheet.data.sheets[0];
    const updated = await write("persisted", { action: "update_sheet", sheetId: sheet.id, version: sheet.version, sheet: { ...sheet, notes: "Salvo no banco, fora do navegador.", inventory: "Tenbatsu" } });
    assert.equal(updated.status, 200);
    sheet = updated.data.sheets[0];
    const adjusted = await write("persisted", { action: "resource", sheetId: sheet.id, key: "hp", delta: -3 });
    const expected = adjusted.data.sheets[0];
    await write("persisted", { action: "roll", campaignId, sheetId: sheet.id, request: { kind: "skill", id: sheet.skills[0].id }, visibility: "table" });
    sql.close();
    sql = new DatabaseSync(databasePath);
    env.DB = new LocalD1(sql);
    const reloaded = await read("persisted");
    assert.equal(reloaded.data.user.name, "Nome na mesa");
    assert.equal(reloaded.data.sheets[0].notes, "Salvo no banco, fora do navegador.");
    assert.equal(reloaded.data.sheets[0].inventory, "Tenbatsu");
    assert.deepEqual(reloaded.data.sheets[0].resources, expected.resources);
    assert.equal(reloaded.data.sheets[0].version, expected.version);
    assert.equal(reloaded.data.rolls.length, 1);
    assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM profiles WHERE id='persisted'").get().count, 1);
    assert.equal((await read(null)).status, 401);
    const mismatch = await write("other-account", { action: "create_campaign", campaign: { name: "Não criar", system: "ordem", banner: "forest", description: "" } }, origin, "persisted");
    assert.equal(mismatch.status, 401);
    assert.equal((await read("other-account")).data.campaigns.length, 0);
    assert.equal((await read("other-account")).data.sheets.length, 0);
    assert.equal((await read("persisted")).data.campaigns.length, 1);
  } finally {
    sql.close();
    delete env.DB;
    rmSync(directory, { recursive: true });
  }
});

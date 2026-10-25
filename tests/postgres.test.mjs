import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Real PostgreSQL engine and app migrations. Only Supabase-managed Auth,
// Storage metadata and Broadcast transport are modeled; no network or secrets.
let db;
const gm = "supabase:11111111-1111-4111-8111-111111111111";
const player = "supabase:22222222-2222-4222-8222-222222222222";
const other = "supabase:33333333-3333-4333-8333-333333333333";
const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0]?.value;
async function asRole(role, operation) {
  await db.exec(`set role ${role}`);
  try { return await operation(); } finally { await db.exec("reset role"); }
}
const rpc = (actor, action, data) => asRole("service_role", () => scalar("select public.nexo_assets($1,$2,$3::jsonb) as value", [actor, action, JSON.stringify(data)]));
const denied = async (operation, code = "42501") => assert.rejects(operation, (e) => e.code === code);
before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage; create schema realtime;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text,name text,metadata jsonb);
    alter table storage.objects enable row level security;
    grant usage on schema storage to service_role,anon,authenticated;
    grant all on storage.objects to service_role,anon,authenticated;
    create table realtime.messages(id uuid default gen_random_uuid(),payload jsonb,event text,topic text,private boolean,extension text);
    alter table realtime.messages enable row level security;
    grant usage on schema realtime to service_role,authenticated;
    grant select,insert on realtime.messages to service_role,authenticated;
    create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic',true) $$;
    create function realtime.send(payload jsonb,event text,topic text,private boolean default true) returns void language sql as
      $$ insert into realtime.messages(payload,event,topic,private,extension) values(payload,event,topic,private,'broadcast') $$;
    grant execute on function realtime.topic(),realtime.send(jsonb,text,text,boolean) to service_role,authenticated;
  `);
  const directory = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(directory)).filter((n) => n.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(name, directory), "utf8"));
  }
  await db.query("insert into nexo.profiles(id,name) values($1,'GM'),($2,'Player'),($3,'Other')", [gm, player, other]);
  await db.exec("insert into nexo.campaigns(id,name,description,system,banner,status,invite_code) values('campaign-a','A','','ordem','shrine','active','INVITE-A'),('campaign-b','B','','jujutsu','shrine','active','INVITE-B')");
  await db.query("insert into nexo.memberships(campaign_id,user_id,role) values('campaign-a',$1,'gm'),('campaign-a',$2,'player'),('campaign-b',$3,'gm')", [gm, player, other]);
  await db.query("insert into nexo.sheets(id,campaign_id,owner_id,type,data) values('hero','campaign-a',$1,'character','{}'),('monster','campaign-a',$2,'monster','{}'),('other-hero','campaign-b',$3,'character','{}')", [player, gm, other]);
});
after(async () => { await db?.close(); });

test("Supabase migrations boot a new database without a legacy import marker", async () => {
  assert.deepEqual(await asRole("service_role", () => scalar("select public.nexo_schema_status() as value")), { ready: true, schemaVersion: 2 });
  assert.equal(await scalar("select count(*)::integer as value from nexo.imports"), 0);
  assert.equal(await scalar("select count(*)::integer as value from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='nexo' and c.relkind='r' and not c.relrowsecurity"), 0);
});

test("browser roles cannot execute database RPCs or bypass deny-all table policies", async () => {
  for (const role of ["anon", "authenticated"]) {
    await asRole(role, async () => {
      await denied(() => db.query("select public.nexo_query('[]')"));
      await denied(() => db.query("select public.nexo_import_status('test')"));
      await denied(() => db.query("select public.nexo_import('test','{}')"));
      await denied(() => db.query("select public.nexo_schema_status()"));
      await denied(() => db.query("select public.nexo_assets($1,'list','{\"campaignId\":\"campaign-a\"}')", [gm]));
      await denied(() => db.query("select * from nexo.sheets"));
    });
  }
  // Even a future accidental table grant still meets explicit RLS denial.
  await db.exec("grant select,insert,update,delete on all tables in schema nexo to authenticated");
  try {
    await asRole("authenticated", async () => {
      assert.equal((await db.query("select * from nexo.sheets")).rows.length, 0);
      assert.equal((await db.query("update nexo.profiles set name='forged' returning id")).rows.length, 0);
      assert.equal((await db.query("delete from nexo.sheets returning id")).rows.length, 0);
      await denied(() => db.query("insert into nexo.profiles(id,name) values('forged','forged')"));
    });
  } finally { await db.exec("revoke select,insert,update,delete on all tables in schema nexo from authenticated"); }
});

test("SQL registry rejects unregistered commands and safely binds quotes and question marks", async () => {
  await asRole("service_role", async () => {
    await denied(() => db.query("select public.nexo_query($1)", [JSON.stringify([{ sql: "DELETE FROM nexo.profiles", params: [] }])]));
    const name = "D'água ?; drop table nexo.sheets; --";
    await db.query("select public.nexo_query($1)", [JSON.stringify([{ sql: "UPDATE profiles SET name=? WHERE id=?", params: [name, player] }])]);
    assert.equal(await scalar("select name as value from nexo.profiles where id=$1", [player]), name);
  });
});

const create = (actor, overrides = {}) => rpc(actor, "create", { campaignId: "campaign-a", sheetId: "hero", kind: "portrait", visibility: "owner", title: "Portrait", originalName: "portrait.png", mimeType: "image/png", sizeBytes: 68, ...overrides });
async function finish(asset, metadata = { size: 68, mimetype: "image/png" }) {
  await db.query("insert into storage.objects(bucket_id,name,metadata) values('nexo-assets',$1,$2)", [asset.object_path, JSON.stringify(metadata)]);
  return rpc(asset.uploaded_by, "confirm", { assetId: asset.id });
}

test("asset permissions isolate campaigns, owners, monsters and GM maps", async () => {
  await denied(() => create(other));
  await denied(() => create(player, { kind: "map", sheetId: null }));
  await denied(() => create(player, { sheetId: "monster" }));
  await denied(() => create(player, { sheetId: "other-hero" }), "P0002");
  await denied(() => create(gm, { mimeType: "image/svg+xml" }), "22023");
  await denied(() => create(gm, { sizeBytes: 10485761 }), "22023");
  const { asset } = await create(player, { visibility: "table" });
  assert.equal(asset.visibility, "owner"); // A forged visibility cannot broaden access.
  await denied(() => rpc(other, "read", { assetId: asset.id }));
  await finish(asset);
  assert.equal((await rpc(player, "read", { assetId: asset.id })).asset.id, asset.id);
  const monster = (await create(gm, { sheetId: "monster", visibility: "table" })).asset;
  assert.equal(monster.visibility, "gm");
  await finish(monster);
  await denied(() => rpc(player, "read", { assetId: monster.id }));
  assert.ok(!(await rpc(player, "list", { campaignId: "campaign-a" })).assets.some((a) => a.id === monster.id));
  const map = (await create(gm, { kind: "map", sheetId: null, visibility: "table" })).asset;
  await finish(map);
  assert.equal((await rpc(player, "read", { assetId: map.id })).asset.id, map.id);
  await denied(() => rpc(player, "delete", { assetId: map.id }));
});

test("uploads require actual metadata; portraits use version checks; deletion can be resumed", async () => {
  const { asset } = await create(player);
  await denied(() => rpc(player, "confirm", { assetId: asset.id }), "P0001");
  await denied(() => finish(asset, { size: 69, mimetype: "image/png" }), "22023");
  await db.query("update storage.objects set metadata=$1 where name=$2", [JSON.stringify({ size: 68, mimetype: "image/png" }), asset.object_path]);
  await rpc(player, "confirm", { assetId: asset.id });
  await rpc(player, "portrait", { assetId: asset.id, sheetId: "hero", version: 1 });
  assert.equal(await scalar("select data->>'portraitAssetId' as value from nexo.sheets where id='hero'"), asset.id);
  await denied(() => rpc(player, "portrait", { assetId: asset.id, sheetId: "hero", version: 1 }), "P0001");
  await denied(() => rpc(player, "portrait", { assetId: asset.id, sheetId: "monster", version: 1 }), "22023");
  await rpc(player, "delete", { assetId: asset.id });
  assert.equal(await scalar("select data ? 'portraitAssetId' as value from nexo.sheets where id='hero'"), false);
  await denied(() => rpc(player, "read", { assetId: asset.id }), "P0002");
  assert.equal((await rpc(player, "list", { campaignId: "campaign-a" })).assets.find((a) => a.id === asset.id).status, "deleting");
  await rpc(player, "delete", { assetId: asset.id });
  await rpc(player, "delete_complete", { assetId: asset.id });
  await denied(() => rpc(player, "read", { assetId: asset.id }), "P0002");
});

test("private Storage remains closed even when another bucket has a permissive policy", async () => {
  await db.exec("create policy test_other_bucket on storage.objects for all to anon,authenticated using(true) with check(true)");
  try {
    for (const role of ["anon", "authenticated"]) await asRole(role, async () => {
      assert.equal((await db.query("select * from storage.objects where bucket_id='nexo-assets'")).rows.length, 0);
      assert.equal((await db.query("update storage.objects set name='forged' where bucket_id='nexo-assets' returning id")).rows.length, 0);
      assert.equal((await db.query("delete from storage.objects where bucket_id='nexo-assets' returning id")).rows.length, 0);
      await denied(() => db.query("insert into storage.objects(bucket_id,name) values('nexo-assets','forged')"));
    });
  } finally { await db.exec("drop policy test_other_bucket on storage.objects"); }
});

test("Realtime authorizes only campaign members and never lets clients broadcast", async () => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [player.slice(9)]);
  await db.query("select set_config('realtime.topic','nexo:campaign:campaign-a',false)");
  await asRole("authenticated", async () => {
    assert.equal(await scalar("select nexo.can_join_campaign('nexo:campaign:campaign-a') as value"), true);
    assert.equal(await scalar("select nexo.can_join_campaign('nexo:campaign:campaign-b') as value"), false);
    await denied(() => db.query("insert into realtime.messages(payload,event,topic,private,extension) values('{}','invalidate','nexo:campaign:campaign-a',true,'broadcast')"));
    const messages = (await db.query("select payload,event,private from realtime.messages")).rows;
    assert.ok(messages.length > 0);
    for (const message of messages) {
      assert.deepEqual(Object.keys(message.payload), ["campaignId"]);
      assert.equal(message.payload.campaignId, "campaign-a");
      assert.equal(message.event, "invalidate"); assert.equal(message.private, true);
    }
  });
  await db.query("delete from nexo.memberships where user_id=$1 and campaign_id='campaign-a'", [player]);
  await asRole("authenticated", async () => {
    assert.equal(await scalar("select nexo.can_join_campaign('nexo:campaign:campaign-a') as value"), false);
    assert.equal((await db.query("select * from realtime.messages")).rows.length, 0);
  });
  await denied(() => rpc(player, "list", { campaignId: "campaign-a" }));
});

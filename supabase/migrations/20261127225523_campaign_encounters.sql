-- Additive combat state. Players continue to receive only their authorized sheets.
create table nexo.encounters (
  id text primary key,
  campaign_id text not null references nexo.campaigns(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data)='object'),
  version integer not null default 1 check (version>0),
  updated_at timestamptz not null default now()
);
create index encounter_campaign_time_idx on nexo.encounters(campaign_id,updated_at desc);
alter table nexo.encounters enable row level security;
revoke all on nexo.encounters from public,anon,authenticated;
grant select,insert,update,delete on nexo.encounters to service_role;
create policy deny_direct_browser_access on nexo.encounters for all
  to anon,authenticated using (false) with check (false);
create trigger encounter_changed after insert or update or delete on nexo.encounters
  for each row execute function nexo.broadcast_invalidation();

create or replace function public.nexo_schema_status() returns jsonb
language sql stable security invoker set search_path=''
as $$ select jsonb_build_object('ready',to_regclass('nexo.assets') is not null and to_regclass('nexo.encounters') is not null,'schemaVersion',3); $$;
revoke all on function public.nexo_schema_status() from public,anon,authenticated;
grant execute on function public.nexo_schema_status() to service_role;

-- Closed query registry additions for encounter persistence.
insert into nexo.query_allowlist(query,sql_text,is_read) values ('INSERT INTO encounters (id,campaign_id,data,version,updated_at) VALUES (?,?,?,1,?)','INSERT INTO nexo.encounters (id,campaign_id,data,version,updated_at) VALUES (?,?,?,1,?)',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('SELECT * FROM encounters WHERE id=?','SELECT * FROM nexo.encounters WHERE id=?',true) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('SELECT e.* FROM encounters e JOIN memberships m ON m.campaign_id=e.campaign_id WHERE m.user_id=? AND m.role=''gm'' ORDER BY e.updated_at DESC,e.id','SELECT e.* FROM nexo.encounters e JOIN nexo.memberships m ON m.campaign_id=e.campaign_id WHERE m.user_id=? AND m.role=''gm'' ORDER BY e.updated_at DESC,e.id',true) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('SELECT id,data FROM sheets WHERE campaign_id=?','SELECT id,data FROM nexo.sheets WHERE campaign_id=?',true) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('UPDATE encounters SET data=?,version=version+1,updated_at=? WHERE id=? AND version=?','UPDATE nexo.encounters SET data=?,version=version+1,updated_at=? WHERE id=? AND version=?',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;

-- Preserve optional encounter state when transferring a newer D1 source.
create or replace function public.nexo_import(p_source text,p_snapshot jsonb) returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare counts jsonb; table_name text;
begin
  if p_source is null or length(p_source) not between 1 and 150 then
    raise exception using errcode='22023',message='Invalid import source';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(16404,2026);
  select i.counts into counts from nexo.imports i where source=p_source;
  if found then return jsonb_build_object('imported',true,'counts',counts); end if;
  foreach table_name in array array['profiles','campaigns','memberships','sheets','rolls'] loop
    if jsonb_typeof(p_snapshot->table_name) is distinct from 'array' then
      raise exception using errcode='22023',message='Incomplete import';
    end if;
  end loop;
  if p_snapshot ? 'encounters' and jsonb_typeof(p_snapshot->'encounters') is distinct from 'array' then
    raise exception using errcode='22023',message='Incomplete encounter import';
  end if;
  if exists(select 1 from nexo.profiles) or exists(select 1 from nexo.campaigns) then
    raise exception using errcode='P0001',message='Destination already contains data; refusing to overwrite';
  end if;
  insert into nexo.profiles select id,name,created_at::timestamptz from jsonb_to_recordset(p_snapshot->'profiles') r(id text,name text,created_at text);
  insert into nexo.campaigns select id,name,description,system,banner,status,invite_code,created_at::timestamptz from jsonb_to_recordset(p_snapshot->'campaigns') r(id text,name text,description text,system text,banner text,status text,invite_code text,created_at text);
  insert into nexo.memberships select campaign_id,user_id,role from jsonb_to_recordset(p_snapshot->'memberships') r(campaign_id text,user_id text,role text);
  insert into nexo.sheets select id,campaign_id,owner_id,type,case when jsonb_typeof(data)='string' then (data#>>'{}')::jsonb else data end,version,updated_at::timestamptz from jsonb_to_recordset(p_snapshot->'sheets') r(id text,campaign_id text,owner_id text,type text,data jsonb,version integer,updated_at text);
  insert into nexo.rolls select id,campaign_id,user_id,sheet_id,visibility,case when jsonb_typeof(data)='string' then (data#>>'{}')::jsonb else data end,created_at::timestamptz from jsonb_to_recordset(p_snapshot->'rolls') r(id text,campaign_id text,user_id text,sheet_id text,visibility text,data jsonb,created_at text);
  insert into nexo.encounters select id,campaign_id,case when jsonb_typeof(data)='string' then (data#>>'{}')::jsonb else data end,version,updated_at::timestamptz from jsonb_to_recordset(coalesce(p_snapshot->'encounters','[]'::jsonb)) r(id text,campaign_id text,data jsonb,version integer,updated_at text);
  counts := jsonb_build_object('encounters',jsonb_array_length(coalesce(p_snapshot->'encounters','[]'::jsonb)),'profiles',jsonb_array_length(p_snapshot->'profiles'),'campaigns',jsonb_array_length(p_snapshot->'campaigns'),'memberships',jsonb_array_length(p_snapshot->'memberships'),'sheets',jsonb_array_length(p_snapshot->'sheets'),'rolls',jsonb_array_length(p_snapshot->'rolls'));
  insert into nexo.imports(source,counts) values(p_source,counts);
  return jsonb_build_object('imported',true,'counts',counts);
end;
$$;
revoke all on function public.nexo_import(text,jsonb) from public,anon,authenticated;
grant execute on function public.nexo_import(text,jsonb) to service_role;

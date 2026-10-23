-- ChatGPT/Sites authenticates players. Only the authenticated server gateway
-- can reach this private schema; browser Supabase roles have no grants.
create schema if not exists nexo;
revoke all on schema nexo from public, anon, authenticated;
grant usage on schema nexo to service_role;

create table nexo.profiles (
  id text primary key check (length(id) between 1 and 100),
  name text not null check (length(name) between 1 and 80),
  created_at timestamptz not null default now()
);
create table nexo.campaigns (
  id text primary key,
  name text not null,
  description text not null,
  system text not null check (system in ('ordem','jujutsu','dnd','cthulhu','tormenta','custom')),
  banner text not null check (banner in ('shrine','forest','ruins','abyss')),
  status text not null check (status in ('active','paused')),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);
create table nexo.memberships (
  campaign_id text not null references nexo.campaigns(id) on delete cascade,
  user_id text not null references nexo.profiles(id) on delete cascade,
  role text not null check (role in ('gm','player')),
  primary key (campaign_id,user_id)
);
create index memberships_user_idx on nexo.memberships(user_id,campaign_id);
create unique index memberships_gm_idx on nexo.memberships(campaign_id) where role='gm';
create table nexo.sheets (
  id text primary key,
  campaign_id text not null references nexo.campaigns(id) on delete cascade,
  owner_id text not null references nexo.profiles(id),
  type text not null check (type in ('character','monster')),
  data jsonb not null check (jsonb_typeof(data)='object'),
  version integer not null default 1 check (version>0),
  updated_at timestamptz not null default now()
);
create index sheets_campaign_idx on nexo.sheets(campaign_id);
create index sheets_owner_idx on nexo.sheets(owner_id);
create table nexo.rolls (
  id text primary key,
  campaign_id text not null references nexo.campaigns(id) on delete cascade,
  user_id text not null references nexo.profiles(id),
  -- Deliberately not an FK: deleting a sheet preserves its roll history.
  sheet_id text,
  visibility text not null check (visibility in ('table','gm')),
  data jsonb not null check (jsonb_typeof(data)='object'),
  created_at timestamptz not null default now()
);
create index rolls_campaign_time_idx on nexo.rolls(campaign_id,created_at desc);
create index rolls_user_idx on nexo.rolls(user_id);
create table nexo.imports (
  source text primary key,
  counts jsonb not null,
  imported_at timestamptz not null default now()
);
create table nexo.query_allowlist (
  query text primary key,
  sql_text text not null,
  is_read boolean not null
);

alter table nexo.profiles enable row level security;
alter table nexo.campaigns enable row level security;
alter table nexo.memberships enable row level security;
alter table nexo.sheets enable row level security;
alter table nexo.rolls enable row level security;
alter table nexo.imports enable row level security;
alter table nexo.query_allowlist enable row level security;
revoke all on all tables in schema nexo from public, anon, authenticated;
grant select,insert,update,delete on nexo.profiles,nexo.campaigns,nexo.memberships,nexo.sheets,nexo.rolls to service_role;
grant select,insert on nexo.imports to service_role;
grant select on nexo.query_allowlist to service_role;

-- A closed query registry, never a general-purpose SQL endpoint. A function
-- call is one transaction. Serialize writes so a conditional ability roll and
-- its energy deduction have SQLite/D1's original transaction semantics.
create function public.nexo_query(p_statements jsonb) returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare
  command jsonb; registered nexo.query_allowlist%rowtype;
  parts text[]; params jsonb; statement text; rows jsonb;
  output jsonb := '[]'::jsonb; changed bigint; i integer;
begin
  if jsonb_typeof(p_statements)<>'array' or jsonb_array_length(p_statements) not between 1 and 32 then
    raise exception using errcode='22023',message='Invalid statement batch';
  end if;
  if exists(select 1 from jsonb_array_elements(p_statements) c join nexo.query_allowlist q on q.query=c->>'sql' where not q.is_read) then
    perform pg_catalog.pg_advisory_xact_lock(16404,2026);
  end if;
  for command in select value from jsonb_array_elements(p_statements) loop
    select * into registered from nexo.query_allowlist where query=command->>'sql';
    if not found then raise exception using errcode='42501',message='Query is not registered'; end if;
    params := coalesce(command->'params','[]'::jsonb);
    parts := string_to_array(registered.sql_text,'?');
    if jsonb_typeof(params)<>'array' or jsonb_array_length(params)<>cardinality(parts)-1 then
      raise exception using errcode='22023',message='Invalid statement parameters';
    end if;
    statement := parts[1];
    if cardinality(parts)>1 then
      for i in 1..cardinality(parts)-1 loop
        -- Split the trusted template first. Question marks and quotes inside
        -- user text are values and are never parsed as SQL placeholders.
        if jsonb_typeof(params->(i-1)) not in ('string','number','boolean','null') then
          raise exception using errcode='22023',message='Invalid parameter type';
        end if;
        statement := statement || quote_nullable(params->>(i-1)) || parts[i+1];
      end loop;
    end if;
    if registered.is_read then
      execute 'select coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) from ('||statement||') r' into rows;
      changed := 0;
    else
      execute statement;
      get diagnostics changed=row_count;
      rows := '[]'::jsonb;
    end if;
    output := output || jsonb_build_array(jsonb_build_object('success',true,'results',rows,'meta',jsonb_build_object('changes',changed)));
  end loop;
  return output;
end;
$$;

create function public.nexo_import_status(p_source text) returns jsonb
language sql stable security invoker set search_path=''
as $$ select jsonb_build_object('imported',exists(select 1 from nexo.imports where source=p_source)); $$;

create function public.nexo_import(p_source text,p_snapshot jsonb) returns jsonb
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
  if exists(select 1 from nexo.profiles) or exists(select 1 from nexo.campaigns) then
    raise exception using errcode='P0001',message='Destination already contains data; refusing to overwrite';
  end if;
  insert into nexo.profiles select id,name,created_at::timestamptz from jsonb_to_recordset(p_snapshot->'profiles') r(id text,name text,created_at text);
  insert into nexo.campaigns select id,name,description,system,banner,status,invite_code,created_at::timestamptz from jsonb_to_recordset(p_snapshot->'campaigns') r(id text,name text,description text,system text,banner text,status text,invite_code text,created_at text);
  insert into nexo.memberships select campaign_id,user_id,role from jsonb_to_recordset(p_snapshot->'memberships') r(campaign_id text,user_id text,role text);
  insert into nexo.sheets select id,campaign_id,owner_id,type,case when jsonb_typeof(data)='string' then (data#>>'{}')::jsonb else data end,version,updated_at::timestamptz from jsonb_to_recordset(p_snapshot->'sheets') r(id text,campaign_id text,owner_id text,type text,data jsonb,version integer,updated_at text);
  insert into nexo.rolls select id,campaign_id,user_id,sheet_id,visibility,case when jsonb_typeof(data)='string' then (data#>>'{}')::jsonb else data end,created_at::timestamptz from jsonb_to_recordset(p_snapshot->'rolls') r(id text,campaign_id text,user_id text,sheet_id text,visibility text,data jsonb,created_at text);
  counts := jsonb_build_object('profiles',jsonb_array_length(p_snapshot->'profiles'),'campaigns',jsonb_array_length(p_snapshot->'campaigns'),'memberships',jsonb_array_length(p_snapshot->'memberships'),'sheets',jsonb_array_length(p_snapshot->'sheets'),'rolls',jsonb_array_length(p_snapshot->'rolls'));
  insert into nexo.imports(source,counts) values(p_source,counts);
  return jsonb_build_object('imported',true,'counts',counts);
end;
$$;

revoke all on function public.nexo_query(jsonb),public.nexo_import_status(text),public.nexo_import(text,jsonb) from public,anon,authenticated;
grant execute on function public.nexo_query(jsonb),public.nexo_import_status(text),public.nexo_import(text,jsonb) to service_role;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('DELETE FROM memberships WHERE campaign_id=? AND user_id=? AND role=''player''','DELETE FROM nexo.memberships WHERE campaign_id=? AND user_id=? AND role=''player''',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('DELETE FROM sheets WHERE id=?','DELETE FROM nexo.sheets WHERE id=?',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('INSERT INTO campaigns (id,name,description,system,banner,status,invite_code,created_at) VALUES (?,?,?,?,?,?,?,?)','INSERT INTO nexo.campaigns (id,name,description,system,banner,status,invite_code,created_at) VALUES (?,?,?,?,?,?,?,?)',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('INSERT INTO memberships (campaign_id,user_id,role) VALUES (?,?,''gm'')','INSERT INTO nexo.memberships (campaign_id,user_id,role) VALUES (?,?,''gm'')',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('INSERT INTO memberships (campaign_id,user_id,role) VALUES (?,?,''player'') ON CONFLICT(campaign_id,user_id) DO NOTHING','INSERT INTO nexo.memberships (campaign_id,user_id,role) VALUES (?,?,''player'') ON CONFLICT(campaign_id,user_id) DO NOTHING',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('INSERT INTO profiles (id, name, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING','INSERT INTO nexo.profiles (id, name, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('INSERT INTO rolls (id,campaign_id,user_id,sheet_id,visibility,data,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM sheets WHERE id=? AND version=?)','INSERT INTO nexo.rolls (id,campaign_id,user_id,sheet_id,visibility,data,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM nexo.sheets WHERE id=? AND version=?)',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('INSERT INTO rolls (id,campaign_id,user_id,sheet_id,visibility,data,created_at) VALUES (?,?,?,?,?,?,?)','INSERT INTO nexo.rolls (id,campaign_id,user_id,sheet_id,visibility,data,created_at) VALUES (?,?,?,?,?,?,?)',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('INSERT INTO sheets (id,campaign_id,owner_id,type,data,version,updated_at) VALUES (?,?,?,?,?,1,?)','INSERT INTO nexo.sheets (id,campaign_id,owner_id,type,data,version,updated_at) VALUES (?,?,?,?,?,1,?)',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('SELECT c.*, m.role FROM campaigns c JOIN memberships m ON m.campaign_id=c.id WHERE m.user_id=? ORDER BY c.created_at DESC','SELECT c.*, m.role FROM nexo.campaigns c JOIN nexo.memberships m ON m.campaign_id=c.id WHERE m.user_id=? ORDER BY c.created_at DESC',true) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('SELECT id FROM campaigns WHERE invite_code=?','SELECT id FROM nexo.campaigns WHERE invite_code=?',true) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('SELECT m.campaign_id, m.user_id AS id, p.name, m.role FROM memberships m JOIN profiles p ON p.id=m.user_id WHERE m.campaign_id IN (SELECT campaign_id FROM memberships WHERE user_id=?)','SELECT m.campaign_id, m.user_id AS id, p.name, m.role FROM nexo.memberships m JOIN nexo.profiles p ON p.id=m.user_id WHERE m.campaign_id IN (SELECT campaign_id FROM nexo.memberships WHERE user_id=?)',true) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('SELECT name FROM profiles WHERE id = ?','SELECT name FROM nexo.profiles WHERE id = ?',true) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('SELECT r.data, r.visibility, r.user_id, r.campaign_id FROM rolls r JOIN memberships m ON m.campaign_id=r.campaign_id AND m.user_id=? WHERE r.visibility=''table'' OR m.role=''gm'' OR r.user_id=? ORDER BY r.created_at DESC LIMIT 150','SELECT r.data, r.visibility, r.user_id, r.campaign_id FROM nexo.rolls r JOIN nexo.memberships m ON m.campaign_id=r.campaign_id AND m.user_id=? WHERE r.visibility=''table'' OR m.role=''gm'' OR r.user_id=? ORDER BY r.created_at DESC LIMIT 150',true) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('SELECT role FROM memberships WHERE campaign_id=? AND user_id=?','SELECT role FROM nexo.memberships WHERE campaign_id=? AND user_id=?',true) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('SELECT s.*, p.name AS owner_name FROM sheets s JOIN profiles p ON p.id=s.owner_id JOIN memberships m ON m.campaign_id=s.campaign_id AND m.user_id=? WHERE m.role=''gm'' OR (s.owner_id=? AND s.type=''character'') ORDER BY s.updated_at DESC','SELECT s.*, p.name AS owner_name FROM nexo.sheets s JOIN nexo.profiles p ON p.id=s.owner_id JOIN nexo.memberships m ON m.campaign_id=s.campaign_id AND m.user_id=? WHERE m.role=''gm'' OR (s.owner_id=? AND s.type=''character'') ORDER BY s.updated_at DESC',true) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('SELECT s.*, p.name AS owner_name FROM sheets s JOIN profiles p ON p.id=s.owner_id WHERE s.id=?','SELECT s.*, p.name AS owner_name FROM nexo.sheets s JOIN nexo.profiles p ON p.id=s.owner_id WHERE s.id=?',true) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('SELECT system FROM campaigns WHERE id=?','SELECT system FROM nexo.campaigns WHERE id=?',true) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('UPDATE campaigns SET invite_code=? WHERE id=?','UPDATE nexo.campaigns SET invite_code=? WHERE id=?',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('UPDATE campaigns SET name=?,description=?,banner=?,status=? WHERE id=?','UPDATE nexo.campaigns SET name=?,description=?,banner=?,status=? WHERE id=?',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('UPDATE profiles SET name=? WHERE id=?','UPDATE nexo.profiles SET name=? WHERE id=?',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('UPDATE sheets SET data=?, version=version+1, updated_at=? WHERE id=? AND version=?','UPDATE nexo.sheets SET data=?, version=version+1, updated_at=? WHERE id=? AND version=?',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;
insert into nexo.query_allowlist(query,sql_text,is_read) values ('UPDATE sheets SET data=?,version=version+1,updated_at=? WHERE id=? AND version=?','UPDATE nexo.sheets SET data=?,version=version+1,updated_at=? WHERE id=? AND version=?',false) on conflict(query) do update set sql_text=excluded.sql_text,is_read=excluded.is_read;

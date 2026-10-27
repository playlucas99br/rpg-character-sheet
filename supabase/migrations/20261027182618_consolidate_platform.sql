-- Additive migration: existing campaigns, accounts and the Sites import remain intact.
create table nexo.assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references nexo.campaigns(id) on delete cascade,
  sheet_id text references nexo.sheets(id) on delete set null,
  owner_id text not null references nexo.profiles(id),
  uploaded_by text not null references nexo.profiles(id),
  kind text not null check (kind in ('portrait','token','map')),
  visibility text not null check (visibility in ('owner','gm','table')),
  title text not null check (length(title) between 1 and 100),
  original_name text not null check (length(original_name) between 1 and 160),
  object_path text not null unique,
  mime_type text not null check (mime_type in ('image/png','image/jpeg','image/webp')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  status text not null default 'pending' check (status in ('pending','ready','deleting')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assets_campaign_time_idx on nexo.assets(campaign_id,created_at desc);
create index assets_sheet_idx on nexo.assets(sheet_id);
create index assets_owner_idx on nexo.assets(owner_id);
create index assets_uploaded_by_idx on nexo.assets(uploaded_by);
alter table nexo.assets enable row level security;
revoke all on nexo.assets from public,anon,authenticated;
grant select,insert,update,delete on nexo.assets to service_role;
create policy deny_direct_browser_access on nexo.assets for all to anon,authenticated using (false) with check (false);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('nexo-assets','nexo-assets',false,10485760,array['image/png','image/jpeg','image/webp']);
-- Signed transfers go through the Storage service. Even a future permissive
-- browser policy for another bucket cannot make this bucket public.
create policy nexo_assets_private on storage.objects as restrictive for all
to anon,authenticated using (bucket_id <> 'nexo-assets') with check (bucket_id <> 'nexo-assets');

create function public.nexo_schema_status() returns jsonb
language sql stable security invoker set search_path=''
as $$ select jsonb_build_object('ready',to_regclass('nexo.assets') is not null,'schemaVersion',2); $$;
revoke all on function public.nexo_schema_status() from public,anon,authenticated;
grant execute on function public.nexo_schema_status() to service_role;

-- Only the authenticated Edge Function may supply p_actor. This RPC has no
-- browser execute grant and deliberately runs with the caller's privileges.
create function public.nexo_assets(p_actor text,p_action text,p_data jsonb) returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare
  a nexo.assets%rowtype;
  s nexo.sheets%rowtype;
  campaign text;
  member_role text;
  asset_owner text;
  sharing text;
  object_metadata jsonb;
  output jsonb;
begin
  if p_actor is null or length(p_actor) not between 1 and 100 or jsonb_typeof(p_data) is distinct from 'object' then
    raise exception using errcode='22023',message='Invalid asset request';
  end if;
  if p_action not in ('list','create','read','confirm','delete','delete_complete','portrait') or p_action is null then
    raise exception using errcode='22023',message='Unknown asset action';
  end if;
  if p_action not in ('list','read') then
    perform pg_catalog.pg_advisory_xact_lock(16404,2026);
  end if;
  if p_action in ('list','create') then
    campaign := p_data->>'campaignId';
  else
    select * into a from nexo.assets where id=(p_data->>'assetId')::uuid;
    if not found then raise exception using errcode='P0002',message='Asset not found'; end if;
    campaign := a.campaign_id;
  end if;
  select role into member_role from nexo.memberships where campaign_id=campaign and user_id=p_actor;
  if not found then raise exception using errcode='42501',message='Campaign membership required'; end if;

  if p_action='list' then
    select coalesce(jsonb_agg(to_jsonb(v) order by v.created_at desc),'[]'::jsonb) into output
    from nexo.assets v left join nexo.sheets sh on sh.id=v.sheet_id
    where v.campaign_id=campaign
      and (member_role='gm' or ((sh.type is distinct from 'monster') and
        ((v.status='ready' and v.visibility='table') or (v.visibility='owner' and v.owner_id=p_actor))));
    return jsonb_build_object('assets',output);
  end if;

  if p_action='create' then
    if p_data->>'kind' not in ('portrait','token','map') or p_data->>'kind' is null
      or p_data->>'mimeType' not in ('image/png','image/jpeg','image/webp') or p_data->>'mimeType' is null
      or coalesce((p_data->>'sizeBytes')::bigint,0) not between 1 and 10485760
      or coalesce(length(trim(p_data->>'title')),0) not between 1 and 100
      or coalesce(length(p_data->>'originalName'),0) not between 1 and 160 then
      raise exception using errcode='22023',message='Invalid asset metadata';
    end if;
    sharing := coalesce(p_data->>'visibility','owner');
    asset_owner := p_actor;
    if p_data->>'kind'='map' then
      if member_role<>'gm' or p_data->>'sheetId' is not null then
        raise exception using errcode='42501',message='Only GM may upload maps';
      end if;
    else
      select * into s from nexo.sheets where id=p_data->>'sheetId' and campaign_id=campaign;
      if not found then raise exception using errcode='P0002',message='Sheet not found'; end if;
      if member_role<>'gm' and (s.owner_id<>p_actor or s.type<>'character') then
        raise exception using errcode='42501',message='Sheet edit permission required';
      end if;
      asset_owner := s.owner_id;
      if s.type='monster' then sharing := 'gm';
      elsif member_role<>'gm' then sharing := 'owner'; end if;
    end if;
    if sharing not in ('owner','gm','table') then raise exception using errcode='22023',message='Invalid visibility'; end if;
    insert into nexo.assets(campaign_id,sheet_id,owner_id,uploaded_by,kind,visibility,title,original_name,object_path,mime_type,size_bytes)
    values(campaign,s.id,asset_owner,p_actor,p_data->>'kind',sharing,trim(p_data->>'title'),p_data->>'originalName',
      campaign||'/'||gen_random_uuid()::text,p_data->>'mimeType',(p_data->>'sizeBytes')::bigint) returning * into a;
    return jsonb_build_object('asset',to_jsonb(a));
  end if;

  if p_action='read' then
    if a.status<>'ready' then raise exception using errcode='P0002',message='Asset not available'; end if;
    if member_role<>'gm' and (a.visibility='gm' or (a.visibility='owner' and a.owner_id<>p_actor)
      or exists(select 1 from nexo.sheets where id=a.sheet_id and type='monster')) then
      raise exception using errcode='42501',message='Asset is private';
    end if;
    return jsonb_build_object('asset',to_jsonb(a));
  end if;

  -- A shared file may be viewed by players, but only its owner or GM manages it.
  if member_role<>'gm' and (a.owner_id<>p_actor or a.visibility='gm'
    or exists(select 1 from nexo.sheets where id=a.sheet_id and type='monster')) then
    raise exception using errcode='42501',message='Asset management permission required';
  end if;
  if p_action='confirm' then
    if a.status='deleting' then raise exception using errcode='P0001',message='Deletion in progress'; end if;
    select metadata into object_metadata from storage.objects where bucket_id='nexo-assets' and name=a.object_path;
    if not found then raise exception using errcode='P0001',message='Upload not finished'; end if;
    if coalesce((object_metadata->>'size')::bigint,0) <> a.size_bytes
      or (object_metadata->>'mimetype') is distinct from a.mime_type then
      raise exception using errcode='22023',message='Uploaded file differs from declared metadata';
    end if;
    update nexo.assets set status='ready',updated_at=now() where id=a.id returning * into a;
  elsif p_action='delete' then
    update nexo.assets set status='deleting',updated_at=now() where id=a.id returning * into a;
    update nexo.sheets set data=data-'portraitAssetId',version=version+1,updated_at=now()
      where campaign_id=campaign and data->>'portraitAssetId'=a.id::text;
  elsif p_action='delete_complete' then
    if a.status<>'deleting' then raise exception using errcode='P0001',message='Delete must start first'; end if;
    delete from nexo.assets where id=a.id;
  elsif p_action='portrait' then
    select * into s from nexo.sheets where id=p_data->>'sheetId' and campaign_id=campaign;
    if not found then raise exception using errcode='P0002',message='Sheet not found'; end if;
    if a.status<>'ready' or a.kind<>'portrait' or a.sheet_id is distinct from s.id then
      raise exception using errcode='22023',message='Portrait must belong to the sheet';
    end if;
    if member_role<>'gm' and (s.owner_id<>p_actor or s.type<>'character') then
      raise exception using errcode='42501',message='Sheet edit permission required';
    end if;
    update nexo.sheets set data=jsonb_set(data,'{portraitAssetId}',to_jsonb(a.id::text)),version=version+1,updated_at=now()
      where id=s.id and version=(p_data->>'version')::integer;
    if not found then raise exception using errcode='P0001',message='Stale sheet version'; end if;
  end if;
  return jsonb_build_object('asset',to_jsonb(a));
end;
$$;
revoke all on function public.nexo_assets(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.nexo_assets(text,text,jsonb) to service_role;

-- A narrowly scoped definer is necessary to read private membership rows from
-- the Realtime authenticated role. It discloses only a boolean for auth.uid().
grant usage on schema nexo to authenticated;
create function nexo.can_join_campaign(p_topic text) returns boolean
language sql stable security definer set search_path=''
as $$
  select (select auth.uid()) is not null and exists(
    select 1 from nexo.memberships m
    where m.user_id='supabase:'||(select auth.uid())::text
      and p_topic='nexo:campaign:'||m.campaign_id
  );
$$;
revoke all on function nexo.can_join_campaign(text) from public,anon,authenticated;
grant execute on function nexo.can_join_campaign(text) to authenticated;
create policy nexo_campaign_broadcast_read on realtime.messages for select to authenticated
using (extension='broadcast' and topic=(select realtime.topic()) and nexo.can_join_campaign((select realtime.topic())));
-- No authenticated INSERT policy: only trusted server-side triggers broadcast.

create function nexo.broadcast_invalidation() returns trigger
language plpgsql security invoker set search_path=''
as $$
declare campaign text;
begin
  if tg_table_name='campaigns' then
    if tg_op='DELETE' then campaign := old.id; else campaign := new.id; end if;
  else
    if tg_op='DELETE' then campaign := old.campaign_id; else campaign := new.campaign_id; end if;
  end if;
  perform realtime.send(jsonb_build_object('campaignId',campaign),'invalidate','nexo:campaign:'||campaign,true);
  return null;
end;
$$;
revoke all on function nexo.broadcast_invalidation() from public,anon,authenticated;
grant execute on function nexo.broadcast_invalidation() to service_role;
create trigger campaign_changed after insert or update or delete on nexo.campaigns for each row execute function nexo.broadcast_invalidation();
create trigger membership_changed after insert or update or delete on nexo.memberships for each row execute function nexo.broadcast_invalidation();
create trigger sheet_changed after insert or update or delete on nexo.sheets for each row execute function nexo.broadcast_invalidation();
create trigger roll_changed after insert or update or delete on nexo.rolls for each row execute function nexo.broadcast_invalidation();
create trigger asset_changed after insert or update or delete on nexo.assets for each row execute function nexo.broadcast_invalidation();

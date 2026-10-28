-- Run administratively after the consolidation migration. No Auth accounts,
-- uploaded bytes or durable game fixtures are created. The inner transaction
-- is deliberately rolled back, including its Broadcast messages.
do $smoke$
declare
  campaign text := '__t01_' || gen_random_uuid()::text;
  player_uuid uuid := gen_random_uuid();
  gm text := 'supabase:' || gen_random_uuid()::text;
  player text := 'supabase:' || player_uuid::text;
  hero text := gen_random_uuid()::text;
  monster text := gen_random_uuid()::text;
  asset jsonb;
  denied boolean;
  messages integer;
begin
  begin
    insert into nexo.profiles(id,name) values(gm,'T01 temporary GM'),(player,'T01 temporary player');
    insert into nexo.campaigns(id,name,description,system,banner,status,invite_code)
      values(campaign,'T01 temporary campaign','','ordem','shrine','active',gen_random_uuid()::text);
    insert into nexo.memberships(campaign_id,user_id,role) values(campaign,gm,'gm'),(campaign,player,'player');
    insert into nexo.sheets(id,campaign_id,owner_id,type,data)
      values(hero,campaign,player,'character','{}'),(monster,campaign,gm,'monster','{}');

    set local role service_role;
    if public.nexo_schema_status() <> '{"ready":true,"schemaVersion":2}'::jsonb then
      raise exception 'Schema readiness failed';
    end if;
    asset := public.nexo_assets(player,'create',jsonb_build_object(
      'campaignId',campaign,'sheetId',hero,'kind','portrait','visibility','table',
      'title','T01 temporary portrait','originalName','portrait.png','mimeType','image/png','sizeBytes',68))->'asset';
    if asset->>'visibility' <> 'owner' or asset->>'owner_id' <> player then
      raise exception 'Player upload ownership failed';
    end if;
    denied := false;
    begin
      perform public.nexo_assets(player,'create',jsonb_build_object(
        'campaignId',campaign,'kind','map','title','Map','originalName','map.png','mimeType','image/png','sizeBytes',68));
    exception when insufficient_privilege then denied := true;
    end;
    if not denied then raise exception 'Player map restriction failed'; end if;
    denied := false;
    begin
      perform public.nexo_assets(gm || '-outsider','list',jsonb_build_object('campaignId',campaign));
    exception when insufficient_privilege then denied := true;
    end;
    if not denied then raise exception 'Campaign isolation failed'; end if;
    denied := false;
    begin
      perform public.nexo_assets(player,'confirm',jsonb_build_object('assetId',asset->>'id'));
    exception when sqlstate 'P0001' then denied := true;
    end;
    if not denied then raise exception 'Missing bytes must prevent confirmation'; end if;

    reset role;
    perform set_config('request.jwt.claim.sub',player_uuid::text,true);
    perform set_config('realtime.topic','nexo:campaign:' || campaign,true);
    set local role authenticated;
    if not nexo.can_join_campaign('nexo:campaign:' || campaign)
      or nexo.can_join_campaign('nexo:campaign:outside-' || campaign) then
      raise exception 'Realtime membership authorization failed';
    end if;
    select count(*) into messages from realtime.messages where topic='nexo:campaign:' || campaign;
    if messages=0 then raise exception 'Database triggers did not broadcast'; end if;
    if exists(select 1 from realtime.messages where topic='nexo:campaign:' || campaign
      and payload-'id' <> jsonb_build_object('campaignId',campaign)) then
      raise exception 'Broadcast disclosed more than campaign ID';
    end if;
    if has_function_privilege(current_user,'public.nexo_assets(text,text,jsonb)','execute') then
      raise exception 'Browser RPC restriction failed';
    end if;

    reset role;
    delete from nexo.memberships where campaign_id=campaign and user_id=player;
    set local role authenticated;
    if nexo.can_join_campaign('nexo:campaign:' || campaign)
      or exists(select 1 from realtime.messages where topic='nexo:campaign:' || campaign) then
      raise exception 'Membership removal did not revoke database authorization';
    end if;
    reset role;
    raise exception using errcode='N0001',message='T01 checks passed; discard fixtures';
  exception when sqlstate 'N0001' then null;
  end;
  if exists(select 1 from nexo.profiles where id in (gm,player))
    or exists(select 1 from nexo.campaigns where id=campaign)
    or exists(select 1 from nexo.assets where campaign_id=campaign)
    or exists(select 1 from realtime.messages where topic='nexo:campaign:' || campaign) then
    raise exception 'Temporary fixture rollback failed';
  end if;
end;
$smoke$;

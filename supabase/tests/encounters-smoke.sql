-- Administrative deployment check. Game fixtures and Broadcast messages are
-- discarded through a rolled-back subtransaction; no Auth account is created.
do $smoke$
declare
  campaign text := '__encounter_qa_' || gen_random_uuid()::text;
  gm text := 'supabase:' || gen_random_uuid()::text;
  player text := 'supabase:' || gen_random_uuid()::text;
  hero text := gen_random_uuid()::text;
  npc text := gen_random_uuid()::text;
  encounter text := gen_random_uuid()::text;
  data jsonb;
  result jsonb;
  stamp text := now()::text;
  roster_query text := 'SELECT e.* FROM encounters e JOIN memberships m ON m.campaign_id=e.campaign_id WHERE m.user_id=? AND m.role=''gm'' ORDER BY e.updated_at DESC,e.id';
  update_query text := 'UPDATE encounters SET data=?,version=version+1,updated_at=? WHERE id=? AND version=?';
  denied boolean := false;
begin
  begin
    insert into nexo.profiles(id,name) values(gm,'Encounter QA GM'),(player,'Encounter QA player');
    insert into nexo.campaigns(id,name,description,system,banner,status,invite_code)
      values(campaign,'Encounter QA','','jujutsu','shrine','active',gen_random_uuid()::text);
    insert into nexo.memberships(campaign_id,user_id,role) values(campaign,gm,'gm'),(campaign,player,'player');
    insert into nexo.sheets(id,campaign_id,owner_id,type,data)
      values(hero,campaign,player,'character','{"name":"QA hero"}'),(npc,campaign,gm,'monster','{"name":"QA NPC"}');

    set local role service_role;
    if not (public.nexo_schema_status() @> '{"ready":true}'::jsonb)
      or coalesce((public.nexo_schema_status()->>'schemaVersion')::integer,0) < 3 then
      raise exception 'Encounter schema is not ready';
    end if;
    data := jsonb_build_object('id',encounter,'campaignId',campaign,'name','QA ''quoted'' ? encounter',
      'status','active','round',1,'currentParticipantId',hero,'version',1,
      'participants',jsonb_build_array(jsonb_build_object('sheetId',hero,'initiative',0,'conditions',jsonb_build_array(
        jsonb_build_object('id',gen_random_uuid()::text,'name','Atordoado','remainingRounds',2))),
        jsonb_build_object('sheetId',npc,'initiative',2)));
    result := public.nexo_query(jsonb_build_array(jsonb_build_object('sql',
      'INSERT INTO encounters (id,campaign_id,data,version,updated_at) VALUES (?,?,?,1,?)',
      'params',jsonb_build_array(encounter,campaign,data::text,stamp))));
    if result#>>'{0,meta,changes}' is distinct from '1' then raise exception 'Encounter insert failed'; end if;

    result := public.nexo_query(jsonb_build_array(jsonb_build_object('sql',roster_query,'params',jsonb_build_array(gm))));
    if not exists(select 1 from jsonb_array_elements(result#>'{0,results}') item where item->>'id'=encounter and item->'data'=data) then
      raise exception 'GM encounter read or JSON persistence failed';
    end if;
    result := public.nexo_query(jsonb_build_array(jsonb_build_object('sql',roster_query,'params',jsonb_build_array(player))));
    if result#>'{0,results}' is distinct from '[]'::jsonb then raise exception 'Player saw a private encounter'; end if;
    result := public.nexo_query(jsonb_build_array(jsonb_build_object('sql',roster_query,'params',jsonb_build_array('outside-'||gm))));
    if result#>'{0,results}' is distinct from '[]'::jsonb then raise exception 'Outsider saw a private encounter'; end if;

    data := jsonb_set(jsonb_set(data,'{round}','2'),'{version}','2');
    result := public.nexo_query(jsonb_build_array(jsonb_build_object('sql',update_query,
      'params',jsonb_build_array(data::text,stamp,encounter,1))));
    if result#>>'{0,meta,changes}' is distinct from '1' then raise exception 'Versioned encounter update failed'; end if;
    result := public.nexo_query(jsonb_build_array(jsonb_build_object('sql',update_query,
      'params',jsonb_build_array(data::text,stamp,encounter,1))));
    if result#>>'{0,meta,changes}' is distinct from '0' then raise exception 'Stale encounter version was accepted'; end if;
    if exists(select 1 from realtime.messages where topic='nexo:campaign:'||campaign
      and payload-'id' <> jsonb_build_object('campaignId',campaign)) then
      raise exception 'Encounter Broadcast disclosed private data';
    end if;
    if not exists(select 1 from realtime.messages where topic='nexo:campaign:'||campaign) then
      raise exception 'Encounter changes did not broadcast';
    end if;
    reset role;
    set local role authenticated;
    if has_function_privilege(current_user,'public.nexo_query(jsonb)','execute') then
      raise exception 'Browser can execute the server SQL gateway';
    end if;
    begin perform 1 from nexo.encounters; exception when insufficient_privilege then denied := true; end;
    if not denied then raise exception 'Browser can read the encounter table directly'; end if;
    reset role;
    raise exception using errcode='N0009',message='Encounter checks passed; discard fixtures';
  exception when sqlstate 'N0009' then null;
  end;
  if exists(select 1 from nexo.profiles where id in (gm,player))
    or exists(select 1 from nexo.campaigns where id=campaign)
    or exists(select 1 from nexo.encounters where id=encounter)
    or exists(select 1 from realtime.messages where topic='nexo:campaign:'||campaign) then
    raise exception 'Encounter fixture rollback failed';
  end if;
end;
$smoke$;

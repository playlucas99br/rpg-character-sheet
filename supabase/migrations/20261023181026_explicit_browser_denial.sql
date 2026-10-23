-- An explicit deny policy documents the server-only access boundary.
do $$
declare t text;
begin
  foreach t in array array['profiles','campaigns','memberships','sheets','rolls','imports','query_allowlist'] loop
    execute format('create policy deny_direct_browser_access on nexo.%I for all to anon, authenticated using (false) with check (false)',t);
  end loop;
end;
$$;

-- Fixes a real gap found on review: joining a campaign by invite code was
-- impossible. Two RLS holes, both on the join path:
--   1. `campaigns` SELECT policy requires already being a member — a brand
--      new user can't look up a campaign by invite code to join it.
--   2. `campaign_members` had no INSERT policy letting a user add themself
--      as a 'player' — only the GM-bootstrap policy (0002) and GM-roster-
--      management policy (0001) allow inserts, both requiring the inserter
--      to already be that campaign's GM.
--
-- Patching this with more RLS policies would mean either exposing campaigns
-- to SELECT by anyone (leaks every campaign's name/invite code to every
-- authenticated user) or trying to make a policy "trust" an invite code,
-- which RLS can't condition on (it filters rows, it doesn't see what value
-- the caller searched for). A SECURITY DEFINER RPC instead: it's the only
-- thing that can look up by code internally (bypassing RLS) while still
-- only ever returning/doing exactly "join this one campaign", nothing else.

create or replace function join_campaign_by_code(p_invite_code text, p_display_name text)
returns campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign campaigns;
begin
  select * into v_campaign from campaigns where invite_code = upper(trim(p_invite_code));
  if not found then
    raise exception 'Кампания с таким кодом не найдена';
  end if;

  insert into campaign_members (campaign_id, user_id, role, display_name)
  values (v_campaign.id, auth.uid(), 'player', p_display_name)
  on conflict (campaign_id, user_id) do update set display_name = excluded.display_name;

  return v_campaign;
end;
$$;

-- Emergency rollback for 0014_superuser.sql — run this if it broke data
-- loading. Restores is_campaign_gm/is_campaign_member to their pre-0014
-- behavior and drops is_superuser()/the campaigns policy change. Once the
-- real cause of the breakage is found, 0014 will be fixed and this file
-- can be ignored (safe to run even if 0014 turns out fine — it's a no-op
-- in that case besides removing the superuser bypass).

create or replace function is_campaign_gm(target_campaign_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from campaign_members
    where campaign_id = target_campaign_id
      and user_id = auth.uid()
      and role = 'gm'
  );
$$;

create or replace function is_campaign_member(target_campaign_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from campaign_members
    where campaign_id = target_campaign_id
      and user_id = auth.uid()
  );
$$;

drop policy "gm manages campaign" on campaigns;
create policy "gm manages campaign" on campaigns
  for all using (gm_user_id = auth.uid()) with check (gm_user_id = auth.uid());

drop function if exists is_superuser();

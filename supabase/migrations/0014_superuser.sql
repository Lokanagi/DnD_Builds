-- A single hardcoded admin account (the dev/GM's own email) gets GM-level
-- access to every campaign, for support/debugging across the whole app —
-- not scoped to campaigns they're personally a member of. Folding the check
-- into the two shared helper functions cascades it through nearly every RLS
-- policy in the schema (they're all built on top of these two).

create or replace function is_superuser()
returns boolean
language sql
stable
as $$
  select auth.jwt() ->> 'email' = 'lokanagi.twitch@gmail.com';
$$;

create or replace function is_campaign_gm(target_campaign_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select is_superuser() or exists (
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
  select is_superuser() or exists (
    select 1 from campaign_members
    where campaign_id = target_campaign_id
      and user_id = auth.uid()
  );
$$;

-- The one policy that checks campaign ownership directly instead of going
-- through is_campaign_gm (everything else in the schema routes through the
-- two functions above, so updating those alone covers it).
drop policy "gm manages campaign" on campaigns;
create policy "gm manages campaign" on campaigns
  for all using (gm_user_id = auth.uid() or is_superuser()) with check (gm_user_id = auth.uid() or is_superuser());

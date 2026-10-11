-- Fixes a chicken-and-egg RLS bug in 0001: creating a campaign's very first
-- campaign_members row (the GM themself) was impossible, because the only
-- insert policy on campaign_members required is_campaign_gm(campaign_id),
-- which checks campaign_members itself — always false before that first row
-- exists. This adds a narrow bootstrap policy: the user who created the
-- campaign (campaigns.gm_user_id) may insert exactly one 'gm' row for
-- themselves. Normal roster management (inviting players, etc.) still goes
-- through the existing "gm manages roster" policy from 0001.
create policy "campaign creator bootstraps own gm membership" on campaign_members
  for insert
  with check (
    role = 'gm'
    and user_id = auth.uid()
    and exists (
      select 1 from campaigns c
      where c.id = campaign_id and c.gm_user_id = auth.uid()
    )
  );

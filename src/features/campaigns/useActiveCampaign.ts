import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/useAuth";
import { isSuperuserEmail } from "@/lib/superuser";
import { getCampaign } from "./campaignApi";
import type { Campaign, MemberRole } from "@/types/campaign";

type ActiveCampaignInfo = {
  campaign: Campaign | null;
  role: MemberRole | null;
  loading: boolean;
};

/**
 * Loads the active campaign's details + the current user's role in it.
 * Backed by TanStack Query (not local state) so it participates in the same
 * cache-invalidation path as every other screen — campaignChannel's realtime
 * subscription and the GM's own actions (advanceDay, setMadnessThresholds)
 * both just call queryClient.invalidateQueries(), which only refetches
 * query-backed data.
 */
export function useActiveCampaign(campaignId: string | null): ActiveCampaignInfo {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["campaign", campaignId, user?.id],
    queryFn: async () => {
      const [campaign, memberRes] = await Promise.all([
        getCampaign(campaignId!),
        supabase
          .from("campaign_members")
          .select("role")
          .eq("campaign_id", campaignId!)
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);
      // The superuser account has RLS-level GM access everywhere (migration
      // 0014), always — even in a campaign where it has an actual player
      // row (e.g. its own test character). Checking this first, not just
      // as a fallback for "no row", so an explicit 'player' row can't
      // override it and hide GM-only controls.
      const role: MemberRole | null = isSuperuserEmail(user!.email)
        ? "gm"
        : ((memberRes.data?.role as MemberRole | undefined) ?? null);
      return { campaign, role };
    },
    enabled: !!campaignId && !!user,
  });

  return {
    campaign: query.data?.campaign ?? null,
    role: query.data?.role ?? null,
    loading: query.isLoading,
  };
}

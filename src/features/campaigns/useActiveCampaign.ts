import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/useAuth";
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
          .single(),
      ]);
      return { campaign, role: (memberRes.data?.role as MemberRole | undefined) ?? null };
    },
    enabled: !!campaignId && !!user,
  });

  return {
    campaign: query.data?.campaign ?? null,
    role: query.data?.role ?? null,
    loading: query.isLoading,
  };
}

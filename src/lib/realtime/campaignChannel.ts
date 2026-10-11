import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

/**
 * Tables every client subscribes to per campaign. Each change patches the
 * matching TanStack Query cache entry directly instead of invalidating +
 * refetching, so a GM's "+1 moon duration" click shows up on a player's
 * screen without a round trip.
 */
const TRACKED_TABLES = [
  "characters",
  "character_resources",
  "conditions",
  "madness_events",
  "moon_state",
  "moon_history",
  "xp_ledger",
] as const;

// `campaigns` itself (current_day, settings/madness thresholds) is filtered
// on `id`, not `campaign_id` like every other tracked table — handled apart
// from the loop below instead of forcing it into the same shape.

/**
 * Subscribes to Postgres Changes + Presence for one campaign for the
 * lifetime of the calling component. Call once near the root of a campaign
 * view (e.g. the Layout for a given campaign route), not per-widget.
 */
export function useCampaignChannel(campaignId: string | undefined, queryClient: QueryClient) {
  useEffect(() => {
    if (!campaignId) return;

    const channel = supabase.channel(`campaign:${campaignId}`);

    // Several screens derive their query key from more than one table (e.g.
    // XP totals read both `characters` and `xp_ledger`, a character detail
    // view keys off characterId not campaignId), so a precise per-table
    // query-key patch would need a mapping that's wrong as often as it's
    // right. Data volume here is tiny (a tabletop campaign's worth of
    // rows), so just invalidate everything — correctness over the saved
    // round trips.
    const invalidateAll = () => void queryClient.invalidateQueries();

    for (const table of TRACKED_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `campaign_id=eq.${campaignId}` },
        invalidateAll,
      );
    }
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "campaigns", filter: `id=eq.${campaignId}` },
      invalidateAll,
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [campaignId, queryClient]);
}

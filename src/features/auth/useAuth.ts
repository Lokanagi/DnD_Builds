import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return { session, loading, user: session?.user ?? null };
}

/**
 * Sends a one-time 6-digit code by email instead of a clickable magic link.
 * A desktop app has no stable, allow-listed http(s) origin to redirect
 * back to (dev server port varies, a packaged Tauri build isn't served
 * over http at all) — the code is typed into the app instead, which
 * sidesteps the redirect problem entirely and works the same way on every
 * platform and build.
 */
export async function requestLoginCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function verifyLoginCode(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

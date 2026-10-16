/** Mirrors `is_superuser()` in migration 0014 — the DB is the real
 * enforcement (RLS), this just lets the UI decide what to show/offer
 * without waiting on a round-trip. */
const SUPERUSER_EMAIL = "lokanagi.twitch@gmail.com";

export function isSuperuserEmail(email: string | null | undefined): boolean {
  return email === SUPERUSER_EMAIL;
}

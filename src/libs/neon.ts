import type { Database } from "@/types/database";
import { useAuth } from "@clerk/expo";
import { NeonPostgrestClient, fetchWithToken } from "@neondatabase/postgrest-js";
import { useMemo } from "react";

const dataApiUrl = process.env.EXPO_PUBLIC_NEON_DATA_API_URL ?? "";

if (!dataApiUrl) {
  throw new Error(
    "Missing EXPO_PUBLIC_NEON_DATA_API_URL. Copy the Data API URL from the Neon console into .env.local, then restart the dev server.",
  );
}

/**
 * The app's only database client. There is no backend: the Expo app talks
 * straight to the Neon Data API over HTTPS, sending the Clerk session token as
 * a bearer. Neon validates it against Clerk's JWKS, sets the `authenticated`
 * role, and RLS restricts every row to `auth.user_id() = owner_id`.
 *
 * fetchWithToken resolves the token per request, which matters: Clerk session
 * tokens expire in about a minute and getToken() silently refreshes them.
 *
 * getToken() needs no template argument, but only because the Clerk instance is
 * configured to add `{"role": "authenticated"}` to every session token
 * (Dashboard -> Sessions -> Customize session token). Neon reads the role from
 * that claim and falls back to `anonymous` — which is granted nothing — when it
 * is missing, so removing it turns every request into a 403.
 */
export function useDataApi() {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      new NeonPostgrestClient<Database>({
        dataApiUrl,
        options: { global: { fetch: fetchWithToken(() => getToken()) } },
      }),
    [getToken],
  );
}

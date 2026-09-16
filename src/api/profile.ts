import { neon } from "@/libs/neon";

/**
 * Creates this landlord's `users` row if it is their first sign-in, and returns
 * quietly if it already exists.
 *
 * Called as a repair rather than on sign-in: `createHouse` tries its insert first
 * and comes here only when the missing row makes the owner_id FK fail, which
 * keeps the common path at one request.
 */
export async function ensureProfile(): Promise<void> {
  const { error } = await neon.rpc("ensure_profile");
  if (error) throw error;
}

import { neon } from "@/libs/neon";

/**
 * Creates this landlord's `users` row if it is their first sign-in, and returns
 * quietly if it already exists.
 *
 * Nothing calls this yet — the button that did was the connection check. Every
 * houses and tenants insert needs the row for its owner_id FK, so it has to run
 * once after sign-in, before the first write.
 */
export async function ensureProfile(): Promise<void> {
  const { error } = await neon.rpc("ensure_profile");
  if (error) throw error;
}

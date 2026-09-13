import type { Database } from "@/types/database";
import { getClerkInstance } from "@clerk/expo";
import { NeonPostgrestClient, fetchWithToken } from "@neondatabase/postgrest-js";

const dataApiUrl = process.env.EXPO_PUBLIC_NEON_DATA_API_URL!;
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export const neon = new NeonPostgrestClient<Database>({
  dataApiUrl,
  options: {
    global: {
      fetch: fetchWithToken(async () => {
        const clerk = getClerkInstance({ publishableKey: clerkPublishableKey });
        return (await clerk?.session?.getToken()) ?? null;
      }),
    },
  },
});

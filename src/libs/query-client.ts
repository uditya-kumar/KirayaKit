import { QueryClient } from "@tanstack/react-query";

/**
 * The app's query cache. Exported rather than created in the layout so code
 * outside React — an api module, a notification handler — can invalidate a key.
 *
 * Tabs keep their screens mounted, so a short staleTime is what makes coming
 * back to a list cheap. Writes should still invalidate their key; that, not a
 * timer, is what keeps the list correct after adding or deleting a house.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // One retry, not three: on a phone a failed request is usually offline
      // rather than flaky, and the screen shows a Try again action.
      retry: 1,
    },
  },
});

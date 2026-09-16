/**
 * The one failure Clerk and the Data API share: a request that never reached
 * anyone.
 *
 * It lives apart from `clerk-errors` and `neon-errors` because nothing about it
 * belongs to either — there is no Clerk code and no Postgres SQLSTATE to read,
 * only the wording — and because what a landlord is told should not depend on
 * which client happened to notice the network was gone first.
 */

/** Shown for every failure below. "Can't reach" rather than "offline": see why in NETWORK_FAILURE. */
export const NETWORK_FAILURE_MESSAGE =
  "Can't reach KirayaKit. Check your connection and try again.";

/**
 * The shapes a dead request actually arrives in, since the wording is all there
 * is to go on:
 *
 * - "Network request failed" — React Native's own TypeError.
 * - "fetch failed" — the newer wrapper, which appends the real cause:
 *   `java.net.UnknownHostException: Unable to resolve host "…"`.
 * - The DNS failures by name. A resolver that answers with nothing is the common
 *   case on a phone — a captive portal, a filtering network, a carrier holding a
 *   stale negative answer — and none of those are "offline" in a way the person
 *   holding it would recognise, which is why the sentence above talks about
 *   reaching us rather than about their connection being down.
 */
const NETWORK_FAILURE =
  /network request failed|fetch failed|unable to resolve host|unknownhostexception|connection (refused|reset)|network is unreachable/i;

/**
 * Every text a rejection carries, read out of both shapes the app sees one in.
 *
 * `cause` matters as much as `message`: the outer error is often the generic
 * wrapper and the half that names the failure sits underneath. PostgREST does not
 * throw an `Error` at all — it hands back a plain object wearing the same fields —
 * so neither is reached through `instanceof`.
 */
function errorText(err: unknown): string {
  if (err instanceof Error) {
    const cause = err.cause instanceof Error ? err.cause.message : "";
    return `${err.message} ${cause}`;
  }
  if (err && typeof err === "object" && "message" in err) {
    const { message } = err as { message?: unknown };
    return typeof message === "string" ? message : "";
  }
  return "";
}

/** Whether the request never got an answer, as opposed to getting a bad one. */
export function isNetworkFailure(err: unknown): boolean {
  return NETWORK_FAILURE.test(errorText(err));
}

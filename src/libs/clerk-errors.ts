import { isClerkAPIResponseError } from "@clerk/expo";

/**
 * What to say for each failure the app can actually reach, keyed by Clerk's error
 * code.
 *
 * The code is the only stable part of a Clerk error. Its `message` is documented
 * as being for developers, and `longMessage`, where the API sends one at all, is
 * written for Clerk's own hosted pages and talks about methods and factors we
 * don't offer. So the sentence shown is ours, and only the code is read.
 *
 * Short, because there are only two Clerk calls left in the app — the Google SSO
 * flow and signing out. Everything a password, an emailed code or a reset could
 * fail with went when those screens did; an unfamiliar code now falls through to
 * `longMessage` and then to the generic sentence, which is the same safety net it
 * always had.
 */
const MESSAGES: Record<string, string> = {
  // The Google flow itself.
  oauth_access_denied: "Google didn't let us in. Try again.",
  external_account_exists:
    "That Google account is already connected to another KirayaKit account.",
  identification_claimed:
    "That Google account is already connected to another KirayaKit account.",
  oauth_email_domain_reserved:
    "That Google account's domain signs in a different way. Use a personal Google account.",
  client_state_invalid: "This took too long. Start again.",

  not_allowed_access: "That account is not allowed to sign in.",
  session_exists: "You are already signed in.",
  too_many_requests: "Too many tries. Wait a minute, then try again.",
  captcha_invalid: "We couldn't tell you apart from a bot. Try again.",
  captcha_unavailable: "We couldn't tell you apart from a bot. Try again.",
};

/** Nothing matched and there is nothing to act on, so it says only that. */
const FALLBACK = "Something went wrong. Try again in a moment.";

/**
 * The one failure worth naming, because it carries no Clerk code: the request
 * never reached Clerk.
 */
const OFFLINE = "Can't reach KirayaKit. Check your connection and try again.";

/**
 * Whether a failure is really a dead connection. React Native rejects `fetch`
 * with a TypeError reading "Network request failed"; Clerk sometimes passes that
 * on as the `cause` of its own error, so both are checked. The wording is what
 * identifies it — there is no code or status to go on when nothing was sent.
 */
function isOffline(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const wrapped = err.cause instanceof Error ? err.cause.message : "";
  return /network request failed/i.test(`${err.message} ${wrapped}`);
}

/**
 * The code and, if the API sent one, Clerk's own sentence — read out of either
 * shape a Clerk failure arrives in.
 *
 * A thrown `ClerkAPIResponseError` keeps its errors in an array; the signals API
 * hands back a single `ClerkError`, which carries the same fields on itself. It
 * is read by shape rather than with `isClerkError`, which `@clerk/expo` does not
 * re-export.
 */
function clerkErrorParts(err: unknown): {
  code?: string;
  longMessage?: string;
} {
  if (isClerkAPIResponseError(err)) {
    const first = err.errors[0];
    return { code: first?.code, longMessage: first?.longMessage };
  }
  if (err && typeof err === "object") {
    const { code, longMessage } = err as {
      code?: unknown;
      longMessage?: unknown;
    };
    return {
      code: typeof code === "string" ? code : undefined,
      longMessage: typeof longMessage === "string" ? longMessage : undefined,
    };
  }
  return {};
}

/**
 * Turns a Clerk rejection into one sentence to put on screen.
 *
 * An unmapped code falls back to Clerk's `longMessage` before the generic
 * sentence, because a new failure with a written-out explanation is still worth
 * more than a shrug. `message` is never shown — see MESSAGES above.
 */
export function clerkErrorMessage(err: unknown): string {
  const { code, longMessage } = clerkErrorParts(err);
  const ours = code ? MESSAGES[code] : undefined;
  if (ours) return ours;
  if (longMessage) return longMessage;
  return isOffline(err) ? OFFLINE : FALLBACK;
}

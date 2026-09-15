import { isClerkAPIResponseError } from "@clerk/expo";

/**
 * What to say for each failure the auth screens can actually reach, keyed by
 * Clerk's error code.
 *
 * The code is the only stable part of a Clerk error. Its `message` is documented
 * as being for developers — a wrong email shape arrives as "Identifier is
 * invalid", which names a field this app never shows — and `longMessage`, where
 * the API sends one at all, is written for Clerk's own hosted pages and talks
 * about methods and factors we don't offer. So the sentence shown is ours, and
 * only the code is read.
 *
 * Codes are as Clerk documents them, including the `__suffix` variants the API
 * uses when it can name the field. Both spellings of a failure are listed rather
 * than matched by prefix, so an unfamiliar one falls through to the generic
 * sentence instead of borrowing a neighbour's.
 */
const MESSAGES: Record<string, string> = {
  // Signing in.
  form_identifier_not_found:
    "No account uses that email address. Check it, or create an account.",
  form_password_incorrect:
    "That password is not right. Try again, or use Forgot password.",
  form_password_or_identifier_incorrect:
    "That email address and password don't go together.",
  form_password_compromised__sign_in:
    "That password has turned up in a public data breach, so it cannot be used. Reset it to carry on.",
  form_password_pwned__sign_in:
    "That password has turned up in a public data breach, so it cannot be used. Reset it to carry on.",
  form_password_untrusted__sign_in:
    "That password may have been exposed, so it cannot be used. Reset it to carry on.",
  not_allowed_access: "That account is not allowed to sign in.",
  session_exists: "You are already signed in.",

  // Creating an account.
  form_identifier_exists:
    "That email address already has an account. Sign in instead.",
  form_identifier_exists__email_address:
    "That email address already has an account. Sign in instead.",
  form_email_address_blocked: "That email address cannot be used here.",
  // form_password_length_too_short is deliberately absent: Clerk's own sentence
  // for it names the minimum the instance is actually set to, and any number
  // written here would be a second copy of a setting we don't own.
  form_password_not_strong_enough:
    "That password is too easy to guess. A longer one, or a second word, is enough.",
  form_password_validation_failed:
    "That password is too easy to guess. A longer one, or a second word, is enough.",
  form_password_pwned:
    "That password has turned up in a public data breach. Choose a different one.",
  form_password_matches_identifier:
    "The password cannot be your email address. Choose something else.",
  form_password_size_in_bytes_exceeded: "That password is too long.",

  // The emailed code, which both screens collect.
  form_code_incorrect:
    "That code is not right. Check the email and type it again.",
  verification_expired: "That code has expired. Ask for a new one.",
  verification_failed:
    "Too many wrong codes were tried. Ask for a new one and start again.",
  client_state_invalid: "This took too long. Start again.",

  // Not tied to a field: the email address is typed on a screen with one field,
  // so a rejected format is always that.
  form_param_format_invalid: "That doesn't look like an email address.",
  form_param_format_invalid__email_address:
    "That doesn't look like an email address.",
  form_param_type_invalid__email_address:
    "That doesn't look like an email address.",
  form_param_nil: "Fill in both fields to carry on.",

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

/**
 * Runs one signals-API call and answers with a sentence to show, or null when it
 * worked.
 *
 * The signals API resolves to `{ error }` instead of throwing, but not always:
 * its guard clauses run outside that wrapper, so
 * `signIn.resetPasswordEmailCode.sendCode()` with no sign-in in progress throws a
 * plain Error. Off Wi-Fi, `fetch` rejecting has the same shape. Either one
 * unhandled is an unhandled rejection and a screen that sits there spinning,
 * which is why every call in the auth screens goes through here.
 */
export async function clerkAttempt(
  call: () => Promise<{ error: unknown }>,
): Promise<string | null> {
  try {
    const { error } = await call();
    return error ? clerkErrorMessage(error) : null;
  } catch (err) {
    return clerkErrorMessage(err);
  }
}

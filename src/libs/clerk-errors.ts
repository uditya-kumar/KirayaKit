import { isClerkAPIResponseError } from "@clerk/expo";

/**
 * Clerk rejections carry an array of errors with a user-readable `longMessage`
 * ("Password is incorrect. Try again…"). Anything else is a network or code
 * fault, so surface it plainly instead of swallowing it.
 */
export function clerkErrorMessage(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    const first = err.errors[0];
    return first?.longMessage ?? first?.message ?? "Something went wrong.";
  }
  if (err instanceof Error) {
    // The signals API (useSignIn/useSignUp) hands back a ClerkError instance
    // rather than throwing; longMessage is its end-user sentence.
    return (err as { longMessage?: string }).longMessage ?? err.message;
  }
  return "Something went wrong.";
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

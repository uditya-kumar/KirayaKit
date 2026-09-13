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

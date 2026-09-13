import { AuthShell, Field, LinkButton, PrimaryButton } from "@/components/AuthForm";
import { clerkErrorMessage } from "@/lib/clerk-errors";
import { useSignIn } from "@clerk/expo";
import { router } from "expo-router";
import { useState } from "react";

export default function SignInScreen() {
  // @clerk/expo v4 exposes the signals API: calls resolve to { error } instead
  // of throwing, and fetchStatus is the in-flight flag.
  const { signIn, fetchStatus } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const busy = fetchStatus === "fetching";

  async function onSignIn() {
    if (busy) return;
    setError(null);

    const attempt = await signIn.password({
      identifier: email.trim(),
      password,
    });
    if (attempt.error) {
      setError(clerkErrorMessage(attempt.error));
      return;
    }
    if (signIn.status !== "complete") {
      // Two-factor or another second step, which this screen doesn't collect.
      setError(`Sign-in needs another step (${signIn.status}).`);
      return;
    }

    // finalize() activates the session, which flips useAuth().isSignedIn — the
    // root layout guards on that, so there is no navigation to do here.
    const done = await signIn.finalize();
    if (done.error) {
      setError(clerkErrorMessage(done.error));
    }
  }

  return (
    <AuthShell title="Sign in" subtitle="RentTrack" error={error}>
      <Field
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Field
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        secureTextEntry
        onSubmitEditing={onSignIn}
        returnKeyType="go"
      />
      <PrimaryButton
        label="Sign in"
        onPress={onSignIn}
        busy={busy}
        disabled={!email || !password}
      />
      <LinkButton
        label="No account? Sign up"
        onPress={() => router.push("/sign-up")}
      />
    </AuthShell>
  );
}

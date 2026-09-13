import { AuthShell, Field, LinkButton, PrimaryButton } from "@/components/AuthForm";
import { clerkErrorMessage } from "@/lib/clerk-errors";
import { useSignUp } from "@clerk/expo";
import { router } from "expo-router";
import { useState } from "react";

export default function SignUpScreen() {
  const { signUp, fetchStatus } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  // Clerk emails a 6-digit code after the sign-up is created, so this screen
  // has two states: collect credentials, then collect the code.
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = fetchStatus === "fetching";

  async function onSignUp() {
    if (busy) return;
    setError(null);

    const created = await signUp.password({
      emailAddress: email.trim(),
      password,
    });
    if (created.error) {
      setError(clerkErrorMessage(created.error));
      return;
    }

    const sent = await signUp.verifications.sendEmailCode();
    if (sent.error) {
      setError(clerkErrorMessage(sent.error));
      return;
    }
    setAwaitingCode(true);
  }

  async function onVerify() {
    if (busy) return;
    setError(null);

    const verified = await signUp.verifications.verifyEmailCode({
      code: code.trim(),
    });
    if (verified.error) {
      setError(clerkErrorMessage(verified.error));
      return;
    }
    if (signUp.status !== "complete") {
      setError(`Sign-up needs another step (${signUp.status}).`);
      return;
    }

    const done = await signUp.finalize();
    if (done.error) {
      setError(clerkErrorMessage(done.error));
    }
  }

  if (awaitingCode) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a 6-digit code to ${email.trim()}.`}
        error={error}
      >
        <Field
          value={code}
          onChangeText={setCode}
          placeholder="Verification code"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          onSubmitEditing={onVerify}
          returnKeyType="go"
        />
        <PrimaryButton
          label="Verify"
          onPress={onVerify}
          busy={busy}
          disabled={!code}
        />
        <LinkButton
          label="Use a different email"
          onPress={async () => {
            await signUp.reset();
            setAwaitingCode(false);
            setCode("");
            setError(null);
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create account" subtitle="RentTrack" error={error}>
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
        autoComplete="new-password"
        textContentType="newPassword"
        secureTextEntry
        onSubmitEditing={onSignUp}
        returnKeyType="go"
      />
      <PrimaryButton
        label="Sign up"
        onPress={onSignUp}
        busy={busy}
        disabled={!email || !password}
      />
      <LinkButton
        label="Already have an account? Sign in"
        onPress={() => router.replace("/sign-in")}
      />
    </AuthShell>
  );
}

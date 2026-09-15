import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { Text, View } from "@/components/Themed";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { clerkErrorMessage } from "@/libs/clerk-errors";
import { useSignIn } from "@clerk/expo";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";

/**
 * Email + password sign-in. Falls into a second state when Clerk returns
 * `needs_client_trust` — Device Trust, which fires on every unrecognised device
 * and so on every user's first sign-in after an install.
 */
export default function SignInScreen() {
  const theme = Colors[useColorScheme() ?? "light"];
  // @clerk/expo v4 exposes the signals API: calls resolve to { error } instead
  // of throwing, and fetchStatus is the in-flight flag.
  const { signIn, fetchStatus } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  // Clerk's Device Trust asks for an emailed code the first time an account
  // signs in on a given device, so this screen has the same two states as
  // sign-up: collect credentials, then collect the code.
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = fetchStatus === "fetching";

  // finalize() activates the session, which flips useAuth().isSignedIn — the
  // root layout guards on that, so there is no navigation to do here.
  async function finalizeSignIn() {
    const done = await signIn.finalize();
    if (done.error) {
      setError(clerkErrorMessage(done.error));
    }
  }

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
    if (signIn.status === "needs_client_trust") {
      // The password was right but Clerk doesn't recognise this device. Nobody
      // here has MFA configured, so the emailed code is the only second factor
      // on offer; treating it as an error would lock out every new install.
      const emailCode = signIn.supportedSecondFactors.find(
        (factor) => factor.strategy === "email_code",
      );
      if (!emailCode) {
        setError("This device needs verifying, but no email code was offered.");
        return;
      }
      const sent = await signIn.mfa.sendEmailCode();
      if (sent.error) {
        setError(clerkErrorMessage(sent.error));
        return;
      }
      setAwaitingCode(true);
      return;
    }
    if (signIn.status !== "complete") {
      // Two-factor or another second step, which this screen doesn't collect.
      setError(`Sign-in needs another step (${signIn.status}).`);
      return;
    }

    await finalizeSignIn();
  }

  async function onVerify() {
    if (busy) return;
    setError(null);

    const verified = await signIn.mfa.verifyEmailCode({ code: code.trim() });
    if (verified.error) {
      setError(clerkErrorMessage(verified.error));
      return;
    }
    if (signIn.status !== "complete") {
      setError(`Sign-in needs another step (${signIn.status}).`);
      return;
    }

    await finalizeSignIn();
  }

  if (awaitingCode) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verify this device</Text>
        <Text style={styles.subtitle}>
          This is a new device, so we sent a 6-digit code to {email.trim()}.
        </Text>
        {error ? (
          <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
        ) : null}
        <CustomTextInput
          value={code}
          onChangeText={setCode}
          placeholder="Verification code"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          onSubmitEditing={onVerify}
          returnKeyType="go"
        />
        <Button
          text="Verify"
          textColor={theme.buttonText}
          backgroundColor={theme.buttonBackground}
          onPress={onVerify}
          loading={busy}
          disabled={!code}
          paddingVertical={14}
          style={styles.primary}
        />
        <Button
          text="Back to sign in"
          textColor={theme.tint}
          backgroundColor="transparent"
          onPress={async () => {
            await signIn.reset();
            setAwaitingCode(false);
            setCode("");
            setPassword("");
            setError(null);
          }}
          paddingVertical={8}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.subtitle}>KirayaKit</Text>
      {error ? (
        <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
      ) : null}
      <CustomTextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <CustomTextInput
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
      <Button
        text="Sign in"
        textColor={theme.buttonText}
        backgroundColor={theme.buttonBackground}
        onPress={onSignIn}
        loading={busy}
        disabled={!email || !password}
        paddingVertical={14}
        style={styles.primary}
      />
      <Button
        text="No account? Sign up"
        textColor={theme.tint}
        backgroundColor="transparent"
        onPress={() => router.push("/sign-up")}
        paddingVertical={8}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.7,
    marginBottom: 4,
  },
  error: {
    fontSize: 14,
  },
  // Layout only; Button draws the rest.
  primary: {
    marginTop: 4,
    minHeight: 48,
  },
});

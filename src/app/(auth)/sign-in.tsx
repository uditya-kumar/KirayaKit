import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { Text, View } from "@/components/Themed";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { clerkAttempt } from "@/libs/clerk-errors";
import { useSignIn } from "@clerk/expo";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";

/**
 * Email + password sign-in. Falls into a second state when Clerk returns
 * `needs_client_trust` — Device Trust, which fires on every unrecognised device
 * and so on every user's first sign-in after an install.
 *
 * Forgetting the password is a dead end from here, so it is its own screen:
 * /reset-password.
 */
export default function SignInScreen() {
  const theme = Colors[useColorScheme() ?? "light"];
  // @clerk/expo v4 exposes the signals API: calls resolve to { error } instead
  // of throwing, and fetchStatus is the in-flight flag. `clerkAttempt` wraps
  // both, because the guard clauses inside those calls do still throw.
  const { signIn, fetchStatus } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  // Clerk's Device Trust asks for an emailed code the first time an account
  // signs in on a given device, so this screen has the same two states as
  // sign-up: collect credentials, then collect the code.
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Kept apart from `error` so "Code sent" is not drawn in the error colour.
  const [notice, setNotice] = useState<string | null>(null);
  const busy = fetchStatus === "fetching";

  // finalize() activates the session, which flips useAuth().isSignedIn — the
  // root layout guards on that, so there is no navigation to do here.
  async function finalizeSignIn() {
    const failed = await clerkAttempt(() => signIn.finalize());
    if (failed) setError(failed);
  }

  async function onSignIn() {
    if (busy) return;
    setError(null);
    setNotice(null);

    const failed = await clerkAttempt(() =>
      signIn.password({ identifier: email.trim(), password }),
    );
    if (failed) {
      setError(failed);
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
      const notSent = await clerkAttempt(() => signIn.mfa.sendEmailCode());
      if (notSent) {
        setError(notSent);
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
    setNotice(null);

    const failed = await clerkAttempt(() =>
      signIn.mfa.verifyEmailCode({ code: code.trim() }),
    );
    if (failed) {
      setError(failed);
      return;
    }
    if (signIn.status !== "complete") {
      setError(`Sign-in needs another step (${signIn.status}).`);
      return;
    }

    await finalizeSignIn();
  }

  // A code that never arrives — a slow mailbox, a spam folder emptied — is the
  // other way to be locked out of a device that is otherwise fine.
  async function onResend() {
    if (busy) return;
    setError(null);
    setNotice(null);

    const failed = await clerkAttempt(() => signIn.mfa.sendEmailCode());
    if (failed) setError(failed);
    else setNotice("A new code is on its way.");
  }

  async function onStartOver() {
    setError(null);
    setNotice(null);
    const failed = await clerkAttempt(() => signIn.reset());
    if (failed) {
      setError(failed);
      return;
    }
    setAwaitingCode(false);
    setCode("");
    setPassword("");
  }

  const messages = (
    <>
      {error ? (
        <Text style={[styles.message, { color: theme.error }]}>{error}</Text>
      ) : null}
      {notice ? (
        <Text style={[styles.message, { color: theme.success }]}>{notice}</Text>
      ) : null}
    </>
  );

  return (
    // The fields sit in the middle of the screen, which is exactly where the
    // keyboard lands. Android shrinks the window itself, so iOS is the one that
    // has to be told; there is no header here to offset against.
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {awaitingCode ? (
        <View style={styles.container}>
          <Text style={styles.title}>Verify this device</Text>
          <Text style={styles.subtitle}>
            This is a new device, so we sent a 6-digit code to {email.trim()}.
          </Text>
          {messages}
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
            text="Resend code"
            textColor={theme.tint}
            backgroundColor="transparent"
            onPress={onResend}
            disabled={busy}
            paddingVertical={8}
          />
          <Button
            text="Back to sign in"
            textColor={theme.tint}
            backgroundColor="transparent"
            onPress={onStartOver}
            paddingVertical={8}
          />
        </View>
      ) : (
        <View style={styles.container}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>KirayaKit</Text>
          {messages}
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
            text="Forgot password?"
            textColor={theme.tint}
            backgroundColor="transparent"
            // The email already typed travels with it, so the reset screen does
            // not ask for it a second time.
            onPress={() =>
              router.push({
                pathname: "/reset-password",
                params: { email: email.trim() },
              })
            }
            paddingVertical={8}
          />
          <Button
            text="No account? Sign up"
            textColor={theme.tint}
            backgroundColor="transparent"
            onPress={() => router.push("/sign-up")}
            paddingVertical={8}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
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
  message: {
    fontSize: 14,
  },
  // Layout only; Button draws the rest.
  primary: {
    marginTop: 4,
    minHeight: 48,
  },
});

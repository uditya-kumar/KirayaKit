import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { Text, View } from "@/components/Themed";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { clerkAttempt } from "@/libs/clerk-errors";
import { useSignUp } from "@clerk/expo";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";

/**
 * Create an account: email and password, then the 6-digit code Clerk emails.
 *
 * Every call goes through `clerkAttempt`, which turns both halves of the signals
 * API — the `{ error }` it resolves with and the guard clauses that still throw —
 * into one sentence for the screen.
 */
export default function SignUpScreen() {
  const theme = Colors[useColorScheme() ?? "light"];
  const { signUp, fetchStatus } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  // Clerk emails a 6-digit code after the sign-up is created, so this screen
  // has two states: collect credentials, then collect the code.
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Kept apart from `error` so "Code sent" is not drawn in the error colour.
  const [notice, setNotice] = useState<string | null>(null);
  const busy = fetchStatus === "fetching";

  async function onSignUp() {
    if (busy) return;
    setError(null);
    setNotice(null);

    const notCreated = await clerkAttempt(() =>
      signUp.password({ emailAddress: email.trim(), password }),
    );
    if (notCreated) {
      setError(notCreated);
      return;
    }

    const notSent = await clerkAttempt(() =>
      signUp.verifications.sendEmailCode(),
    );
    if (notSent) {
      setError(notSent);
      return;
    }
    setAwaitingCode(true);
  }

  async function onVerify() {
    if (busy) return;
    setError(null);
    setNotice(null);

    const notVerified = await clerkAttempt(() =>
      signUp.verifications.verifyEmailCode({ code: code.trim() }),
    );
    if (notVerified) {
      setError(notVerified);
      return;
    }
    if (signUp.status !== "complete") {
      setError(`Sign-up needs another step (${signUp.status}).`);
      return;
    }

    const notFinalized = await clerkAttempt(() => signUp.finalize());
    if (notFinalized) setError(notFinalized);
  }

  // A code that never arrives leaves an account created and unusable, with the
  // email already taken — so asking for another one has to be possible here.
  async function onResend() {
    if (busy) return;
    setError(null);
    setNotice(null);

    const failed = await clerkAttempt(() =>
      signUp.verifications.sendEmailCode(),
    );
    if (failed) setError(failed);
    else setNotice("A new code is on its way.");
  }

  async function onStartOver() {
    setError(null);
    setNotice(null);
    const failed = await clerkAttempt(() => signUp.reset());
    if (failed) {
      setError(failed);
      return;
    }
    setAwaitingCode(false);
    setCode("");
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
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to {email.trim()}.
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
            text="Use a different email"
            textColor={theme.tint}
            backgroundColor="transparent"
            onPress={onStartOver}
            paddingVertical={8}
          />
        </View>
      ) : (
        <View style={styles.container}>
          <Text style={styles.title}>Create account</Text>
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
            autoComplete="new-password"
            textContentType="newPassword"
            secureTextEntry
            onSubmitEditing={onSignUp}
            returnKeyType="go"
          />
          <Button
            text="Sign up"
            textColor={theme.buttonText}
            backgroundColor={theme.buttonBackground}
            onPress={onSignUp}
            loading={busy}
            disabled={!email || !password}
            paddingVertical={14}
            style={styles.primary}
          />
          <Button
            text="Already have an account? Sign in"
            textColor={theme.tint}
            backgroundColor="transparent"
            onPress={() => router.replace("/sign-in")}
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

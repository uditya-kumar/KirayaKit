import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { Text, View } from "@/components/Themed";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { clerkAttempt } from "@/libs/clerk-errors";
import { useSignIn } from "@clerk/expo";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";

/**
 * Forgot password: email a code, then set a new one.
 *
 * Its own screen rather than a third state on sign-in, which already has two.
 * Without it a forgotten password is permanent — there is no other way back into
 * an account, and the app is the only place a landlord's ledger lives.
 *
 * The code and the new password are collected together, the way Clerk's own flow
 * does it: verifying the code moves the sign-in to `needs_new_password`, and
 * anything that interrupts between the two steps would leave the account in that
 * state with nothing on screen to finish it.
 *
 * A completed reset signs the landlord in, so there is no navigation at the end —
 * finalize() flips useAuth().isSignedIn and the root layout swaps the whole group
 * out.
 */
export default function ResetPasswordScreen() {
  const theme = Colors[useColorScheme() ?? "light"];
  const { signIn, fetchStatus } = useSignIn();
  // Handed over by the sign-in screen, so the email is typed once.
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(emailParam ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Kept apart from `error` so "Code sent" is not drawn in the error colour.
  const [notice, setNotice] = useState<string | null>(null);
  const busy = fetchStatus === "fetching";

  /**
   * Starts a sign-in for this email and asks for the reset code.
   *
   * `create` is what gives the attempt an identifier; without one the send call
   * has no account to mail and throws rather than answering with an error.
   */
  async function sendCode(): Promise<string | null> {
    const notCreated = await clerkAttempt(() =>
      signIn.create({ identifier: email.trim() }),
    );
    if (notCreated) return notCreated;

    // Checked rather than left to fail, because the failure is a ClerkError about
    // a missing factor — true, and no use to the person reading it.
    const offered = signIn.supportedFirstFactors.some(
      (factor) => factor.strategy === "reset_password_email_code",
    );
    if (!offered) {
      return "This account cannot be reset by email. Ask for help at support.";
    }

    return clerkAttempt(() => signIn.resetPasswordEmailCode.sendCode());
  }

  async function onSendCode() {
    if (busy) return;
    setError(null);
    setNotice(null);

    const failed = await sendCode();
    if (failed) {
      setError(failed);
      return;
    }
    setAwaitingCode(true);
  }

  async function onResend() {
    if (busy) return;
    setError(null);
    setNotice(null);

    const failed = await clerkAttempt(() =>
      signIn.resetPasswordEmailCode.sendCode(),
    );
    if (failed) setError(failed);
    else setNotice("A new code is on its way.");
  }

  async function onReset() {
    if (busy) return;
    setError(null);
    setNotice(null);

    const notVerified = await clerkAttempt(() =>
      signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() }),
    );
    if (notVerified) {
      setError(notVerified);
      return;
    }

    const notSet = await clerkAttempt(() =>
      signIn.resetPasswordEmailCode.submitPassword({ password }),
    );
    if (notSet) {
      setError(notSet);
      return;
    }

    if (signIn.status !== "complete") {
      // A second factor on top of the reset, which this screen doesn't collect.
      // The password has been changed by this point, so signing in again works.
      setError(
        `Your password is changed, but signing in needs another step (${signIn.status}). Go back and sign in.`,
      );
      return;
    }

    const notFinalized = await clerkAttempt(() => signIn.finalize());
    if (notFinalized) setError(notFinalized);
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
          <Text style={styles.title}>Set a new password</Text>
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
            returnKeyType="next"
          />
          <CustomTextInput
            value={password}
            onChangeText={setPassword}
            placeholder="New password"
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            secureTextEntry
            onSubmitEditing={onReset}
            returnKeyType="go"
          />
          <Button
            text="Reset password"
            textColor={theme.buttonText}
            backgroundColor={theme.buttonBackground}
            onPress={onReset}
            loading={busy}
            disabled={!code || !password}
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
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            We&apos;ll email you a code to set a new one.
          </Text>
          {messages}
          <CustomTextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            onSubmitEditing={onSendCode}
            returnKeyType="go"
          />
          <Button
            text="Send code"
            textColor={theme.buttonText}
            backgroundColor={theme.buttonBackground}
            onPress={onSendCode}
            loading={busy}
            disabled={!email}
            paddingVertical={14}
            style={styles.primary}
          />
          <Button
            text="Back to sign in"
            textColor={theme.tint}
            backgroundColor="transparent"
            // back() rather than a push: sign-in is what opened this screen, and
            // a second copy of it in the stack would break the Sign up link.
            // Opened by a link there is nothing behind it, so sign-in replaces it.
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/sign-in");
            }}
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

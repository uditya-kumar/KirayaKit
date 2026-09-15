import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { clerkAttempt } from "@/libs/clerk-errors";
import { useSignIn } from "@clerk/expo";
import { router } from "expo-router";
import {
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Email + password sign-in. Falls into a second state when Clerk returns
 * `needs_client_trust` — Device Trust, which fires on every unrecognised device
 * and so on every user's first sign-in after an install.
 *
 * Deliberately flat: nothing on this screen sits in a card or a panel, so the
 * fields are the only bordered thing and the hierarchy is carried by type size
 * and spacing alone. Both states share the same header and footer, so the screen
 * does not reshape when Device Trust turns up.
 *
 * Forgetting the password is a dead end from here, so it is its own screen:
 * /reset-password.
 */
export default function SignInScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  // The footer sits on the bottom edge, so it has to clear the home indicator
  // itself — there is no tab bar under this screen to do it.
  const insets = useSafeAreaInsets();
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
  // A typo in a masked field is the most common reason a correct password is
  // rejected, so the field can be unmasked rather than retyped.
  const [revealPassword, setRevealPassword] = useState(false);
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
    setRevealPassword(false);
  }

  const subheadingStyle = [styles.subheading, { color: colors.textMuted }];

  // An icon carries each message instead of a tinted panel, so a failed sign-in
  // still reads as more than another line of grey text.
  const messages = (
    <>
      {error ? (
        <View style={styles.message}>
          <CircleAlert size={15} color={colors.error} />
          <Text style={[styles.messageText, { color: colors.error }]}>
            {error}
          </Text>
        </View>
      ) : null}
      {notice ? (
        <View style={styles.message}>
          <CircleCheck size={15} color={colors.success} />
          {/* The success green is too light to read as body text, so it stays on
              the icon and the sentence takes the ordinary text colour. */}
          <Text style={[styles.messageText, { color: colors.text }]}>
            {notice}
          </Text>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* The form sits in the middle of the screen, which is exactly where the
          keyboard lands. Android shrinks the window itself, so iOS is the one
          that has to be told; there is no header here to offset against. The
          ScrollView is what saves the short screens, where the fields and the
          keyboard together are taller than the window. */}
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            {/* The brand is a line of type rather than a mark, so it is set
                small and wide and left to sit above the greeting. */}
            <Text style={[styles.eyebrow, { color: colors.tint }]}>
              KirayaKit
            </Text>
            {awaitingCode ? (
              <View style={styles.headingRow}>
                <ShieldCheck size={22} color={colors.text} />
                <Text style={[styles.heading, { color: colors.text }]}>
                  Verify this device
                </Text>
              </View>
            ) : (
              <Text style={[styles.heading, { color: colors.text }]}>
                Welcome back
              </Text>
            )}
            {awaitingCode ? (
              <Text style={subheadingStyle}>
                This is a new device, so we sent a 6-digit code to{" "}
                <Text style={[styles.emphasis, { color: colors.text }]}>
                  {email.trim()}
                </Text>
                .
              </Text>
            ) : (
              <Text style={subheadingStyle}>
                Sign in to pick up where you left off.
              </Text>
            )}
          </View>

          {/* Groups the fields for spacing only — it draws nothing. */}
          <View style={styles.form}>
            {messages}
            {awaitingCode ? (
              <>
                <CustomTextInput
                  value={code}
                  onChangeText={setCode}
                  labelText="Verification code"
                  placeholder="6-digit code"
                  icon={<KeyRound size={17} color={colors.textMuted} />}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  onSubmitEditing={onVerify}
                  returnKeyType="go"
                />
                <Button
                  text="Verify and continue"
                  textColor={colors.buttonText}
                  backgroundColor={colors.buttonBackground}
                  onPress={onVerify}
                  loading={busy}
                  disabled={!code}
                  paddingVertical={15}
                  borderRadius={14}
                  style={styles.primary}
                />
                <Button
                  text="Resend code"
                  textColor={colors.tint}
                  backgroundColor="transparent"
                  onPress={onResend}
                  disabled={busy}
                  paddingVertical={2}
                  paddingHorizontal={0}
                  style={styles.quiet}
                />
              </>
            ) : (
              <>
                <CustomTextInput
                  value={email}
                  onChangeText={setEmail}
                  labelText="Email"
                  placeholder="you@example.com"
                  icon={<Mail size={17} color={colors.textMuted} />}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                />
                <CustomTextInput
                  value={password}
                  onChangeText={setPassword}
                  labelText="Password"
                  placeholder="Your password"
                  icon={<Lock size={17} color={colors.textMuted} />}
                  trailing={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        revealPassword ? "Hide password" : "Show password"
                      }
                      onPress={() => setRevealPassword((shown) => !shown)}
                      hitSlop={10}
                    >
                      {revealPassword ? (
                        <EyeOff size={18} color={colors.textMuted} />
                      ) : (
                        <Eye size={18} color={colors.textMuted} />
                      )}
                    </Pressable>
                  }
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                  secureTextEntry={!revealPassword}
                  onSubmitEditing={onSignIn}
                  returnKeyType="go"
                />
                <Button
                  text="Forgot password?"
                  textColor={colors.tint}
                  backgroundColor="transparent"
                  // The email already typed travels with it, so the reset screen
                  // does not ask for it a second time.
                  onPress={() =>
                    router.push({
                      pathname: "/reset-password",
                      params: { email: email.trim() },
                    })
                  }
                  paddingVertical={2}
                  paddingHorizontal={0}
                  style={styles.forgot}
                />
                <Button
                  text="Sign in"
                  textColor={colors.buttonText}
                  backgroundColor={colors.buttonBackground}
                  onPress={onSignIn}
                  loading={busy}
                  disabled={!email || !password}
                  paddingVertical={15}
                  borderRadius={14}
                  style={styles.primary}
                />
              </>
            )}
          </View>
        </ScrollView>

        {/* Outside the ScrollView so it stays on the bottom edge rather than
            trailing the form, and clear of the home indicator. */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 30 }]}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            {awaitingCode ? "Wrong account?" : "New to KirayaKit?"}
          </Text>
          <Button
            text={awaitingCode ? "Back to sign in" : "Create an account"}
            textColor={colors.tint}
            backgroundColor="transparent"
            onPress={awaitingCode ? onStartOver : () => router.push("/sign-up")}
            paddingVertical={2}
            paddingHorizontal={0}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 28,
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  heading: {
    fontSize: 31,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  subheading: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 21,
  },
  emphasis: {
    fontWeight: "700",
  },
  form: {
    gap: 16,
  },
  message: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    // Nudges the icon onto the first line's optical centre.
    paddingTop: 2,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  // Sits against the right edge, under the field it belongs to.
  forgot: {
    alignSelf: "flex-end",
    marginTop: -6,
  },
  // Layout only; Button draws the rest.
  primary: {
    minHeight: 52,
  },
  // A text link, so it takes only the width of its label.
  quiet: {
    alignSelf: "flex-start",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

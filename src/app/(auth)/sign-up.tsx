import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { clerkAttempt } from "@/libs/clerk-errors";
import { MIN_PASSWORD_LENGTH, isEmailAddress } from "@/utils/validate";
import { useSignUp } from "@clerk/expo";
import { router } from "expo-router";
import {
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  MailCheck,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Create an account: email and password, then the 6-digit code Clerk emails.
 *
 * Wears the same flat shell as sign-in — brand eyebrow, a heading, bare fields,
 * a footer pinned to the bottom edge — because the two screens link to each other
 * and a person moving between them should not feel the layout change.
 *
 * Every call goes through `clerkAttempt`, which turns both halves of the signals
 * API — the `{ error }` it resolves with and the guard clauses that still throw —
 * into one sentence for the screen.
 */
export default function SignUpScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  // The footer sits on the bottom edge, so it has to clear the home indicator
  // itself — there is no tab bar under this screen to do it.
  const insets = useSafeAreaInsets();
  const { signUp, fetchStatus } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  // Clerk emails a 6-digit code after the sign-up is created, so this screen
  // has two states: collect credentials, then collect the code.
  const [awaitingCode, setAwaitingCode] = useState(false);
  // Choosing a password is where a typo costs most, since there is no second
  // field to catch it — so the field can be unmasked and read back.
  const [revealPassword, setRevealPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Kept apart from `error` so "Code sent" is not drawn in the error colour.
  const [notice, setNotice] = useState<string | null>(null);
  const busy = fetchStatus === "fetching";

  async function onSignUp() {
    if (busy) return;
    setError(null);
    setNotice(null);

    // Both are checked here so a typo is answered as the button is pressed.
    // Clerk rejects them too, but a round trip later and in its own words — a
    // mistyped address comes back as "Identifier is invalid", which names a field
    // this screen does not have.
    if (!isEmailAddress(email)) {
      setError("That doesn't look like an email address.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }

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

    // Skipped once the code has already been accepted. A verification can only be
    // attempted once, and a second attempt is answered with "You need to send a
    // verification code before attempting to verify" — so pressing the button
    // again after finalize() failed, off Wi-Fi say, would ask for a new code
    // instead of just finishing.
    if (signUp.status !== "complete") {
      const notVerified = await clerkAttempt(() =>
        signUp.verifications.verifyEmailCode({ code: code.trim() }),
      );
      if (notVerified) {
        setError(notVerified);
        return;
      }
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
    setRevealPassword(false);
  }

  const subheadingStyle = [styles.subheading, { color: colors.textMuted }];

  // An icon carries each message instead of a tinted panel, so a rejected email
  // still reads as more than another line of grey text. Rendered in both branches
  // directly above the button that produced it, which is where the eye already is
  // when nothing happens.
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
          keyboard lands. This scroll view is the keyboard-aware one: it extends
          the scrollable area by the keyboard's height and scrolls the focused
          field back into sight on both platforms, which a KeyboardAvoidingView
          cannot do here — the app is edge-to-edge, so Android no longer resizes
          the window when the keyboard opens.
          `bottomOffset` leaves room under the caret for the submit button, so
          the thing you press next is never the thing that is covered. */}
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={90}
      >
        <View style={styles.header}>
          {/* The brand is a line of type rather than a mark, so it is set
              small and wide and left to sit above the heading. */}
          <Text style={[styles.eyebrow, { color: colors.tint }]}>
            KirayaKit
          </Text>
          {awaitingCode ? (
            <View style={styles.headingRow}>
              <MailCheck size={22} color={colors.text} />
              <Text style={[styles.heading, { color: colors.text }]}>
                Check your email
              </Text>
            </View>
          ) : (
            <Text style={[styles.heading, { color: colors.text }]}>
              Create account
            </Text>
          )}
          {awaitingCode ? (
            <Text style={subheadingStyle}>
              We sent a 6-digit code to{" "}
              <Text style={[styles.emphasis, { color: colors.text }]}>
                {email.trim()}
              </Text>
              .
            </Text>
          ) : (
            <Text style={subheadingStyle}>
              Start tracking your houses, tenants and rent.
            </Text>
          )}
        </View>

        {/* Groups the fields for spacing only — it draws nothing. */}
        <View style={styles.form}>
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
              {messages}
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
                placeholder="Choose a password"
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
                autoComplete="new-password"
                textContentType="newPassword"
                secureTextEntry={!revealPassword}
                onSubmitEditing={onSignUp}
                returnKeyType="go"
              />
              {messages}
              <Button
                text="Create account"
                textColor={colors.buttonText}
                backgroundColor={colors.buttonBackground}
                onPress={onSignUp}
                loading={busy}
                disabled={!email || !password}
                paddingVertical={15}
                borderRadius={14}
                style={styles.primary}
              />
            </>
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* Outside the scroll view so it stays on the bottom edge rather than
          trailing the form, and clear of the home indicator. The keyboard covers
          it while typing, which is the right trade: it is a link away from this
          screen, not part of the form. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 30 }]}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          {awaitingCode ? "Wrong email?" : "Already have an account?"}
        </Text>
        <Button
          text={awaitingCode ? "Start over" : "Sign in"}
          textColor={colors.tint}
          backgroundColor="transparent"
          // Replaced rather than pushed: sign-up and sign-in are two ways into
          // the same place, not a stack to walk back through.
          onPress={
            awaitingCode ? onStartOver : () => router.replace("/sign-in")
          }
          paddingVertical={2}
          paddingHorizontal={0}
        />
      </View>
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  screen: {
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

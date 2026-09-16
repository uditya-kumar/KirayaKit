import Button from "@/components/rentComponents/Button";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { clerkErrorMessage } from "@/libs/clerk-errors";
import { useSSO } from "@clerk/expo/experimental";
import { CircleAlert } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * The only way into the app: Google.
 *
 * There is no email and password, and so no sign-up screen, no emailed code and
 * no password to reset — Google has already proved the address, and a first-time
 * account is created by the same button that signs a returning one in. That is
 * the point of it: every emailed code this app used to send had to survive a spam
 * filter first, and the ones that didn't left an account created and unusable.
 *
 * Deliberately bare. With one button on it there is no hierarchy to build, so the
 * screen is a brand line, a greeting and the button, centred.
 */
export default function SignInScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  // The experimental hook rather than the one on `@clerk/expo`: that one drives
  // the legacy sign-in resource, while this one speaks to the same resources as
  // the rest of v4 and activates the session itself.
  const { startSSOFlow } = useSSO();
  // There is no fetchStatus to read here — the wait is Google's page being open,
  // which nothing in Clerk knows about, so the screen tracks it itself.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGoogle() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      // The hook finalizes the session itself, so a success flips
      // useAuth().isSignedIn and the root layout's guard does the navigating —
      // which is why nothing is done with the id beyond checking it arrived.
      const { createdSessionId, authSessionResult } = await startSSOFlow({
        strategy: "oauth_google",
      });
      // Backing out of Google's page is a choice, not a failure, so it is left
      // unreported — an error here would accuse them of something they meant.
      if (authSessionResult?.type !== "success") return;
      if (!createdSessionId) {
        setError("Google sign-in didn't finish. Try again.");
      }
    } catch (err) {
      // startSSOFlow throws rather than resolving to `{ error }`, the way the
      // signals API does, so the failure is caught rather than read off a result.
      setError(clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {/* The brand is a line of type rather than a mark, so it is set small and
            wide and left to sit above the greeting. */}
        <Text style={[styles.eyebrow, { color: colors.tint }]}>KirayaKit</Text>
        <Text style={[styles.heading, { color: colors.text }]}>Welcome</Text>
        <Text style={[styles.subheading, { color: colors.textMuted }]}>
          Your houses, tenants and rent, all in one place.
        </Text>
      </View>

      <View style={styles.actions}>
        {error ? (
          // An icon carries the message instead of a tinted panel, so a failure
          // reads as more than another line of grey text.
          <View style={styles.message}>
            <CircleAlert size={15} color={colors.error} />
            <Text style={[styles.messageText, { color: colors.error }]}>
              {error}
            </Text>
          </View>
        ) : null}
        {/* Filled, not bordered: it is the only thing on the screen to press. */}
        <Button
          text="Continue with Google"
          textColor={colors.buttonText}
          backgroundColor={colors.buttonBackground}
          onPress={onGoogle}
          loading={busy}
          paddingVertical={15}
          borderRadius={14}
          style={styles.primary}
        />
        {/* Said out loud because the screen offers no way to register, and
            without this a first-time landlord would look for one. */}
        <Text style={[styles.helper, { color: colors.textMuted }]}>
          First time here? Continuing with Google creates your account.
        </Text>
      </View>
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 36,
  },
  header: {
    gap: 6,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.4,
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
  actions: {
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
  helper: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    textAlign: "center",
  },
});

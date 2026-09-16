import Button from "@/components/rentComponents/Button";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { CloudOff } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

type StartupFailureProps = {
  /** Remounts Clerk — the root layout owns the provider, so it owns the retry. */
  onRetry: () => void;
  /** A retry is in flight: the startup timeout has to run again before we know. */
  retrying: boolean;
};

/**
 * Shown instead of the app when Clerk never answers on startup.
 *
 * The wording points at the network rather than at us because that is what it
 * almost always is, and one case in particular: a filtering DNS resolver that
 * sinkholes `clerk.<our domain>` while the rest of the internet still works, so
 * the phone looks online and the app alone is stuck. Nothing here can be fixed
 * from inside the app, which is why the only action offered is to try again.
 *
 * Drawn over everything rather than in the navigator: it is reached before Clerk
 * has loaded, and route access is not decided until then.
 */
export function StartupFailure({ onRetry, retrying }: StartupFailureProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CloudOff size={40} color={colors.textMuted} />
      <View style={styles.copy}>
        <Text style={[styles.heading, { color: colors.text }]}>
          Can&apos;t reach KirayaKit
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          The app has to sign you in before it can open, and that request is not
          getting through. Check your connection — and if you are on office,
          hotel or public Wi-Fi, try mobile data instead: some networks block the
          address we sign in through.
        </Text>
      </View>
      <Button
        text="Try again"
        textColor={colors.buttonText}
        backgroundColor={colors.buttonBackground}
        onPress={onRetry}
        loading={retrying}
        paddingVertical={15}
        borderRadius={14}
        style={styles.retry}
      />
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  screen: {
    // Absolute rather than flex: this sits beside the provider tree it is
    // reporting on, and must cover it whatever that tree happens to render.
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 22,
  },
  copy: {
    alignItems: "center",
    gap: 8,
  },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 21,
    textAlign: "center",
  },
  // Layout only; Button draws the rest.
  retry: {
    alignSelf: "stretch",
    minHeight: 52,
  },
});

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

/** Long enough for the nonce exchange on a slow connection, short enough to notice. */
const EXCHANGE_TIMEOUT_MS = 15000;

/**
 * Where Google's redirect lands: `kirayakit://sso-callback`.
 *
 * It exists because Android opens the sign-in page in a task of its own — the
 * default, and one `useSSO` gives us no way to change, since its
 * `authSessionOptions` only passes `showInRecents` through. Returning from that
 * task delivers the redirect as an intent, so expo-router routes it as well as
 * expo-web-browser resolving it, and without a file at this path the router
 * answers with +not-found on top of a sign-in that actually worked.
 *
 * So there is nothing to do here. `useSSO` on the sign-in screen holds the
 * `rotating_token_nonce` this URL carried and is already exchanging it; that
 * finishes whether or not the screen it was called from is still mounted, because
 * the session is activated on the Clerk client rather than in the component. This
 * screen only waits for the result and gets out of the way.
 */
export default function SSOCallbackScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { isSignedIn } = useAuth();
  // The exchange can fail — a revoked consent, a dropped connection — and the
  // sentence that would have said so is lost, because the screen holding it was
  // unmounted by the navigation that brought us here. Sitting on a spinner is
  // the worse of the two, so the wait is bounded and sign-in gets a second look.
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setGaveUp(true), EXCHANGE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  // The root layout's guards decide where "/" goes, so this hands the choice back
  // to the one place that owns it rather than naming a tab.
  if (isSignedIn) return <Redirect href="/" />;
  if (gaveUp) return <Redirect href="/sign-in" />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.tint} />
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

import Button from "@/components/rentComponents/Button";
import { useAppearance, useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { clerkErrorMessage } from "@/libs/clerk-errors";
import { queryClient } from "@/libs/query-client";
import { useAuth, useUser } from "@clerk/expo";
import * as WebBrowser from "expo-web-browser";
import { Code, ExternalLink, LogOut, Moon } from "lucide-react-native";
import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  type ViewStyle,
} from "react-native";

/** Where the About Dev row goes. */
const DEV_SITE = "https://udityakumar.dev";

/**
 * The letter or two an avatar falls back to: "Uditya Kumar Pandey" -> "UP".
 *
 * First and last rather than every word, because a middle name is not part of how
 * anyone initials themselves.
 */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words.at(0)?.at(0) ?? "";
  const last = words.length > 1 ? (words.at(-1)?.at(0) ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Profile — who is signed in, the app's own settings, and the way out.
 *
 * Sign out matters most: it is the only exit from the signed-in app, since the
 * guard in the root layout has no other one.
 */
export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { setScheme } = useAppearance();
  const { signOut } = useAuth();
  const { user } = useUser();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  /**
   * Signing out revokes the session with Clerk, so it is a request that can be
   * slow or fail. Both are worth saying: without the spinner the only exit from
   * the app looks broken while it waits, and a failure that says nothing leaves
   * someone believing they have signed out on a device where they have not.
   */
  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
      // The cache holds rows RLS returned for this session; the next person to
      // sign in on this device must not see them. After the await, because a
      // failed sign-out leaves that session live and its rows still valid.
      queryClient.clear();
    } catch (err) {
      // The screen stays mounted on failure — the guard only swaps it out once
      // Clerk reports the session gone.
      setSignOutError(clerkErrorMessage(err));
      setSigningOut(false);
    }
  }

  // Clerk holds both of these already — Google hands over the name and the picture
  // at sign-in and Clerk keeps them on the user — so neither is ours to store, and
  // the `users` table deliberately holds an id and timestamps and nothing else
  // (0001). The email is the fallback because an account made without a name still
  // has one of those.
  const name = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "";

  // Every panel on this screen sits on a background barely darker than its own
  // fill, so each one is outlined to read as a separate block; the widths live in
  // the layout styles, this only supplies the colours.
  const cardStyle: ViewStyle = {
    backgroundColor: colors.cardBackground,
    borderColor: colors.borderColor,
  };
  const rowLabelStyle = [styles.rowLabel, { color: colors.text }];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.identity}>
        <View
          style={[styles.avatar, { backgroundColor: colors.fillBackground }]}
          // Hidden from a screen reader, which the name below is not: the initials
          // in here only repeat it, and a picture of someone is not information to
          // anyone who cannot see it.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {/* Underneath rather than instead of the picture: imageUrl is a remote
              URL, and Clerk's own no-picture fallback is itself one, so an empty
              circle is what a cold start with no network would otherwise show. */}
          <Text style={[styles.initials, { color: colors.textMuted }]}>
            {initialsOf(name)}
          </Text>
          {user?.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              style={styles.avatarImage}
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>

        {/* One line: a long name belongs to the person, not to the layout, and
            wrapping it would push the settings down the screen. */}
        {name ? (
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
        ) : null}
      </View>

      <View style={[styles.card, cardStyle]}>
        <View style={styles.row}>
          <Moon size={18} color={colors.textMuted} />
          <Text style={rowLabelStyle}>Appearance</Text>
          {/* The switch is the whole control, so the row itself is not pressable:
              there is nowhere for it to lead. Flipping it fixes the scheme — the
              mock has no third position for "follow the device", and someone who
              reaches for this switch has stopped wanting that. */}
          <Switch
            accessibilityLabel="Dark appearance"
            value={colorScheme === "dark"}
            onValueChange={(dark) => setScheme(dark ? "dark" : "light")}
            trackColor={{ false: colors.borderColor, true: colors.tint }}
            thumbColor={colors.cardBackground}
            ios_backgroundColor={colors.borderColor}
          />
        </View>

        <View
          style={[styles.divider, { backgroundColor: colors.borderColor }]}
        />

        {/* A list row rather than a Button: it reads as a setting with a value,
            and the label alone would lose the address. */}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="About the developer, opens udityakumar.dev"
          onPress={() => WebBrowser.openBrowserAsync(DEV_SITE)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Code size={18} color={colors.textMuted} />
          <Text style={rowLabelStyle}>About Dev</Text>
          <Text style={[styles.rowValue, { color: colors.textMuted }]}>
            udityakumar.dev
          </Text>
          <ExternalLink size={16} color={colors.placeholder} />
        </Pressable>
      </View>

      {signOutError ? (
        <Text style={[styles.signOutError, { color: colors.error }]} selectable>
          {signOutError}
        </Text>
      ) : null}

      <Button
        text="Sign out"
        textColor={colors.error}
        backgroundColor={colors.cardBackground}
        borderColor={colors.error}
        icon={<LogOut size={18} color={colors.error} />}
        onPress={() => void onSignOut()}
        loading={signingOut}
        paddingVertical={14}
        borderRadius={20}
      />
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  identity: {
    alignItems: "center",
    gap: 12,
    paddingTop: 14,
    paddingBottom: 18,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  // Fills the circle it sits in and carries the same radius, so the picture is
  // round without the wrapper having to clip it — overflow and a border on one
  // node do not agree with each other on Android.
  avatarImage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 44,
  },
  initials: {
    fontSize: 30,
    fontWeight: "600",
  },
  name: {
    fontSize: 19,
    fontWeight: "600",
  },
  // Sits directly above the button it belongs to, so it needs no row of its own.
  signOutError: {
    fontSize: 13,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
  },
  // A height rather than vertical padding, so the two rows match: the Switch is
  // taller than the text beside it and taller again on Android than on iOS, and
  // padding alone would leave Appearance the deeper of the two on every device.
  // minHeight, not height, so the rows still grow at large font scales.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  // Takes the slack, which pins whatever follows it to the right edge.
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.6,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
});

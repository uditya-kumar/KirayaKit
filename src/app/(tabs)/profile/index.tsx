import Button from "@/components/rentComponents/Button";
import { useAppearance, useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useOwnerSummary } from "@/hooks/useOwnerSummary";
import { queryClient } from "@/libs/query-client";
import { formatAmount } from "@/utils/format";
import { useAuth } from "@clerk/expo";
import * as WebBrowser from "expo-web-browser";
import {
  Code,
  ExternalLink,
  House,
  IndianRupee,
  LogOut,
  Moon,
  Users,
} from "lucide-react-native";
import {
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
 * Profile — the portfolio in three numbers, the app's own settings, and the way
 * out.
 *
 * Sign out matters most: it is the only exit from the signed-in app, since the
 * guard in the root layout has no other one.
 */
export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { setScheme } = useAppearance();
  const { signOut } = useAuth();
  const { data: summary, error, refetch } = useOwnerSummary();

  // An em dash rather than a zero until the numbers arrive: "0 Properties" is a
  // claim, and a wrong one for anyone who has some.
  const unknown = "—";
  // The two counts share the top row; pending gets the row under them to itself,
  // because it is the number the landlord came to read and it is the one that can
  // run to six digits.
  const counts = [
    {
      key: "properties",
      icon: House,
      label: "Properties",
      value: summary ? String(summary.properties) : unknown,
    },
    {
      key: "tenants",
      icon: Users,
      label: "Tenants",
      value: summary ? String(summary.tenants) : unknown,
    },
  ];

  const cardStyle: ViewStyle = { backgroundColor: colors.cardBackground };
  const rowLabelStyle = [styles.rowLabel, { color: colors.text }];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.stats}>
        <View style={styles.countRow}>
          {counts.map(({ key, icon: Icon, label, value }) => (
            <View key={key} style={[styles.tile, styles.tileHalf, cardStyle]}>
              <Icon size={18} color={colors.textMuted} />
              <Text style={[styles.tileValue, { color: colors.text }]}>
                {value}
              </Text>
              <Text style={[styles.tileLabel, { color: colors.textMuted }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.tile, cardStyle]}>
          <IndianRupee size={18} color={colors.textMuted} />
          <Text style={[styles.tileValue, { color: colors.text }]}>
            {summary ? formatAmount(summary.pending) : unknown}
          </Text>
          <Text style={[styles.tileLabel, { color: colors.textMuted }]}>
            Pending
          </Text>
        </View>
      </View>

      {/* Only worth saying when the numbers are missing — the tiles already show
          the dashes, this says why and offers the way out. */}
      {error ? (
        <View style={styles.statsError}>
          <Text style={[styles.statsErrorText, { color: colors.textMuted }]}>
            Couldn&apos;t load your totals.
          </Text>
          <Button
            text="Try again"
            textColor={colors.tint}
            backgroundColor="transparent"
            onPress={() => refetch()}
            paddingVertical={0}
            paddingHorizontal={0}
          />
        </View>
      ) : null}

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

      <Button
        text="Sign out"
        textColor={colors.error}
        backgroundColor={colors.cardBackground}
        icon={<LogOut size={18} color={colors.error} />}
        onPress={async () => {
          await signOut();
          // The cache holds rows RLS returned for this session; the next person
          // to sign in on this device must not see them.
          queryClient.clear();
        }}
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
  stats: {
    gap: 10,
  },
  countRow: {
    flexDirection: "row",
    gap: 10,
  },
  tile: {
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  // Equal halves, whatever the numbers in them are.
  tileHalf: {
    flex: 1,
  },
  tileValue: {
    fontSize: 17,
    fontWeight: "700",
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  statsError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statsErrorText: {
    fontSize: 13,
  },
  card: {
    borderRadius: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
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

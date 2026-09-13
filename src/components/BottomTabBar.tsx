import { colors, pressedOpacity, radii } from "@/constants/design";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type TabItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  onPress?: () => void;
};

/**
 * The app's tab bar: the active tab gets a blue pill behind it, the rest stay
 * grey.
 *
 * Presentational on purpose. To use it with expo-router, pass it through
 * `<Tabs tabBar={...} />` and map the navigation state onto `activeKey`.
 */
export function BottomTabBar({
  tabs,
  activeKey,
}: {
  tabs: TabItem[];
  activeKey: string;
}) {
  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.key === activeKey;
        const tint = active ? colors.blue : colors.muted;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={tab.onPress}
            style={({ pressed }) => [
              styles.tab,
              active && styles.tabActive,
              pressed && styles.pressed,
            ]}
          >
            <Icon size={22} color={tint} />
            <Text
              style={[
                styles.label,
                { color: tint, fontWeight: active ? "600" : "500" },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignSelf: "stretch",
    height: 64,
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: colors.card,
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 6,
        blurRadius: 18,
        spreadDistance: -4,
        color: "#1C1C1E1F",
      },
    ],
  },
  tab: {
    alignItems: "center",
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.tab,
  },
  tabActive: {
    backgroundColor: colors.blueTint,
  },
  pressed: {
    opacity: pressedOpacity,
  },
  label: {
    fontSize: 10,
  },
});

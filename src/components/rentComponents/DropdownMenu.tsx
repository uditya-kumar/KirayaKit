import Colors from "@/constants/Colors";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

const colors = Colors.light;

export type MenuItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Renders the row in red, like "Delete House" in the mock. */
  destructive?: boolean;
  onPress?: () => void;
};

type DropdownMenuProps = {
  items: MenuItem[];
};

/**
 * The house actions menu. Note the ordering, which is unusual and deliberate:
 * the label comes first and the icon is pinned to the right edge.
 *
 * This is the surface only. Position it yourself — absolutely, inside a
 * transparent Modal, or in a popover — since where it hangs depends on what was
 * tapped.
 */
export function DropdownMenu({ items }: DropdownMenuProps) {
  return (
    <View style={styles.menu}>
      {items.map((item, index) => {
        const Icon = item.icon;
        const tint = item.destructive ? colors.error : colors.text;

        return (
          <View key={item.key}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              accessibilityRole="menuitem"
              onPress={item.onPress}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <Text style={[styles.label, { color: tint }]}>{item.label}</Text>
              <Icon size={19} color={tint} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    width: 220,
    padding: 6,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 18, color: "#0000001A" }],
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderColor,
  },
});

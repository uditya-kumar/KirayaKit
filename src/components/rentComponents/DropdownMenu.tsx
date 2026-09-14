import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import type { LucideIcon } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

export type MenuItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Renders the row in red, like "Delete House" in the mock. */
  destructive?: boolean;
  /** Dimmed and unpressable — an action whose screen is not built yet. */
  disabled?: boolean;
  onPress?: () => void;
};

type DropdownMenuProps = {
  items: MenuItem[];
  /** The trigger's contents — an icon in every case so far. */
  children: ReactNode;
  /** Read out for the trigger, e.g. "House actions". */
  accessibilityLabel: string;
  /** Layout only: where the trigger sits (margins, alignment). */
  style?: StyleProp<ViewStyle>;
};

/** Where the surface hangs: under the trigger, right edges aligned. */
type Anchor = { top: number; right: number };

/**
 * A trigger and the menu it opens. Note the row ordering, which is unusual and
 * deliberate: the label comes first and the icon is pinned to the right edge.
 *
 * Opening, closing and placement are the component's own business, so a caller
 * only says what the rows are and what the trigger looks like. Picking a row
 * closes the menu before running its `onPress`, and so does tapping anywhere
 * else or Android's back button.
 */
export function DropdownMenu({
  items,
  children,
  accessibilityLabel,
  style,
}: DropdownMenuProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { width: windowWidth } = useWindowDimensions();

  const triggerRef = useRef<View>(null);
  // Null is closed: the menu has nowhere to hang until the trigger has been
  // measured, so the two facts are one piece of state.
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  function open() {
    const trigger = triggerRef.current;
    if (!trigger) return;

    // Measured rather than assumed: the trigger may be a header button, a card
    // corner or anything else, and only the platform knows where it ended up.
    // The menu opens inside the callback, so it is never painted in the wrong
    // place first and then jumped across.
    trigger.measureInWindow((x, y, width, height) => {
      setAnchor({
        top: y + height + 6,
        right: Math.max(windowWidth - (x + width), 0),
      });
    });
  }

  function close() {
    setAnchor(null);
  }

  return (
    <>
      <Pressable
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: anchor !== null }}
        onPress={open}
        style={({ pressed }) => [style, { opacity: pressed ? 0.5 : 1 }]}
      >
        {children}
      </Pressable>

      {/* A transparent Modal rather than an absolute View beside the trigger: it
          is what lets the menu escape a header or a card that would clip it. */}
      <Modal
        visible={anchor !== null}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          style={styles.backdrop}
          onPress={close}
        />
        <View
          accessibilityRole="menu"
          style={[
            styles.menu,
            { top: anchor?.top ?? 0, right: anchor?.right ?? 0 },
            { backgroundColor: colors.cardBackground },
          ]}
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            const tint = item.destructive ? colors.error : colors.text;

            return (
              <View key={item.key}>
                {index > 0 ? (
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.borderColor },
                    ]}
                  />
                ) : null}
                <Pressable
                  accessibilityRole="menuitem"
                  accessibilityState={{ disabled: item.disabled }}
                  disabled={item.disabled}
                  onPress={() => {
                    close();
                    item.onPress?.();
                  }}
                  style={({ pressed }) => [
                    styles.item,
                    item.disabled ? styles.disabled : pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.label, { color: tint }]}>
                    {item.label}
                  </Text>
                  <Icon size={19} color={tint} />
                </Pressable>
              </View>
            );
          })}
        </View>
      </Modal>
    </>
  );
}

// Layout only — the colours are applied inline from the active scheme. The one
// exception is the shadow, which is an elevation rather than a colour.
const styles = StyleSheet.create({
  // Covers the whole screen, so a tap anywhere outside the menu closes it.
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  // `top` and `right` come from the measured trigger.
  menu: {
    position: "absolute",
    width: 220,
    padding: 6,
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
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
  },
  divider: {
    height: 1,
  },
});

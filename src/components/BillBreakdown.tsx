import { InfoTile } from "@/components/InfoTile";
import { colors, pressedOpacity, radii } from "@/constants/design";
import { formatRupees } from "@/lib/format";
import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * The current month's bill on the tenant detail screen, with the two actions
 * that hang off it.
 *
 * The panel itself has no gap: each row carries its own vertical padding, which
 * is how the mock gets the tighter spacing under the title.
 */
export function BillBreakdown({
  title = "Current Month",
  billed,
  paid,
  onEdit,
  onViewDetails,
}: {
  title?: string;
  billed: number | string;
  paid: number | string;
  onEdit?: () => void;
  onViewDetails?: () => void;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.amountRow}>
        <InfoTile label="Billed" value={formatRupees(billed)} />
        <InfoTile
          label="Paid"
          value={formatRupees(paid)}
          valueColor={colors.green}
        />
      </View>

      <View style={styles.actionRow}>
        <OutlineButton label="Edit" onPress={onEdit} />
        <OutlineButton label="View Details" onPress={onViewDetails} />
      </View>
    </View>
  );
}

function OutlineButton({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: radii.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  amountRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 7,
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.black,
  },
  pressed: {
    opacity: pressedOpacity,
  },
});

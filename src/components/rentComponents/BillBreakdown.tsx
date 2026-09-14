import Button from "@/components/rentComponents/Button";
import { InfoTile } from "@/components/rentComponents/InfoTile";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { formatRupees } from "@/utils/format";
import { StyleSheet, Text, View } from "react-native";

type BillBreakdownProps = {
  title?: string;
  billed: number | string;
  paid: number | string;
  /** Left out while the Edit Bill screen is unbuilt, which dims the button. */
  onEdit?: () => void;
  /** Left out while the Bill Details screen is unbuilt, which dims the button. */
  onViewDetails?: () => void;
};

/**
 * The current month's bill on the tenant detail screen, with the two actions
 * that hang off it.
 *
 * The panel itself has no gap: each row carries its own vertical padding, which
 * is how the mock gets the tighter spacing under the title. A button with no
 * handler is drawn dimmed rather than taking a tap and doing nothing.
 */
export function BillBreakdown({
  title = "Current Month",
  billed,
  paid,
  onEdit,
  onViewDetails,
}: BillBreakdownProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderColor,
        },
      ]}
    >
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>

      <View style={styles.amountRow}>
        <InfoTile label="Billed" value={formatRupees(billed)} />
        <InfoTile
          label="Paid"
          value={formatRupees(paid)}
          valueColor={colors.success}
        />
      </View>

      <View style={styles.actionRow}>
        <Button
          text="Edit"
          textColor={colors.text}
          backgroundColor="transparent"
          borderColor={colors.borderColor}
          onPress={onEdit}
          disabled={!onEdit}
          paddingVertical={14}
          style={styles.action}
        />
        <Button
          text="View Details"
          textColor={colors.text}
          backgroundColor="transparent"
          borderColor={colors.borderColor}
          onPress={onViewDetails}
          disabled={!onViewDetails}
          paddingVertical={14}
          style={styles.action}
        />
      </View>
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  panel: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
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
  // The pair splits the row; Button draws the border and the label.
  action: {
    flex: 1,
  },
});

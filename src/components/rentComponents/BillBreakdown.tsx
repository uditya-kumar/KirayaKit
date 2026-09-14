import Button from "@/components/rentComponents/Button";
import { InfoTile } from "@/components/rentComponents/InfoTile";
import Colors from "@/constants/Colors";
import { formatRupees } from "@/utils/format";
import { StyleSheet, Text, View } from "react-native";

const colors = Colors.light;

type BillBreakdownProps = {
  title?: string;
  billed: number | string;
  paid: number | string;
  onEdit?: () => void;
  onViewDetails?: () => void;
};

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
}: BillBreakdownProps) {
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
          paddingVertical={14}
          style={styles.action}
        />
        <Button
          text="View Details"
          textColor={colors.text}
          backgroundColor="transparent"
          borderColor={colors.borderColor}
          onPress={onViewDetails}
          paddingVertical={14}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderColor,
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
  // The pair splits the row; Button draws the border and the label.
  action: {
    flex: 1,
  },
});

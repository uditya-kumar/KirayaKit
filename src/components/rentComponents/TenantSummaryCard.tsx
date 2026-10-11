import Button from "@/components/rentComponents/Button";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { formatRupees } from "@/utils/format";
import { ChevronRight, Pencil, Plus } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

type TenantSummaryCardProps = {
  /** Signed, as `outstandingAmount` returns it: below zero the tenant is in credit. */
  outstanding: number;
  /** This month's bill, or 0 for both while the month has not been billed. */
  billed: number;
  paid: number;
  onEditBill: () => void;
  /** Left out when the month has not been billed, so there is nothing to open. */
  onViewDetails?: () => void;
  /** Left out when there is no recent bill to pay against. */
  onAddPayment?: () => void;
};

/**
 * What the tenant owes overall and where this month stands, in one card (design
 * node vzsDM). The two used to be separate cards; the pending figure is the
 * headline and this month is the detail under it, so they share a frame and a
 * divider instead.
 *
 * A button with no handler is drawn dimmed rather than taking a tap and doing
 * nothing.
 */
export function TenantSummaryCard({
  outstanding,
  billed,
  paid,
  onEditBill,
  onViewDetails,
  onAddPayment,
}: TenantSummaryCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  // Signed, so overpayment can be said rather than hidden: paying past the total
  // leaves a credit that the next bill takes off, and showing it as "-₹500
  // pending" in the same red as a debt would read as an alarm about the opposite
  // of what happened. Red is kept for money actually owed, which is also why a
  // settled ₹0 is not red either.
  const pendingLabel = outstanding < 0 ? "In credit" : "Total pending";
  const pendingAmount = formatRupees(Math.abs(outstanding));

  const statLabelStyle = [styles.statLabel, { color: colors.textMuted }];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderColor,
        },
      ]}
    >
      <View accessible accessibilityLabel={`${pendingLabel}, ${pendingAmount}`}>
        <Text style={[styles.pendingLabel, { color: colors.textMuted }]}>
          {pendingLabel}
        </Text>
        <Text
          style={[
            styles.pendingAmount,
            { color: outstanding > 0 ? colors.error : colors.success },
          ]}
        >
          {pendingAmount}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.borderColor }]} />

      <View style={styles.monthHead}>
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          Current Month
        </Text>
        <Button
          text="View Details"
          textColor={colors.tint}
          backgroundColor="transparent"
          trailingIcon={<ChevronRight size={14} color={colors.tint} />}
          onPress={onViewDetails}
          disabled={!onViewDetails}
          accessibilityLabel="View this month's bill"
          paddingVertical={0}
          paddingHorizontal={0}
        />
      </View>

      <View style={styles.stats}>
        <View
          style={[styles.stat, styles.billed]}
          accessible
          accessibilityLabel={`Billed, ${formatRupees(billed)}`}
        >
          <Text style={statLabelStyle}>Billed</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatRupees(billed)}
          </Text>
        </View>
        <View style={[styles.rule, { backgroundColor: colors.borderColor }]} />
        <View
          style={[styles.stat, styles.paid]}
          accessible
          accessibilityLabel={`Paid, ${formatRupees(paid)}`}
        >
          <Text style={statLabelStyle}>Paid</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {formatRupees(paid)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          text="Edit Bill"
          textColor={colors.text}
          backgroundColor="transparent"
          borderColor={colors.borderColor}
          icon={<Pencil size={18} color={colors.text} />}
          onPress={onEditBill}
          paddingVertical={14}
          borderRadius={14}
          style={styles.action}
        />
        <Button
          text="Add payment"
          textColor={colors.buttonText}
          backgroundColor={colors.buttonBackground}
          icon={<Plus size={18} color={colors.buttonText} />}
          onPress={onAddPayment}
          disabled={!onAddPayment}
          paddingVertical={14}
          borderRadius={14}
          style={styles.action}
        />
      </View>
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  card: {
    gap: 16,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  pendingLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  pendingAmount: {
    fontSize: 27,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  divider: {
    height: 1,
  },
  monthHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    flex: 1,
    gap: 4,
  },
  // The mock pads each figure away from the rule between them rather than
  // centring it, so both read from their left edge.
  billed: {
    paddingLeft: 4,
    paddingRight: 16,
  },
  paid: {
    paddingLeft: 20,
    paddingRight: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  rule: {
    width: 1,
    height: 52,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  // The pair splits the row; Button draws the border and the label.
  action: {
    flex: 1,
  },
});

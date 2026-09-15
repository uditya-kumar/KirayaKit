import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { formatAmount, formatBillMonth, formatRupees } from "@/utils/format";
import { CalendarDays } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

export type ReceiptLine = {
  label: string;
  /** Second line under the label, e.g. "129 units × ₹6". */
  sub?: string;
  amount: number | string;
};

type ReceiptCardProps = {
  tenantName: string;
  address?: string | null;
  /** `bills.bill_month` ("2026-02-01"), or a ready-made label. */
  month: string;
  lines: ReceiptLine[];
  total: number | string;
  /** The house's UPI ID, when it has one. */
  upiId?: string | null;
  /** The house's GPay number, when it has one. */
  gpayNumber?: string | null;
};

/**
 * The rent receipt, and the one thing in the app a tenant ever sees — it is
 * what gets shared. Lines are passed in rather than derived here, because which
 * ones exist depends on the bill: rent and electricity always, then whatever
 * `bill_charges` holds, then a previous balance when there is one.
 *
 * The pay-to block under the total is not in the mock (node pjKTB stops at the
 * total), but every receipt in `requirements/Rent Track.txt` ends with the UPI
 * ID and the GPay number — without them the bill says what is owed and gives no
 * way to settle it. It disappears entirely when the house has neither.
 */
export function ReceiptCard({
  tenantName,
  address,
  month,
  lines,
  total,
  upiId,
  gpayNumber,
}: ReceiptCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const rowLabelStyle = [styles.rowLabel, { color: colors.text }];
  const rowValueStyle = [styles.rowValue, { color: colors.text }];
  const rowSubStyle = [styles.rowSub, { color: colors.textMuted }];
  const payToValueStyle = [styles.payToValue, { color: colors.text }];

  // Only the handles the house actually has, so a house with neither drops the
  // block rather than printing an empty heading.
  const payTo = [
    upiId ? { label: "UPI ID", value: upiId } : null,
    gpayNumber ? { label: "GPay", value: gpayNumber } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
      <View
        style={[styles.header, { backgroundColor: colors.receiptBackground }]}
      >
        <Text style={[styles.receiptLabel, { color: colors.textMuted }]}>
          RENT RECEIPT
        </Text>
        <Text style={[styles.tenant, { color: colors.text }]}>
          {tenantName}
        </Text>
        {address ? (
          <Text style={[styles.address, { color: colors.textMuted }]}>
            {address}
          </Text>
        ) : null}
        <View
          style={[
            styles.monthPill,
            { backgroundColor: colors.receiptMonthBackground },
          ]}
        >
          <CalendarDays size={14} color={colors.receiptMonthIcon} />
          <Text style={[styles.monthText, { color: colors.text }]}>
            {formatBillMonth(month)}
          </Text>
        </View>
      </View>

      <View style={styles.items}>
        {/* Keyed by position: two extra charges can carry the same label, since
            nothing stops an owner typing "Water" twice on the bill form. */}
        {lines.map((line, index) => (
          <View key={index} style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={rowLabelStyle}>{line.label}</Text>
              {line.sub ? <Text style={rowSubStyle}>{line.sub}</Text> : null}
            </View>
            <Text style={rowValueStyle}>{formatRupees(line.amount)}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
          Total billed
        </Text>
        <View style={styles.totalValue}>
          <Text style={[styles.totalRupee, { color: colors.text }]}>
            ₹
          </Text>
          <Text style={[styles.totalAmount, { color: colors.text }]}>
            {formatAmount(total)}
          </Text>
        </View>
      </View>

      {payTo.length > 0 ? (
        <View style={[styles.payTo, { borderTopColor: colors.divider }]}>
          <Text style={[styles.payToLabel, { color: colors.textMuted }]}>
            PAY TO
          </Text>
          {payTo.map(({ label, value }) => (
            <View key={label} style={styles.payToRow}>
              <Text style={rowSubStyle}>{label}</Text>
              {/* Selectable so a tenant handed the phone can copy the handle
                  rather than reading it back digit by digit. */}
              <Text style={payToValueStyle} selectable>
                {value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    // Clips the mint header to the card's top corners.
    overflow: "hidden",
    boxShadow: [{ offsetX: 0, offsetY: 1, blurRadius: 10, color: "#0000000D" }],
  },
  header: {
    alignItems: "center",
    gap: 6,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 18,
    // The export rounds all four corners of the header; only the top two are
    // visible once it is clipped to the card, and the bottom two would leave
    // white notches against the body.
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  receiptLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  tenant: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  address: {
    fontSize: 13,
    fontWeight: "500",
  },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  monthText: {
    fontSize: 12,
    fontWeight: "600",
  },
  items: {
    paddingVertical: 8,
    paddingHorizontal: 22,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "400",
  },
  rowSub: {
    fontSize: 12,
    fontWeight: "400",
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.3,
  },
  divider: {
    height: 1,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 18,
    paddingHorizontal: 22,
    paddingBottom: 20,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  totalValue: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  totalRupee: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  // Its own hairline rather than the shared `divider` rectangle above the total,
  // so the block can be absent without leaving a rule at the bottom of the card.
  payTo: {
    gap: 6,
    paddingTop: 14,
    paddingHorizontal: 22,
    paddingBottom: 18,
    borderTopWidth: 1,
  },
  payToLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  payToRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  payToValue: {
    fontSize: 13,
    fontWeight: "500",
  },
});

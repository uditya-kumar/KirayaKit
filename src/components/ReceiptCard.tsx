import { colors, radii } from "@/constants/design";
import { formatAmount, formatBillMonth, formatRupees } from "@/lib/format";
import { CalendarDays } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

export type ReceiptLine = {
  label: string;
  /** Second line under the label, e.g. "129 units × ₹6". */
  sub?: string;
  amount: number | string;
};

/**
 * The rent receipt, and the one thing in the app a tenant ever sees — it is
 * what gets shared. Lines are passed in rather than derived here, because which
 * ones exist depends on the bill: rent and electricity always, then whatever
 * `bill_charges` holds, then a previous balance when there is one.
 */
export function ReceiptCard({
  tenantName,
  address,
  month,
  lines,
  total,
}: {
  tenantName: string;
  address?: string | null;
  /** `bills.bill_month` ("2026-02-01"), or a ready-made label. */
  month: string;
  lines: ReceiptLine[];
  total: number | string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.receiptLabel}>RENT RECEIPT</Text>
        <Text style={styles.tenant}>{tenantName}</Text>
        {address ? <Text style={styles.address}>{address}</Text> : null}
        <View style={styles.monthPill}>
          <CalendarDays size={14} color={colors.text} />
          <Text style={styles.monthText}>{formatBillMonth(month)}</Text>
        </View>
      </View>

      <View style={styles.items}>
        {lines.map((line) => (
          <View key={line.label} style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>{line.label}</Text>
              {line.sub ? <Text style={styles.rowSub}>{line.sub}</Text> : null}
            </View>
            <Text style={styles.rowValue}>{formatRupees(line.amount)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total billed</Text>
        <View style={styles.totalValue}>
          <Text style={styles.totalRupee}>₹</Text>
          <Text style={styles.totalAmount}>{formatAmount(total)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.panel,
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
    backgroundColor: colors.receiptHeader,
    // The export rounds all four corners of the header; only the top two are
    // visible once it is clipped to the card, and the bottom two would leave
    // white notches against the body.
    borderTopLeftRadius: radii.panel,
    borderTopRightRadius: radii.panel,
  },
  receiptLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.muted,
  },
  tenant: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colors.text,
  },
  address: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.muted,
  },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: colors.receiptMonthPill,
    borderRadius: 8,
  },
  monthText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
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
    color: colors.text,
  },
  rowSub: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.muted,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.3,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
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
    color: colors.muted,
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
    color: colors.muted,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: colors.text,
  },
});

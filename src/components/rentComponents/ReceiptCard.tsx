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
}: ReceiptCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const rowLabelStyle = [styles.rowLabel, { color: colors.text }];
  const rowValueStyle = [styles.rowValue, { color: colors.text }];
  const rowSubStyle = [styles.rowSub, { color: colors.textMuted }];

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
          <Text style={[styles.totalRupee, { color: colors.textMuted }]}>
            ₹
          </Text>
          <Text style={[styles.totalAmount, { color: colors.text }]}>
            {formatAmount(total)}
          </Text>
        </View>
      </View>
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
});

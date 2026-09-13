import { InfoTile } from "@/components/InfoTile";
import { colors, pressedOpacity, radii } from "@/constants/design";
import { formatBillMonth, formatRupees } from "@/lib/format";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

/** One month in a tenant's payment history. Fields line up with `bills`. */
export function PaymentCard({
  month,
  billed,
  paid,
  onPress,
}: {
  /** `bills.bill_month` ("2026-02-01"), or a ready-made label. */
  month: string;
  billed: number | string;
  paid: number | string;
  onPress?: () => void;
}) {
  const label = formatBillMonth(month);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.monthWrap}>
        <Text style={styles.month}>{label}</Text>
        <ChevronRight size={20} color={colors.muted} />
      </View>

      <View style={styles.infoRow}>
        <InfoTile label="Billed" value={formatRupees(billed)} />
        <InfoTile
          label="Paid"
          value={formatRupees(paid)}
          valueColor={colors.green}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 9,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: pressedOpacity,
  },
  monthWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  month: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  infoRow: {
    flexDirection: "row",
    gap: 6,
  },
});

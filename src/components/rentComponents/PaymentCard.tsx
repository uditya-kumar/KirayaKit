import Colors from "@/constants/Colors";
import { InfoTile } from "@/components/rentComponents/InfoTile";
import { formatBillMonth, formatRupees } from "@/libs/format";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

const colors = Colors.light;

type PaymentCardProps = {
  /** `bills.bill_month` ("2026-02-01"), or a ready-made label. */
  month: string;
  billed: number | string;
  paid: number | string;
  onPress?: () => void;
};

/** One month in a tenant's payment history. Fields line up with `bills`. */
export function PaymentCard({
  month,
  billed,
  paid,
  onPress,
}: PaymentCardProps) {
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
        <ChevronRight size={20} color={colors.textMuted} />
      </View>

      <View style={styles.infoRow}>
        <InfoTile label="Billed" value={formatRupees(billed)} />
        <InfoTile
          label="Paid"
          value={formatRupees(paid)}
          valueColor={colors.success}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 9,
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  pressed: {
    opacity: 0.8,
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

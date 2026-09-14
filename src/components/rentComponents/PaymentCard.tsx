import { InfoTile } from "@/components/rentComponents/InfoTile";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { formatBillMonth, formatRupees } from "@/utils/format";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const label = formatBillMonth(month);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderColor,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.monthWrap}>
        <Text style={[styles.month, { color: colors.text }]}>{label}</Text>
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

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  card: {
    gap: 9,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
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
  },
  infoRow: {
    flexDirection: "row",
    gap: 6,
  },
});

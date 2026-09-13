import { colors, radii } from "@/constants/design";
import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

/**
 * The small labelled stat box the mock reuses across four components —
 * "Monthly Rent / ₹5,000", "Total Pending / ₹6,374", "Billed", "Paid",
 * "Electricity". Identical styling everywhere, so it lives here once.
 *
 * The tiles are always laid out in pairs. Each takes `flex: 1`, so the row
 * around them only has to set its own gap (the mock uses 10 inside a tenant
 * card and 6 inside a payment card).
 */
export function InfoTile({
  label,
  value,
  valueColor = colors.text,
  icon: Icon,
}: {
  label: string;
  value: string;
  /** The mock tints only the value: red for pending, green for paid. */
  valueColor?: string;
  /** Leading glyph, used on the tenant profile ("house", "zap"). */
  icon?: LucideIcon;
}) {
  return (
    <View style={styles.tile}>
      {Icon ? <Icon size={16} color={colors.muted} /> : null}
      <View style={styles.textWrap}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.fill,
    borderRadius: radii.tile,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  textWrap: {
    gap: 1,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.muted,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
  },
});

import Button from "@/components/rentComponents/Button";
import { InfoTile } from "@/components/rentComponents/InfoTile";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { formatFloor, formatRate, formatRupees } from "@/utils/format";
import { House, Pencil, Zap } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

type TenantProfileProps = {
  name: string;
  /** 0-indexed, as stored: 0 renders as "Ground Floor". */
  floorNumber: number;
  houseName: string;
  monthlyRent: number | string;
  electricityRate: number | string;
  /** Left out while the Edit Tenant screen is unbuilt, which dims the pill. */
  onEdit?: () => void;
};

/**
 * Who the tenant is, at the top of their own screen. Design node MyCYg.
 *
 * The Edit pill is drawn dimmed when no handler is given rather than taking a tap
 * and doing nothing.
 */
export function TenantProfile({
  name,
  floorNumber,
  houseName,
  monthlyRent,
  electricityRate,
  onEdit,
}: TenantProfileProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

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
      <View style={styles.top}>
        <View style={styles.nameWrap}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.where, { color: colors.textMuted }]}>
            {formatFloor(floorNumber)} · {houseName}
          </Text>
        </View>

        <Button
          text="Edit"
          textColor={colors.tint}
          backgroundColor="transparent"
          icon={<Pencil size={14} color={colors.tint} />}
          onPress={onEdit}
          disabled={!onEdit}
          accessibilityLabel={`Edit ${name}`}
          paddingVertical={6}
          paddingHorizontal={12}
        />
      </View>

      <View style={styles.infoRow}>
        <InfoTile
          label="Monthly Rent"
          value={formatRupees(monthlyRent)}
          icon={House}
        />
        <InfoTile
          label="Electricity"
          value={formatRate(electricityRate)}
          icon={Zap}
        />
      </View>
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  card: {
    gap: 14,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  nameWrap: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  where: {
    fontSize: 13,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
  },
});

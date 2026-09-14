import { InfoTile } from "@/components/rentComponents/InfoTile";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { formatFloor, formatRupees } from "@/utils/format";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

type TenantCardProps = {
  name: string;
  /** 0-indexed, as stored: 0 renders as "Ground Floor". */
  floorNumber: number;
  monthlyRent: number | string;
  totalPending: number | string;
  onPress?: () => void;
};

/** A row on a house's tenant list. Fields line up with `v_tenant_list`. */
export function TenantCard({
  name,
  floorNumber,
  monthlyRent,
  totalPending,
  onPress,
}: TenantCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderColor,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        <View style={styles.nameWrap}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.floor, { color: colors.textMuted }]}>
            {formatFloor(floorNumber)}
          </Text>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </View>

      <View style={styles.infoRow}>
        <InfoTile label="Monthly Rent" value={formatRupees(monthlyRent)} />
        {/* The mock draws the pending amount red even when it is ₹0. */}
        <InfoTile
          label="Total Pending"
          value={formatRupees(totalPending)}
          valueColor={colors.error}
        />
      </View>
    </Pressable>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nameWrap: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
  },
  floor: {
    fontSize: 13,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
  },
});

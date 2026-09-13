import { InfoTile } from "@/components/InfoTile";
import { colors, pressedOpacity, radii } from "@/constants/design";
import { formatFloor, formatRate, formatRupees } from "@/lib/format";
import { House, Pencil, Zap } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * Header panel on the tenant detail screen: who they are, where they live, and
 * the two numbers every bill is derived from.
 */
export function Profile({
  name,
  floorNumber,
  houseName,
  monthlyRent,
  electricityRate,
  onEdit,
}: {
  name: string;
  /** 0-indexed, as stored. */
  floorNumber: number;
  houseName?: string | null;
  monthlyRent: number | string;
  electricityRate: number | string;
  onEdit?: () => void;
}) {
  const floor = formatFloor(floorNumber);

  return (
    <View style={styles.panel}>
      <View style={styles.top}>
        <View style={styles.nameWrap}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.floor}>
            {houseName ? `${floor} · ${houseName}` : floor}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit tenant"
          onPress={onEdit}
          style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
        >
          <Pencil size={14} color={colors.blue} />
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
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

const styles = StyleSheet.create({
  panel: {
    gap: 14,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderRadius: radii.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
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
    color: colors.text,
  },
  floor: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.muted,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.tile,
  },
  editText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.blue,
  },
  pressed: {
    opacity: pressedOpacity,
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
  },
});

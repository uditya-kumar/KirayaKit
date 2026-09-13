import Button from "@/components/rentComponents/Button";
import { InfoTile } from "@/components/rentComponents/InfoTile";
import Colors from "@/constants/Colors";
import { formatFloor, formatRate, formatRupees } from "@/libs/format";
import { House, Pencil, Zap } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

const colors = Colors.light;

type ProfileProps = {
  name: string;
  /** 0-indexed, as stored. */
  floorNumber: number;
  houseName?: string | null;
  monthlyRent: number | string;
  electricityRate: number | string;
  onEdit?: () => void;
};

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
}: ProfileProps) {
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

        <Button
          text="Edit"
          accessibilityLabel="Edit tenant"
          textColor={colors.tint}
          backgroundColor="transparent"
          icon={<Pencil size={14} color={colors.tint} />}
          onPress={onEdit}
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

const styles = StyleSheet.create({
  panel: {
    gap: 14,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderColor,
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
    color: colors.textMuted,
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
  },
});

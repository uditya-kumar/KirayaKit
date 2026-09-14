import { InfoTile } from "@/components/rentComponents/InfoTile";
import Colors from "@/constants/Colors";
import { formatFloor, formatRupees } from "@/utils/format";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

const colors = Colors.light;

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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={styles.nameWrap}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.floor}>{formatFloor(floorNumber)}</Text>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </View>

      <View style={styles.infoRow}>
        <InfoTile label="Monthly Rent" value={formatRupees(monthlyRent)} />
        <InfoTile
          label="Total Pending"
          value={formatRupees(totalPending)}
          valueColor={colors.error}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderColor,
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

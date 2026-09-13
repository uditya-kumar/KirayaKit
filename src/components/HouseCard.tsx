import { colors, pressedOpacity, radii } from "@/constants/design";
import { ChevronRight, MapPin, Users } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

/** A row on the houses list. Fields line up with `v_house_list`. */
export function HouseCard({
  name,
  address,
  tenantCount,
  onPress,
  onLongPress,
}: {
  name: string;
  /** Optional in the schema; the row is dropped when there is no address. */
  address?: string | null;
  tenantCount: number;
  onPress?: () => void;
  /** The mock opens its house menu from a long press on the card. */
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>

        {address ? (
          <View style={styles.addressRow}>
            <MapPin size={15} color={colors.muted} />
            <Text style={styles.address} numberOfLines={1}>
              {address}
            </Text>
          </View>
        ) : null}

        <View style={styles.pill}>
          <Users size={13} color={colors.muted} />
          <Text style={styles.pillText}>
            {tenantCount === 1 ? "1 Tenant" : `${tenantCount} Tenants`}
          </Text>
        </View>
      </View>

      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: pressedOpacity,
  },
  // Takes the slack so the chevron sits against the right edge.
  info: {
    flex: 1,
    alignItems: "flex-start",
    gap: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  address: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "500",
    color: colors.muted,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
    backgroundColor: colors.pill,
    borderRadius: radii.pill,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.muted,
  },
});

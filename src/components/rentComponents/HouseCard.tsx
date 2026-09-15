import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { ChevronRight, MapPin, Users } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

type HouseCardProps = {
  name: string;
  /** Optional in the schema; the row is dropped when there is no address. */
  address?: string | null;
  tenantCount: number;
  onPress?: () => void;
};

/** A row on the houses list. Fields line up with `v_house_list`. */
export function HouseCard({
  name,
  address,
  tenantCount,
  onPress,
}: HouseCardProps) {
  // The palette follows the device setting, so anything coloured is applied
  // inline; the StyleSheet below keeps only the layout.
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
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>

        {address ? (
          <View style={styles.addressRow}>
            <MapPin size={15} color={colors.textMuted} />
            <Text
              style={[styles.address, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {address}
            </Text>
          </View>
        ) : null}

        <View style={[styles.pill, { backgroundColor: colors.fillBackground }]}>
          <Users size={13} color={colors.textMuted} />
          <Text style={[styles.pillText, { color: colors.textMuted }]}>
            {tenantCount === 1 ? "1 tenant" : `${tenantCount} tenants`}
          </Text>
        </View>
      </View>

      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.8,
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
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 9,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "500",
  },
});

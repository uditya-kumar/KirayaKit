import { colors, pressedOpacity, radii } from "@/constants/design";
import { Minus, Tag } from "lucide-react-native";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

/**
 * One editable extra charge on a bill — "Water charge / ₹600" — with the button
 * that removes it. Rows like these map to `bill_charges`.
 *
 * Both fields are controlled strings: the amount stays text while it is being
 * typed so a half-entered "12." does not get mangled, and the screen converts
 * it on submit.
 */
export function ChargeRow({
  label,
  amount,
  onChangeLabel,
  onChangeAmount,
  onRemove,
  labelPlaceholder = "Charge name",
}: {
  label: string;
  amount: string;
  onChangeLabel: (label: string) => void;
  onChangeAmount: (amount: string) => void;
  onRemove?: () => void;
  labelPlaceholder?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.labelBox}>
        <Tag size={16} color={colors.muted} />
        <TextInput
          accessibilityLabel="Charge name"
          value={label}
          onChangeText={onChangeLabel}
          placeholder={labelPlaceholder}
          placeholderTextColor={colors.placeholder}
          style={styles.input}
        />
      </View>

      <View style={styles.amountBox}>
        <Text style={styles.rupee}>₹</Text>
        <TextInput
          accessibilityLabel="Charge amount"
          value={amount}
          onChangeText={onChangeAmount}
          placeholder="0"
          placeholderTextColor={colors.placeholder}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label || "charge"}`}
        onPress={onRemove}
        style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
      >
        <Minus size={18} color={colors.red} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  labelBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderRadius: radii.tile,
  },
  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 120,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderRadius: radii.tile,
  },
  rupee: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.muted,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
    color: colors.text,
    padding: 0,
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.redTint,
    borderRadius: 16,
  },
  pressed: {
    opacity: pressedOpacity,
  },
});

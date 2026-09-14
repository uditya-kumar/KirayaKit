import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { Minus, Tag } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

type ChargeRowProps = {
  label: string;
  amount: string;
  onChangeLabel: (label: string) => void;
  onChangeAmount: (amount: string) => void;
  onRemove?: () => void;
  labelPlaceholder?: string;
};

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
}: ChargeRowProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View style={styles.row}>
      <CustomTextInput
        accessibilityLabel="Charge name"
        value={label}
        onChangeText={onChangeLabel}
        placeholder={labelPlaceholder}
        icon={<Tag size={16} color={colors.textMuted} />}
        style={styles.labelField}
      />

      <CustomTextInput
        accessibilityLabel="Charge amount"
        value={amount}
        onChangeText={onChangeAmount}
        placeholder="0"
        keyboardType="numeric"
        icon={
          <Text style={[styles.rupee, { color: colors.textMuted }]}>₹</Text>
        }
        style={styles.amountField}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label || "charge"}`}
        onPress={onRemove}
        style={({ pressed }) => [
          styles.removeBtn,
          { backgroundColor: colors.errorBackground },
          pressed && styles.pressed,
        ]}
      >
        <Minus size={18} color={colors.error} />
      </Pressable>
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  labelField: {
    flex: 1,
  },
  amountField: {
    width: 120,
  },
  rupee: {
    fontSize: 15,
    fontWeight: "500",
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  pressed: {
    opacity: 0.8,
  },
});

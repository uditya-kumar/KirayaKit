import Colors from "@/constants/Colors";
import type { LucideIcon } from "lucide-react-native";
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

const colors = Colors.light;

type FormFieldProps = TextInputProps & {
  label: string;
  /** Leading glyph; the mock shows "type" as a stand-in. */
  icon?: LucideIcon;
};

/**
 * Labelled text input used by every create/edit form.
 *
 * The input box has no border — in the mock it is a white card on the tinted
 * screen background, which is what separates it. Put these on `colors.fillBackground`,
 * not on white.
 */
export function FormField({
  label,
  icon: Icon,
  style,
  ...inputProps
}: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputBox}>
        {Icon ? <Icon size={18} color={colors.textMuted} /> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.placeholder}
          {...inputProps}
          style={[styles.input, style]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
    color: colors.text,
    // The box supplies the padding; TextInput adds its own on Android.
    padding: 0,
  },
});

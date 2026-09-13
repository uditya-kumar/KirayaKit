import Button from "@/components/rentComponents/Button";
import Colors from "@/constants/Colors";
import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

const colors = Colors.light;

const CONFIRM_WORD = "delete";

type DeleteHouseDialogProps = {
  houseName: string;
  onDelete: () => void;
  onCancel: () => void;
};

/**
 * Confirmation for deleting a house. Deleting one cascades to its tenants,
 * bills and charges, which is why the mock makes you type the word out.
 *
 * The typed word is held internally — a half-finished confirmation is not state
 * any screen needs. Delete stays disabled until it matches, case-insensitively.
 *
 * This is the card only; present it inside a transparent Modal over a scrim.
 */
export function DeleteHouseDialog({
  houseName,
  onDelete,
  onCancel,
}: DeleteHouseDialogProps) {
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim().toLowerCase() === CONFIRM_WORD;

  return (
    <View style={styles.dialog}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Delete this house?</Text>
        <Text style={styles.message}>
          This will permanently remove {houseName} and all its tenants. This
          action cannot be undone.
        </Text>
      </View>

      <View style={styles.gap} />

      <View style={styles.confirmWrap}>
        <View style={styles.hint}>
          <Text style={styles.hintText}>Type</Text>
          <Text style={styles.hintWord}>{CONFIRM_WORD}</Text>
          <Text style={styles.hintText}>to confirm</Text>
        </View>
        <View style={styles.inputBox}>
          <TextInput
            accessibilityLabel={`Type ${CONFIRM_WORD} to confirm`}
            value={typed}
            onChangeText={setTyped}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </View>
      </View>

      <Button
        text="Delete House"
        textColor={colors.buttonText}
        backgroundColor={colors.error}
        icon={<Trash2 size={18} color={colors.buttonText} />}
        onPress={onDelete}
        disabled={!confirmed}
        paddingVertical={14}
        style={styles.action}
      />

      <Button
        text="Cancel"
        textColor={colors.text}
        backgroundColor="transparent"
        borderColor={colors.borderColor}
        onPress={onCancel}
        paddingVertical={14}
        style={styles.action}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dialog: {
    width: 320,
    alignItems: "center",
    gap: 15,
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 20,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    boxShadow: [
      { offsetX: 0, offsetY: 12, blurRadius: 32, color: "#00000026" },
    ],
  },
  textWrap: {
    alignSelf: "stretch",
    gap: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
  },
  message: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    color: colors.textMuted,
  },
  // The mock separates the copy from the confirmation with a fixed 10pt spacer
  // rather than a larger gap, so the two text blocks stay grouped.
  gap: {
    height: 10,
  },
  confirmWrap: {
    alignSelf: "stretch",
    gap: 7,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  hintText: {
    fontSize: 13,
    fontWeight: "400",
    color: colors.textMuted,
  },
  hintWord: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  inputBox: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: colors.fillBackground,
    borderRadius: 14,
  },
  input: {
    fontSize: 15,
    fontWeight: "400",
    color: colors.text,
    padding: 0,
  },
  // The dialog centres its children; both buttons span it instead.
  action: {
    alignSelf: "stretch",
  },
});

import {
  colors,
  disabledOpacity,
  pressedOpacity,
  radii,
} from "@/constants/design";
import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const CONFIRM_WORD = "delete";

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
}: {
  houseName: string;
  onDelete: () => void;
  onCancel: () => void;
}) {
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

      <Pressable
        accessibilityRole="button"
        onPress={onDelete}
        disabled={!confirmed}
        style={({ pressed }) => [
          styles.deleteBtn,
          { opacity: !confirmed ? disabledOpacity : pressed ? pressedOpacity : 1 },
        ]}
      >
        <Trash2 size={18} color={colors.white} />
        <Text style={[styles.buttonLabel, styles.deleteLabel]}>
          Delete House
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onCancel}
        style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>Cancel</Text>
      </Pressable>
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
    backgroundColor: colors.card,
    borderRadius: radii.dialog,
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
    color: colors.muted,
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
    color: colors.muted,
  },
  hintWord: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  inputBox: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: colors.fill,
    borderRadius: radii.tile,
  },
  input: {
    fontSize: 15,
    fontWeight: "400",
    color: colors.text,
    padding: 0,
  },
  deleteBtn: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    backgroundColor: colors.red,
    borderRadius: radii.button,
  },
  cancelBtn: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.black,
  },
  deleteLabel: {
    color: colors.white,
  },
  pressed: {
    opacity: pressedOpacity,
  },
});

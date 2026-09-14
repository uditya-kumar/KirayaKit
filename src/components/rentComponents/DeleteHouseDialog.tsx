import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

const CONFIRM_WORD = "delete";

type DeleteHouseDialogProps = {
  visible: boolean;
  houseName: string;
  onDelete: () => void;
  onCancel: () => void;
  /** The delete is in flight: the button spins and both actions stop taking taps. */
  deleting?: boolean;
  /** Shown under the confirmation when the delete comes back rejected. */
  errorMessage?: string | null;
};

/**
 * Confirmation for deleting a house. Deleting one takes its tenants, bills and
 * charges with it, which is why the mock makes you type the word out.
 *
 * The dialog presents itself: a caller passes `visible` and owns the delete, not
 * the scrim or the keyboard. The scrim takes no taps on purpose — a destructive
 * confirmation should only go away through Cancel, not a stray touch beside the
 * card.
 */
export function DeleteHouseDialog({
  visible,
  houseName,
  onDelete,
  onCancel,
  deleting = false,
  errorMessage,
}: DeleteHouseDialogProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
      >
        {/* Its own component so that the word typed into a cancelled dialog
            leaves with it — a closed Modal renders nothing, so the state goes. */}
        <ConfirmCard
          houseName={houseName}
          onDelete={onDelete}
          onCancel={onCancel}
          deleting={deleting}
          errorMessage={errorMessage}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

type ConfirmCardProps = Omit<DeleteHouseDialogProps, "visible">;

/**
 * The card itself. The typed word is held here — a half-finished confirmation is
 * not state any screen needs. Delete stays disabled until it matches, ignoring
 * case and surrounding space.
 */
function ConfirmCard({
  houseName,
  onDelete,
  onCancel,
  deleting = false,
  errorMessage,
}: ConfirmCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [typed, setTyped] = useState("");
  const confirmed = typed.trim().toLowerCase() === CONFIRM_WORD;

  const hintTextStyle = [styles.hintText, { color: colors.textMuted }];

  return (
    <View style={[styles.dialog, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.text }]}>
          Delete this house?
        </Text>
        <Text style={[styles.message, { color: colors.textMuted }]}>
          This will permanently remove {houseName} and all its tenants. This
          action cannot be undone.
        </Text>
      </View>

      <View style={styles.gap} />

      <View style={styles.confirmWrap}>
        <View style={styles.hint}>
          <Text style={hintTextStyle}>Type</Text>
          <Text style={[styles.hintWord, { color: colors.text }]}>
            {CONFIRM_WORD}
          </Text>
          <Text style={hintTextStyle}>to confirm</Text>
        </View>
        <CustomTextInput
          accessibilityLabel={`Type ${CONFIRM_WORD} to confirm`}
          value={typed}
          onChangeText={setTyped}
          placeholder={CONFIRM_WORD}
          autoCapitalize="none"
          editable={!deleting}
        />
        {/* The mock has no error state; a rejected delete has to say so
            somewhere, and the dialog is still covering the screen. */}
        {errorMessage ? (
          <Text style={[styles.error, { color: colors.error }]}>
            {errorMessage}
          </Text>
        ) : null}
      </View>

      <Button
        text="Delete House"
        textColor={colors.buttonText}
        backgroundColor={colors.error}
        icon={<Trash2 size={18} color={colors.buttonText} />}
        onPress={onDelete}
        disabled={!confirmed}
        loading={deleting}
        paddingVertical={14}
        style={styles.action}
      />

      <Button
        text="Cancel"
        textColor={colors.text}
        backgroundColor="transparent"
        borderColor={colors.borderColor}
        onPress={onCancel}
        disabled={deleting}
        paddingVertical={14}
        style={styles.action}
      />
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme. The one
// exception is the shadow, which is an elevation rather than a colour.
const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    width: 320,
    alignItems: "center",
    gap: 15,
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 20,
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
  },
  message: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
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
  },
  hintWord: {
    fontSize: 13,
    fontWeight: "700",
  },
  error: {
    fontSize: 13,
  },
  // The dialog centres its children; both buttons span it instead.
  action: {
    alignSelf: "stretch",
  },
});

import Button from "@/components/rentComponents/Button";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { formatDay } from "@/utils/format";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { X } from "lucide-react-native";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type DateFieldProps = {
  /** The chosen day, or null while the field is empty. */
  value: Date | null;
  /** Called with the picked day, or with null when the field is cleared. */
  onChange: (value: Date | null) => void;
  /** Sizes and places the whole field, label included — `flex`, `width`, margins. */
  style?: StyleProp<ViewStyle>;
  /** Omit for a bare field, as CustomTextInput does. */
  labelText?: string;
  /** Drawn inside the box, ahead of the date: a calendar glyph. */
  icon?: ReactNode;
  placeholder?: string;
};

/**
 * Every date in the app's forms. It reads like `CustomTextInput` — same box, same
 * label — but the box is a button: tapping it opens the platform's own date
 * picker, so a day can only ever be a real one and nobody has to work out which
 * of the day and the month comes first.
 *
 * Dates come in and out as `Date` objects; turning one into what a `date` column
 * stores is the screen's job, since only it knows which column that is.
 *
 * The picker is `@react-native-community/datetimepicker` used directly rather
 * than through react-native-modal-datetime-picker, whose latest release still
 * drives it with the deprecated `onChange` prop and so warns on every mount.
 */
export function DateField({
  value,
  onChange,
  style,
  labelText,
  icon,
  placeholder = "DD/MM/YYYY",
}: DateFieldProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  // Only iOS needs state: its picker is a view, so it lives in a sheet of ours
  // and nothing is committed until Done — a non-null draft is what "the sheet is
  // open" means. Android's is a dialog of its own, opened imperatively below.
  const [draft, setDraft] = useState<Date | null>(null);

  function openPicker() {
    if (Platform.OS === "ios") {
      setDraft(value ?? new Date());
      return;
    }

    DateTimePickerAndroid.open({
      // The dialog has to open on some day, and today is the least surprising
      // one to land on when there is nothing in the field yet.
      value: value ?? new Date(),
      mode: "date",
      onValueChange: (_event, picked) => onChange(picked),
    });
  }

  return (
    // `style` goes on the outer view, not the box: a field in a row needs its
    // `flex` or `width` to apply to the label as well.
    <View style={[styles.container, style]}>
      {labelText ? (
        <Text style={[styles.label, { color: colors.text }]}>{labelText}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labelText ?? placeholder}
        accessibilityValue={{ text: value ? formatDay(value) : "Not set" }}
        onPress={openPicker}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.borderColor,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        {icon}
        <Text
          numberOfLines={1}
          style={[
            styles.value,
            { color: value ? colors.text : colors.placeholder },
          ]}
        >
          {value ? formatDay(value) : placeholder}
        </Text>
        {/* A date is usually optional, and neither picker has a way to answer
            "none" — so emptying the field again needs its own control. */}
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${labelText ?? "date"}`}
            onPress={() => onChange(null)}
            hitSlop={10}
          >
            <X size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </Pressable>

      <Modal
        visible={draft !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDraft(null)}
      >
        {/* A tap beside the sheet abandons the draft, the same way the bill
            form's month picker closes. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close date picker"
          onPress={() => setDraft(null)}
          style={[styles.scrim, { backgroundColor: colors.scrim }]}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.cardBackground }]}
          >
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {labelText ?? "Choose a date"}
            </Text>

            {draft ? (
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                themeVariant={colorScheme}
                onValueChange={(_event, picked) => setDraft(picked)}
              />
            ) : null}

            <View style={styles.sheetActions}>
              <Button
                text="Cancel"
                textColor={colors.text}
                backgroundColor="transparent"
                borderColor={colors.borderColor}
                onPress={() => setDraft(null)}
                paddingVertical={12}
                style={styles.sheetAction}
              />
              <Button
                text="Done"
                textColor={colors.buttonText}
                backgroundColor={colors.buttonBackground}
                onPress={() => {
                  onChange(draft);
                  setDraft(null);
                }}
                paddingVertical={12}
                style={styles.sheetAction}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme. The box
// matches CustomTextInput's on purpose: the two sit side by side in a form row.
const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 45,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 15,
  },
  value: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
  },
  scrim: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    width: 320,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    boxShadow: [
      { offsetX: 0, offsetY: 12, blurRadius: 32, color: "#00000026" },
    ],
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    paddingBottom: 8,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 6,
  },
  sheetAction: {
    flex: 1,
  },
});

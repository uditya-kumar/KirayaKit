import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
  formatBillMonth,
  formatBillMonthShort,
  formatRupees,
} from "@/utils/format";
import { fieldAmount, withoutLeadingZeros } from "@/utils/validate";
import { IndianRupee, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** A month the sheet offers, whether or not it has a bill to pay against. */
export type PaymentMonth = {
  /** First of the month, as the bill stores it ("2026-10-01"). */
  month: string;
  /**
   * The month's bill, or null when it has not been raised yet — which is what
   * greys its segment out: there is nothing for the money to land on.
   */
  bill: { billed: number; paid: number } | null;
};

type AddPaymentSheetProps = {
  visible: boolean;
  /** Oldest first, so the segments read left to right in time. */
  months: PaymentMonth[];
  /** The `month` of the entry in `months` being paid against; it must have a bill. */
  month: string;
  onChangeMonth: (month: string) => void;
  /** The field's text as typed; the caller checks it and owns the save. */
  onSave: (amountPaid: string) => void;
  onClose: () => void;
  /** Spins Save: the write is in flight, or the month it needs is still loading. */
  saving?: boolean;
  errorMessage?: string | null;
};

/**
 * Add payment, from the tenant detail screen (design node N243ZI): pick a month,
 * set what has been paid on it, save.
 *
 * It is the bill form's "Paid this month" without the rest of the form, so the
 * figure means the same thing there and here — the month's paid amount in full,
 * not an amount to add on top. The line under the field works out what that
 * leaves owing as it is typed, so nobody has to do the sum to check it.
 */
export function AddPaymentSheet({
  visible,
  months,
  month,
  onChangeMonth,
  onSave,
  onClose,
  saving = false,
  errorMessage,
}: AddPaymentSheetProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const selected = months.find((option) => option.month === month);

  return (
    // Both translucent flags are what let the keyboard be measured inside a
    // modal, which has its own window on Android; KeyboardProvider in the root
    // layout is mounted with the matching pair.
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* keyboard-controller's own, not React Native's: the app is edge-to-edge,
          so Android never resizes the window and RN's does nothing there — the
          sheet sat under the keyboard. This one lifts it on both platforms. */}
      <KeyboardAvoidingView
        behavior="padding"
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
      >
        {/* Unlike the delete dialog, a stray tap beside this sheet only loses a
            number nobody has saved, so the scrim is allowed to close it. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close add payment"
          style={StyleSheet.absoluteFill}
          onPress={saving ? undefined : onClose}
        />
        {selected?.bill ? (
          // Keyed by month so switching segments re-seeds the field from that
          // month's bill, rather than carrying one month's figure into another.
          <SheetBody
            key={selected.month}
            months={months}
            selected={selected}
            bill={selected.bill}
            onChangeMonth={onChangeMonth}
            onSave={onSave}
            onClose={onClose}
            saving={saving}
            errorMessage={errorMessage}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

type SheetBodyProps = Omit<AddPaymentSheetProps, "visible" | "month"> & {
  selected: PaymentMonth;
  /** `selected.bill`, narrowed by the caller so the fields can rely on it. */
  bill: { billed: number; paid: number };
};

/** The sheet itself; the typed amount is held here and goes when it closes. */
function SheetBody({
  months,
  selected,
  bill,
  onChangeMonth,
  onSave,
  onClose,
  saving = false,
  errorMessage,
}: SheetBodyProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  // Blank rather than "0" when nothing has been paid, as on the bill form: the
  // placeholder already shows 0, and the first digit typed is then the figure.
  const [amountPaid, setAmountPaid] = useState(
    bill.paid === 0 ? "" : String(bill.paid),
  );

  const monthName = formatBillMonth(selected.month).split(" ")[0];
  const typed = fieldAmount(amountPaid);
  const left = Math.round((bill.billed - typed) * 100) / 100;

  // Only said once the field holds a number; a half-typed "12." still parses,
  // anything worse is for the save to refuse.
  const hint = !Number.isFinite(typed)
    ? null
    : left > 0
      ? `${formatRupees(left)} left on the ${monthName} bill`
      : left === 0
        ? `Settles the ${monthName} bill`
        : `${formatRupees(-left)} over the ${monthName} bill, carried as advance`;

  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: colors.cardBackground,
          paddingBottom: 20 + insets.bottom,
        },
      ]}
    >
      <View style={[styles.grabber, { backgroundColor: colors.placeholder }]} />

      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.text }]}>Add payment</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          onPress={onClose}
          style={[
            styles.close,
            { backgroundColor: colors.segmentBackground },
          ]}
        >
          <X size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* With one month on offer there is nothing to choose, and the line under
          the field already names it. */}
      {months.length > 1 ? (
        <View
          style={[
            styles.segments,
            { backgroundColor: colors.segmentBackground },
          ]}
        >
          {months.map((option) => {
            const isSelected = option.month === selected.month;
            // A month with no bill is shown but cannot be picked: there is
            // nothing for the money to land on until it has been raised, and
            // leaving it out would make the sheet look as if the month had been
            // forgotten. The label says why rather than only greying out.
            const unbilled = option.bill === null;
            return (
              <Button
                key={option.month}
                text={formatBillMonthShort(option.month)}
                textColor={isSelected ? colors.text : colors.textMuted}
                backgroundColor={
                  isSelected ? colors.cardBackground : "transparent"
                }
                accessibilityLabel={
                  unbilled
                    ? `${formatBillMonth(option.month)}, not billed yet`
                    : `${formatBillMonth(option.month)}${isSelected ? ", selected" : ""}`
                }
                onPress={() => {
                  if (!isSelected) onChangeMonth(option.month);
                }}
                disabled={saving || unbilled}
                paddingVertical={9}
                borderRadius={9}
                style={styles.segment}
              />
            );
          })}
        </View>
      ) : null}

      <View style={styles.amount}>
        <CustomTextInput
          accessibilityLabel={`Paid on the ${formatBillMonth(selected.month)} bill`}
          value={amountPaid}
          onChangeText={(value) => setAmountPaid(withoutLeadingZeros(value))}
          placeholder="0"
          icon={<IndianRupee size={20} color={colors.textMuted} />}
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={() => onSave(amountPaid)}
          editable={!saving}
          autoFocus
          prominent
        />
        {hint ? (
          <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
        ) : null}
        {errorMessage ? (
          <Text style={[styles.hint, { color: colors.error }]}>
            {errorMessage}
          </Text>
        ) : null}
      </View>

      <Button
        text="Save payment"
        textColor={colors.buttonText}
        backgroundColor={colors.buttonBackground}
        onPress={() => onSave(amountPaid)}
        loading={saving}
        paddingVertical={15}
        borderRadius={14}
        style={styles.save}
      />
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    gap: 20,
    paddingTop: 8,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  close: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },
  segments: {
    flexDirection: "row",
    gap: 3,
    padding: 3,
    borderRadius: 12,
  },
  segment: {
    flex: 1,
  },
  amount: {
    gap: 8,
  },
  hint: {
    fontSize: 12,
    fontWeight: "500",
  },
  save: {
    alignSelf: "stretch",
  },
});

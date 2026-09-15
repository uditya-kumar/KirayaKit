import type { BillDraft } from "@/api/bills";
import Button from "@/components/rentComponents/Button";
import { ChargeRow } from "@/components/rentComponents/ChargeRow";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useBillDraft } from "@/hooks/useBillDraft";
import { useSaveBill } from "@/hooks/useSaveBill";
import { neonErrorMessage } from "@/libs/neon-errors";
import {
  formatAmount,
  formatBillMonth,
  formatBillMonthShort,
  formatRupees,
} from "@/utils/format";
import { MAX_AMOUNT } from "@/utils/validate";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  IndianRupee,
  Plus,
  ReceiptText,
  Zap,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

/** How far back the picker's year stepper reaches, which is further than a rent ledger is ever corrected. */
const YEARS_BACK = 5;

/**
 * The first of a month, as a `date` column stores it: "2026-09-01".
 *
 * Built from the local date parts rather than sliced off toISOString, which is UTC
 * and would still say August through the first hours of the 1st in IST.
 */
function firstOfMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

/** One year's twelve months, January first. */
function monthsOfYear(year: number): string[] {
  return Array.from(
    { length: 12 },
    (_unused, index) => `${year}-${String(index + 1).padStart(2, "0")}-01`,
  );
}

/** The year out of "2026-09-01", read off the string so no timezone can shift it. */
function yearOf(month: string): number {
  return Number(month.slice(0, 4));
}

/** A blank number field counts as 0, the same way the columns default. */
function amount(value: string): number {
  return value.trim() === "" ? 0 : Number(value);
}

/** Money as the database stores it: two decimal places, not a long binary tail. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Create Bill and Edit Bill: the same form either way. Design node H68UY, whose
 * own title says "Edit Bill" while its button says "Create Bill" — proof that one
 * screen was drawn for both jobs.
 *
 * A bill is identified by its month (`bills_tenant_month_key`), so the month is
 * what decides which job this is: pick one that has been billed and the form
 * corrects that bill, pick one that has not and it raises a new one. That is why
 * the month lives out here, above the fields — changing it remounts the form
 * through `key`, so every field re-seeds from the new month's draft instead of an
 * effect copying props into state.
 */
export default function BillFormScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { tenantId, month: monthParam } = useLocalSearchParams<{
    houseId: string;
    tenantId: string;
    /** First of the month. Left out, the form opens on the month the app is in. */
    month?: string;
  }>();

  const [month, setMonth] = useState(monthParam ?? firstOfMonth(new Date()));
  const {
    data: draft,
    error,
    isPending,
    refetch,
  } = useBillDraft(tenantId, month);

  return (
    <>
      {/* Reads "Edit Bill" until the draft comes back and says the month has never
          been billed, so the bar does not flick through the wrong word on the way. */}
      <Stack.Screen
        options={{
          title: draft && draft.billId === null ? "Create Bill" : "Edit Bill",
        }}
      />
      {/* Checked before the spinner: with no tenant the query never runs, so a
          spinner here would turn a bad link into a screen that loads forever. */}
      {!tenantId ? (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Nothing to bill
          </Text>
          <Text style={[styles.error, { color: colors.textMuted }]}>
            This screen was opened without a tenant.
          </Text>
        </View>
      ) : isPending ? (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : error || !draft ? (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Couldn&apos;t load this month
          </Text>
          <Text style={[styles.error, { color: colors.textMuted }]} selectable>
            {/* Translated, because this screen is reachable by link: a tenantId
                that lost a character arrives as Postgres 22P02, whose raw text
                is a complaint about uuid syntax rather than about the link. */}
            {error ? neonErrorMessage(error) : "The tenant is no longer here."}
          </Text>
          <Button
            text="Try again"
            textColor={colors.tint}
            backgroundColor="transparent"
            onPress={() => void refetch()}
            paddingHorizontal={0}
          />
        </View>
      ) : (
        <BillForm
          key={month}
          tenantId={tenantId}
          month={month}
          onChangeMonth={setMonth}
          draft={draft}
        />
      )}
    </>
  );
}

/** One editable extra charge, held as text so a half-typed "12." is not mangled. */
type ChargeDraft = {
  label: string;
  amount: string;
};

type BillFormProps = {
  tenantId: string;
  /** First of the month being billed; the form is remounted when it changes. */
  month: string;
  onChangeMonth: (month: string) => void;
  draft: BillDraft;
};

function BillForm({ tenantId, month, onChangeMonth, draft }: BillFormProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  // A month nobody has billed yet starts level with the previous reading: zero
  // units until the meter is actually read, and never a negative consumption.
  const [currentReading, setCurrentReading] = useState(
    String(draft.currentReading),
  );
  const [amountPaid, setAmountPaid] = useState(String(draft.amountPaid));
  const [charges, setCharges] = useState<ChargeDraft[]>(
    draft.charges.map((charge) => ({
      label: charge.label,
      amount: String(charge.amount),
    })),
  );
  const [pickingMonth, setPickingMonth] = useState(false);
  // Which year the picker is showing. Separate from the month being billed, so
  // stepping through years does not change the bill until a month is tapped.
  const [pickerYear, setPickerYear] = useState(() => yearOf(month));
  const [error, setError] = useState<string | null>(null);

  const { mutate: saveBill, isPending: saving } = useSaveBill();

  // No month the calendar has not reached: a bill belongs to a month that has
  // begun, and billing December in September would raise a rent nobody owes yet
  // and put a reading in front of the months between. The floor is five years
  // back, or further when an older bill is the one open — whichever month is
  // being edited has to stay reachable, which is also why a month already open
  // ahead of today (from an older build, or a device with a wrong clock) does not
  // become unpickable.
  const now = new Date();
  const thisMonth = firstOfMonth(now);
  const lastMonth = month > thisMonth ? month : thisMonth;
  const thisYear = now.getFullYear();
  const firstYear = Math.min(thisYear - YEARS_BACK, yearOf(month));
  const lastYear = Math.max(thisYear, yearOf(month));

  // The same arithmetic the `total_billed` column does, so the figure under the
  // button is the one the receipt will carry.
  const reading = amount(currentReading);
  const units = reading - draft.previousReading;
  const electricity = round2(units * draft.electricityRate);
  const extras = charges.reduce(
    (sum, charge) => sum + amount(charge.amount),
    0,
  );
  const total = round2(
    draft.rentAmount + electricity + extras + draft.previousBalance,
  );

  function setCharge(index: number, charge: ChargeDraft) {
    setCharges(charges.map((current, at) => (at === index ? charge : current)));
  }

  function onSubmit() {
    setError(null);

    // Ten digits is where numeric(12,2) stops, and past it the column refuses the
    // row and says so in terms of precision and scale. Every figure this form sends
    // lands in one of those columns, so every one of them is held to MAX_AMOUNT.
    if (
      !Number.isFinite(reading) ||
      reading < draft.previousReading ||
      reading > MAX_AMOUNT
    ) {
      setError(
        `The current reading has to be a number, at least last month's ${formatAmount(draft.previousReading)}, and no more than ten digits.`,
      );
      return;
    }

    const paid = amount(amountPaid);
    if (!Number.isFinite(paid) || paid < 0 || paid > MAX_AMOUNT) {
      setError(
        "Paid this month has to be a number, not negative, and no more than ten digits.",
      );
      return;
    }

    // An untouched "Add charge" row is dropped rather than complained about; one
    // with an amount and no name would vanish silently, so that one is caught.
    const filled = charges.filter(
      (charge) => charge.label.trim() !== "" || charge.amount.trim() !== "",
    );
    if (filled.some((charge) => charge.label.trim() === "")) {
      setError("Give every charge a name, or remove the row.");
      return;
    }
    if (
      filled.some((charge) => {
        const value = amount(charge.amount);
        return !Number.isFinite(value) || value < 0 || value > MAX_AMOUNT;
      })
    ) {
      setError(
        "A charge amount has to be a number, not negative, and no more than ten digits.",
      );
      return;
    }

    // Every figure above can fit and the sum still not: total_billed is a
    // generated numeric(12,2), and a long reading against a rate multiplies into
    // it. Checked against the total under the button, which is already the same
    // arithmetic the column does — otherwise the insert comes back rejected with
    // nothing on the form to point at.
    if (total > MAX_AMOUNT) {
      setError(
        "This bill adds up to more than the ledger holds — check the reading and the charges.",
      );
      return;
    }

    saveBill(
      {
        tenantId,
        month,
        currentReading: reading,
        amountPaid: paid,
        charges: filled.map((charge) => ({
          label: charge.label.trim(),
          amount: amount(charge.amount),
        })),
      },
      {
        // Back to the tenant, whose pending figure and month cards the mutation
        // has already invalidated.
        onSuccess: () => router.back(),
        onError: (err) => setError(neonErrorMessage(err)),
      },
    );
  }

  const computedLabelStyle = [styles.computedLabel, { color: colors.text }];
  const computedValueStyle = [styles.computedValue, { color: colors.text }];

  return (
    <KeyboardAwareScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.form}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      // The charge rows and the total sit under the keyboard on a short phone.
      // This scroll view adds the keyboard's height to the scrollable area and
      // lifts the focused field clear of it on both platforms — the app is
      // edge-to-edge, so Android no longer resizes the window and has to be told
      // as well as iOS.
      bottomOffset={24}
    >
      <View style={styles.row}>
        {/* Not a CustomTextInput: a month is chosen, not typed, and the mock draws
            it as a field-shaped button. */}
        <View style={[styles.field, styles.monthField]}>
          <Text style={[styles.label, { color: colors.text }]}>Month</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Month, ${formatBillMonth(month)}`}
            onPress={() => {
              // Opening always lands on the year of the month being billed, so a
              // stray step into another year does not linger after a cancel.
              setPickerYear(yearOf(month));
              setPickingMonth(true);
            }}
            style={({ pressed }) => [
              styles.monthButton,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.borderColor,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <CalendarDays size={18} color={colors.textMuted} />
            {/* Abbreviated because the field is half a row wide with an icon at
                each end: "September 2026" wraps there and pushes the box out of
                shape. The accessibility label says the month in full, and so do
                the rows in the picker. */}
            <Text
              style={[styles.monthText, { color: colors.text }]}
              numberOfLines={1}
            >
              {formatBillMonthShort(month)}
            </Text>
            <ChevronDown size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Read-only because the bill snapshots the rent it was raised with:
            changing it belongs on the tenant, and a past month must not move. */}
        <ReadOnlyField
          labelText="Monthly rent"
          value={formatAmount(draft.rentAmount)}
          icon={<IndianRupee size={18} color={colors.textMuted} />}
          style={styles.field}
        />
      </View>

      <CustomTextInput
        labelText="Paid this month"
        value={amountPaid}
        onChangeText={setAmountPaid}
        placeholder="0"
        icon={<IndianRupee size={18} color={colors.textMuted} />}
        keyboardType="decimal-pad"
        returnKeyType="next"
      />

      <View
        style={[
          styles.elecSection,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.borderColor,
          },
        ]}
      >
        <View style={styles.elecHead}>
          <Zap size={22} color={colors.warning} />
          <Text style={[styles.elecTitle, { color: colors.text }]}>
            Electricity reading
          </Text>
        </View>

        <View style={styles.row}>
          <CustomTextInput
            labelText="Current"
            value={currentReading}
            onChangeText={setCurrentReading}
            placeholder={formatAmount(draft.previousReading)}
            keyboardType="decimal-pad"
            returnKeyType="next"
            style={styles.field}
          />
          {/* Snapshotted with the bill, same as the rent. */}
          <ReadOnlyField
            labelText="Rate ₹/unit"
            value={formatAmount(draft.electricityRate)}
            style={styles.field}
          />
        </View>

        <View
          style={[
            styles.computed,
            { backgroundColor: colors.warningBackground },
          ]}
        >
          <View style={styles.computedRow}>
            <Text style={computedLabelStyle}>Previous reading</Text>
            <Text style={computedValueStyle}>
              {formatAmount(draft.previousReading)}
            </Text>
          </View>
          <View style={styles.computedRow}>
            <Text style={computedLabelStyle}>Current reading</Text>
            <Text style={computedValueStyle}>{formatAmount(reading)}</Text>
          </View>
          <View style={styles.computedRow}>
            <Text style={computedLabelStyle}>Units consumed</Text>
            <Text style={computedValueStyle}>
              {formatAmount(units)} × {formatRupees(draft.electricityRate)}
            </Text>
          </View>

          <View
            style={[
              styles.elecDivider,
              { backgroundColor: colors.warningBorder },
            ]}
          />

          <View style={styles.computedRow}>
            <Text style={[styles.elecTotalLabel, { color: colors.text }]}>
              Electricity total
            </Text>
            <Text style={[styles.elecTotalValue, { color: colors.warning }]}>
              {formatRupees(electricity)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.extras}>
        <View style={styles.extrasHead}>
          <CirclePlus size={16} color={colors.textMuted} />
          <Text style={[styles.extrasTitle, { color: colors.textMuted }]}>
            Extra charges (Optional)
          </Text>
        </View>

        {/* TODO: charge_presets holds the labels a house has used before, to
            prefill this list; nothing writes or reads it yet. */}
        {charges.map((charge, index) => (
          // The index is the key because a row has no id of its own until it is
          // saved, and rows are never reordered — only added and removed.
          <ChargeRow
            key={index}
            label={charge.label}
            amount={charge.amount}
            onChangeLabel={(label) => setCharge(index, { ...charge, label })}
            onChangeAmount={(value) =>
              setCharge(index, { ...charge, amount: value })
            }
            onRemove={() =>
              setCharges(charges.filter((_unused, at) => at !== index))
            }
          />
        ))}

        <Button
          text="Add charge"
          textColor={colors.tint}
          backgroundColor={colors.cardBackground}
          borderColor={colors.tint}
          icon={<Plus size={18} color={colors.tint} />}
          onPress={() => setCharges([...charges, { label: "", amount: "" }])}
          paddingVertical={13}
          style={styles.addCharge}
        />
      </View>

      {/* A carry can be either way round: pay ₹8500 against ₹8497.75 and the
          surplus arrives here as a negative, which subtracts from this month's
          total. Said in words and shown unsigned, because "₹-2.25" reads like a
          mistake and this one is the tenant's money. */}
      <View style={styles.previous}>
        <Text style={[styles.previousLabel, { color: colors.textMuted }]}>
          {draft.previousBalance < 0
            ? "Advance carried over"
            : "Previous balance carried"}
        </Text>
        <Text style={[styles.previousValue, { color: colors.text }]}>
          {draft.previousBalance < 0 ? "−" : ""}
          {formatRupees(Math.abs(draft.previousBalance))}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.borderColor }]} />

      <View style={styles.total}>
        <View style={styles.totalText}>
          <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
            Total bill
          </Text>
          <Text style={[styles.totalSub, { color: colors.textMuted }]}>
            Rent + Electricity + Charges
          </Text>
        </View>
        <Text style={[styles.totalValue, { color: colors.text }]}>
          {formatRupees(total)}
        </Text>
      </View>

      {/* The mock has no error state; this is the one place a rejected write can
          speak up, so it sits directly above the action that caused it. */}
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}

      <Button
        text={draft.billId === null ? "Create Bill" : "Save"}
        textColor={colors.buttonText}
        backgroundColor={colors.buttonBackground}
        icon={
          draft.billId === null ? (
            <ReceiptText size={18} color={colors.buttonText} />
          ) : undefined
        }
        onPress={onSubmit}
        loading={saving}
        paddingVertical={15}
        style={styles.action}
      />

      <MonthPicker
        visible={pickingMonth}
        year={pickerYear}
        firstYear={firstYear}
        lastYear={lastYear}
        lastMonth={lastMonth}
        onChangeYear={setPickerYear}
        selected={month}
        onSelect={(picked) => {
          setPickingMonth(false);
          if (picked !== month) onChangeMonth(picked);
        }}
        onCancel={() => setPickingMonth(false)}
      />
    </KeyboardAwareScrollView>
  );
}

type ReadOnlyFieldProps = {
  labelText: string;
  value: string;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * A figure the form shows but does not let anyone change — the rent and the rate,
 * both snapshotted onto the bill when it is raised.
 *
 * Shaped like `CustomTextInput` so the two kinds of field line up side by side,
 * and filled and greyed so it reads as settled rather than empty. Not a disabled
 * text input: there is nothing to type into, and a screen reader should not offer
 * one.
 */
function ReadOnlyField({ labelText, value, icon, style }: ReadOnlyFieldProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.readOnly, style]}>
      <Text style={[styles.label, { color: colors.text }]}>{labelText}</Text>
      <View
        style={[
          styles.readOnlyBox,
          {
            backgroundColor: colors.fillBackground,
            borderColor: colors.borderColor,
          },
        ]}
      >
        {icon}
        <Text style={[styles.readOnlyValue, { color: colors.textMuted }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

type MonthPickerProps = {
  visible: boolean;
  /** The year on show; its twelve months are what the list offers. */
  year: number;
  /** Bounds for the stepper, inclusive. */
  firstYear: number;
  lastYear: number;
  /** The latest month that can be billed, as "2026-09-01". Later ones are shown greyed. */
  lastMonth: string;
  onChangeYear: (year: number) => void;
  /** First of the month currently being billed, as "2026-09-01". */
  selected: string;
  onSelect: (month: string) => void;
  onCancel: () => void;
};

/**
 * Which month is being billed.
 *
 * A list rather than a calendar: a bill belongs to a whole month, never a day, and
 * this keeps the screen free of a date-picker dependency. One year at a time, in
 * calendar order, because that is how a landlord reads a ledger — the stepper is
 * what reaches last year. Picking a month that has already been billed is not an
 * error: the form loads that bill and the bar changes to "Edit Bill".
 *
 * Months past `lastMonth` are shown and greyed rather than left out, so the year
 * always reads as twelve rows and it is obvious why the rest cannot be tapped.
 */
function MonthPicker({
  visible,
  year,
  firstYear,
  lastYear,
  lastMonth,
  onChangeYear,
  selected,
  onSelect,
  onCancel,
}: MonthPickerProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const atFirst = year <= firstYear;
  const atLast = year >= lastYear;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/* Nothing has been changed yet, so a tap beside the card is a harmless way
          out — unlike the delete confirmation, which insists on Cancel. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close month picker"
        onPress={onCancel}
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
      >
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.cardBackground }]}
        >
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            Choose a month
          </Text>

          <View style={styles.yearRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Show ${year - 1}`}
              accessibilityState={{ disabled: atFirst }}
              onPress={atFirst ? undefined : () => onChangeYear(year - 1)}
              style={({ pressed }) => [
                styles.yearStep,
                { opacity: atFirst ? 0.3 : pressed ? 0.6 : 1 },
              ]}
            >
              <ChevronLeft size={20} color={colors.text} />
            </Pressable>

            <Text style={[styles.yearText, { color: colors.text }]}>
              {year}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Show ${year + 1}`}
              accessibilityState={{ disabled: atLast }}
              onPress={atLast ? undefined : () => onChangeYear(year + 1)}
              style={({ pressed }) => [
                styles.yearStep,
                { opacity: atLast ? 0.3 : pressed ? 0.6 : 1 },
              ]}
            >
              <ChevronRight size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView>
            {monthsOfYear(year).map((month) => {
              // String comparison is date comparison here: both are "YYYY-MM-01".
              const future = month > lastMonth;
              return (
                <Pressable
                  key={month}
                  accessibilityRole="button"
                  accessibilityLabel={formatBillMonth(month)}
                  accessibilityState={{
                    selected: month === selected,
                    disabled: future,
                  }}
                  onPress={future ? undefined : () => onSelect(month)}
                  style={({ pressed }) => [
                    styles.monthOption,
                    { opacity: future ? 0.3 : pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text
                    style={[styles.monthOptionText, { color: colors.text }]}
                  >
                    {formatBillMonth(month)}
                  </Text>
                  {month === selected ? (
                    <Check size={18} color={colors.tint} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  form: {
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 20,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  // The mock pairs the month with the rent, and the reading with the rate.
  row: {
    flexDirection: "row",
    gap: 12,
  },
  field: {
    flex: 1,
  },
  // Its own label, so it matches the CustomTextInput beside it.
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  monthField: {
    gap: 8,
  },
  monthButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 45,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 15,
  },
  // A point smaller than the fields it sits beside: this one carries a word, not
  // a figure, and the longest of them has to clear the chevron.
  monthText: {
    flex: 1,
    fontSize: 14,
  },
  readOnly: {
    gap: 8,
  },
  readOnlyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 45,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 15,
  },
  readOnlyValue: {
    flex: 1,
    fontSize: 15,
  },
  elecSection: {
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  elecHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  elecTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  computed: {
    gap: 8,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderRadius: 14,
  },
  computedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  computedLabel: {
    fontSize: 14,
  },
  computedValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  elecDivider: {
    height: 1,
  },
  elecTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  elecTotalValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  extras: {
    gap: 10,
    paddingBottom: 7,
  },
  extrasHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  extrasTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  // The button spans the section; Button itself only centres its label.
  addCharge: {
    alignSelf: "stretch",
  },
  previous: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
    paddingHorizontal: 2,
  },
  previousLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  previousValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    height: 1,
  },
  total: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 2,
  },
  totalText: {
    gap: 2,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  totalSub: {
    fontSize: 12,
  },
  totalValue: {
    fontSize: 26,
    fontWeight: "700",
  },
  error: {
    fontSize: 13,
  },
  action: {
    alignSelf: "stretch",
  },
  scrim: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    width: 300,
    // A share of the screen rather than a fixed height: all twelve months fit
    // without scrolling on a normal phone, where 420 showed eight and left the
    // rest behind a scroll nothing hinted at. A short screen still scrolls.
    maxHeight: "80%",
    paddingVertical: 14,
    borderRadius: 24,
    boxShadow: [
      { offsetX: 0, offsetY: 12, blurRadius: 32, color: "#00000026" },
    ],
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  // Square enough to be a comfortable target either side of the year.
  yearStep: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  yearText: {
    fontSize: 16,
    fontWeight: "600",
  },
  monthOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  monthOptionText: {
    fontSize: 15,
  },
});

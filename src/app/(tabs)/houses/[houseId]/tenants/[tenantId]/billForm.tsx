import type { BillDraft } from "@/api/bills";
import Button from "@/components/rentComponents/Button";
import { ChargeRow } from "@/components/rentComponents/ChargeRow";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import {
  DropdownMenu,
  type MenuItem,
} from "@/components/rentComponents/DropdownMenu";
import { MeterReadingCard } from "@/components/rentComponents/MeterReadingCard";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useBillDraft } from "@/hooks/useBillDraft";
import { useSaveBill } from "@/hooks/useSaveBill";
import { useTenantRecord } from "@/hooks/useTenantRecord";
import { neonErrorMessage } from "@/libs/neon-errors";
import {
  formatAmount,
  formatBillMonth,
  formatBillMonthShort,
  formatRupees,
} from "@/utils/format";
import {
  MAX_AMOUNT,
  fieldAmount,
  isChargeLabel,
  withoutLeadingZeros,
} from "@/utils/validate";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  CalendarDays,
  ChevronDown,
  CirclePlus,
  IndianRupee,
  Plus,
  ReceiptText,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

/**
 * The first of a month, as a `date` column stores it: "2026-09-01".
 *
 * Built from the local date parts rather than sliced off toISOString, which is UTC
 * and would still say August through the first hours of the 1st in IST.
 */
function firstOfMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * The months a bill can be raised or corrected for: this one, and the one before
 * it unless the tenant moved in this month. Oldest first.
 *
 * Only two, because anything older has already been carried into later bills, and
 * correcting it now would change receipts the tenant has been sent. Nothing
 * ahead of today either: next month's rent is not owed yet.
 *
 * `movedInOn` is a `date` column ("2026-10-14"). It is cut down to its month as a
 * string so no timezone can move it into the month before.
 */
function billableMonths(movedInOn: string, now: Date): string[] {
  const thisMonth = firstOfMonth(now);
  const lastMonth = firstOfMonth(
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
  );
  const movedInMonth = `${movedInOn.slice(0, 7)}-01`;
  // String comparison is date comparison here: both are "YYYY-MM-01".
  return movedInMonth <= lastMonth ? [lastMonth, thisMonth] : [thisMonth];
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
  const draftQuery = useBillDraft(tenantId, month);
  // Waited on with the draft, so the month field does not offer last month for
  // a moment before the move-in date arrives and takes it away again.
  const tenantQuery = useTenantRecord(tenantId);
  const draft = draftQuery.data;
  const tenant = tenantQuery.data;
  const error = draftQuery.error ?? tenantQuery.error;
  const isPending = draftQuery.isPending || tenantQuery.isPending;

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
      ) : error || !draft || !tenant ? (
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
            onPress={() => {
              if (draftQuery.isError) void draftQuery.refetch();
              if (tenantQuery.isError) void tenantQuery.refetch();
            }}
            paddingHorizontal={0}
          />
        </View>
      ) : (
        <BillForm
          key={month}
          tenantId={tenantId}
          month={month}
          onChangeMonth={setMonth}
          movedInOn={tenant.moved_in_on}
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
  /** The tenant's `moved_in_on`, which decides whether last month is offered. */
  movedInOn: string;
  draft: BillDraft;
};

function BillForm({
  tenantId,
  month,
  onChangeMonth,
  movedInOn,
  draft,
}: BillFormProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  // A month nobody has billed yet starts level with the previous reading: zero
  // units until the meter is actually read, and never a negative consumption.
  const [currentReading, setCurrentReading] = useState(
    String(draft.currentReading),
  );
  // Blank rather than "0" when nothing has been paid: the placeholder already
  // shows 0, a blank saves as 0, and the first digit typed is then the figure.
  const [amountPaid, setAmountPaid] = useState(
    draft.amountPaid === 0 ? "" : String(draft.amountPaid),
  );
  const [charges, setCharges] = useState<ChargeDraft[]>(
    draft.charges.map((charge) => ({
      label: charge.label,
      amount: String(charge.amount),
    })),
  );
  const [error, setError] = useState<string | null>(null);

  const { mutate: saveBill, isPending: saving } = useSaveBill();

  const months = billableMonths(movedInOn, new Date());
  // With nothing to switch to, the field shows the month but no longer opens.
  const canPickMonth = months.length > 1;
  // The open month is listed too, ticked, so picking last month can be undone
  // from the same menu. Picking a month that has already been billed is not an
  // error: the form loads that bill and the bar changes to "Edit Bill".
  const monthItems: MenuItem[] = months.map((option) => ({
    key: option,
    label: formatBillMonthShort(option),
    accessibilityLabel: formatBillMonth(option),
    selected: option === month,
    onPress: () => {
      if (option !== month) onChangeMonth(option);
    },
  }));

  // The same arithmetic the `total_billed` column does, so the figure under the
  // button is the one the receipt will carry.
  const reading = fieldAmount(currentReading);
  const units = reading - draft.previousReading;
  const electricity = round2(units * draft.electricityRate);
  const extras = charges.reduce(
    (sum, charge) => sum + fieldAmount(charge.amount),
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

    const paid = fieldAmount(amountPaid);
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
    // Quoted back rather than pointed at: there can be several rows, and the one
    // error line sits under all of them.
    const misnamed = filled.find((charge) => !isChargeLabel(charge.label));
    if (misnamed) {
      setError(
        `A charge name can have letters and numbers — check "${misnamed.label.trim()}".`,
      );
      return;
    }
    if (
      filled.some((charge) => {
        const value = fieldAmount(charge.amount);
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
          amount: fieldAmount(charge.amount),
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
          <DropdownMenu
            accessibilityLabel={`Month, ${formatBillMonth(month)}`}
            items={monthItems}
            disabled={!canPickMonth}
            matchTriggerWidth
          >
            <View
              style={[
                styles.monthButton,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <CalendarDays size={18} color={colors.textMuted} />
              {/* Abbreviated because the field is half a row wide with an icon
                  at each end: "September 2026" wraps there and pushes the box
                  out of shape. The accessibility labels say the month in full. */}
              <Text
                style={[styles.monthText, { color: colors.text }]}
                numberOfLines={1}
              >
                {formatBillMonthShort(month)}
              </Text>
              {/* Only the chevron fades when the field cannot open: the month is
                  still the answer to a question, and greying it would read as
                  missing. */}
              <View style={{ opacity: canPickMonth ? 1 : 0.3 }}>
                <ChevronDown size={16} color={colors.textMuted} />
              </View>
            </View>
          </DropdownMenu>
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
        onChangeText={(value) => setAmountPaid(withoutLeadingZeros(value))}
        placeholder="0"
        icon={<IndianRupee size={18} color={colors.textMuted} />}
        keyboardType="decimal-pad"
        returnKeyType="next"
      />

      <MeterReadingCard
        previousReading={draft.previousReading}
        currentReading={currentReading}
        onChangeCurrentReading={(value) =>
          setCurrentReading(withoutLeadingZeros(value))
        }
        electricityRate={draft.electricityRate}
        units={units}
        electricityAmount={electricity}
      />

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
              setCharge(index, {
                ...charge,
                amount: withoutLeadingZeros(value),
              })
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
  // The mock pairs the month with the rent.
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
});

import { outstandingAmount, type Bill } from "@/api/bills";
import {
  AddPaymentSheet,
  type PaymentMonth,
} from "@/components/rentComponents/AddPaymentSheet";
import Button from "@/components/rentComponents/Button";
import { DeleteDialog } from "@/components/rentComponents/DeleteDialog";
import { PaymentCard } from "@/components/rentComponents/PaymentCard";
import { TenantProfile } from "@/components/rentComponents/TenantProfile";
import { TenantSummaryCard } from "@/components/rentComponents/TenantSummaryCard";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useBillDraft } from "@/hooks/useBillDraft";
import { useBills } from "@/hooks/useBills";
import { useDeleteTenant } from "@/hooks/useDeleteTenant";
import { useSaveBill } from "@/hooks/useSaveBill";
import { useTenant } from "@/hooks/useTenant";
import { neonErrorMessage } from "@/libs/neon-errors";
import { MAX_AMOUNT, fieldAmount } from "@/utils/validate";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/** How many months the mock shows before "View all" takes over (design node MADxZ). */
const RECENT_MONTHS = 2;

/**
 * A month counted back from the one the app is running in, as "2026-09", to match
 * against a bill's `bill_month` ("2026-09-01"). 0 is this month.
 *
 * Built from the local parts rather than sliced off toISOString, which is UTC and
 * would still say August through the first hours of the 1st in IST.
 */
function billMonth(monthsBack: number): string {
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Tenant Detail: who they are, what they owe, and their month-by-month history.
 * Design node MADxZ.
 *
 * The pending figure is derived from the bills already in hand rather than read
 * from `v_tenant_list.total_pending`, which is the same number: the ledger is
 * fetched for the history below anyway, and taking it from there keeps the figure
 * and the months it is made of on one round trip. See `outstandingAmount`.
 */
export default function TenantDetailScreen() {
  // The palette follows the device setting, so anything coloured is applied
  // inline; StyleSheet below keeps only the layout, which never changes.
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { houseId, tenantId } = useLocalSearchParams<{
    houseId: string;
    tenantId: string;
  }>();

  const tenantQuery = useTenant(tenantId);
  const billsQuery = useBills(tenantId);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { mutate: deleteTenant, isPending: isDeleting } = useDeleteTenant();

  // The month the Add payment sheet is open on, or null while it is shut. Its
  // draft is only fetched while the sheet is up: a payment is saved as the
  // month's own bill with everything but the paid amount sent back unchanged, so
  // the reading and the charges have to be in hand to leave them alone.
  const [payingMonth, setPayingMonth] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const payingDraft = useBillDraft(
    payingMonth ? tenantId : undefined,
    payingMonth ?? "",
  );
  const { mutate: savePayment, isPending: isSavingPayment } = useSaveBill();

  // Both queries fill one screen, so the spinner waits for the pair and the
  // first failure is the one reported.
  const loading = tenantQuery.isPending || billsQuery.isPending;
  const error = tenantQuery.error ?? billsQuery.error;

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (error || !tenantQuery.data || !billsQuery.data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Couldn&apos;t load this tenant
        </Text>
        <Text
          style={[styles.errorText, { color: colors.textMuted }]}
          selectable
        >
          {/* Translated, because this screen is reachable by link: an id that
              lost a character arrives as Postgres 22P02, whose raw text is a
              complaint about uuid syntax rather than about the link. */}
          {error ? neonErrorMessage(error) : "The tenant is no longer here."}
        </Text>
        <Button
          text="Try again"
          textColor={colors.tint}
          backgroundColor="transparent"
          onPress={() => {
            void tenantQuery.refetch();
            void billsQuery.refetch();
          }}
          paddingHorizontal={0}
        />
      </View>
    );
  }

  const tenant = tenantQuery.data;
  const bills = billsQuery.data;

  // A month with no bill yet reads as zeros rather than vanishing: the card is
  // where the month's bill gets created, so it has to be there before one exists.
  const thisMonth = billMonth(0);
  const currentBill: Bill | undefined = bills.find(
    (bill) => bill.bill_month.slice(0, 7) === thisMonth,
  );

  // The whole ledger is already in hand — this screen simply shows the top of it
  // and hands the rest to Payment History.
  const recent = bills.slice(0, RECENT_MONTHS);

  // The two months the bill form also allows, and only those that have been
  // billed: a payment needs a bill to land on, and raising one is the bill form's
  // job rather than a side effect of recording money. Oldest first, so the sheet's
  // segments read left to right in time.
  const payableMonths = [billMonth(1), thisMonth];
  const paymentMonths: PaymentMonth[] = bills
    .filter((bill) => payableMonths.includes(bill.bill_month.slice(0, 7)))
    .map((bill) => ({
      month: bill.bill_month,
      billed: bill.total_billed,
      paid: bill.amount_paid,
    }))
    .reverse();

  function openBill(billId: string) {
    router.push({
      pathname: "/houses/[houseId]/tenants/[tenantId]/bills/[billId]",
      params: { houseId, tenantId, billId },
    });
  }

  /**
   * Records what has been paid on one month, which is the bill form's "Paid this
   * month" on its own: `save_bill` is handed the month's existing reading and
   * charges back, so the only thing that moves is `amount_paid`.
   */
  function onSavePayment(text: string) {
    setPaymentError(null);
    const draft = payingDraft.data;
    if (!payingMonth || !draft) {
      if (payingDraft.isError) void payingDraft.refetch();
      return;
    }
    // The sheet only ever offers months that have a bill, so this is a month that
    // was deleted in another session. Saving anyway would raise it again at zero
    // units through save_bill's upsert, which is not what a payment should do.
    if (draft.billId === null) {
      setPaymentError(
        "This month has no bill any more — raise it from Edit Bill.",
      );
      return;
    }

    const paid = fieldAmount(text);
    if (!Number.isFinite(paid) || paid < 0 || paid > MAX_AMOUNT) {
      setPaymentError(
        "The amount paid has to be a number, not negative, and no more than ten digits.",
      );
      return;
    }

    savePayment(
      {
        tenantId,
        month: payingMonth,
        currentReading: draft.currentReading,
        amountPaid: paid,
        charges: draft.charges,
      },
      {
        // The mutation has already invalidated the ledger, so the card behind the
        // sheet refills with the new figures as it closes.
        onSuccess: () => setPayingMonth(null),
        onError: (err) => setPaymentError(neonErrorMessage(err)),
      },
    );
  }

  function onConfirmDelete() {
    setDeleteError(null);
    deleteTenant(tenantId, {
      onSuccess: () => {
        setConfirmingDelete(false);
        // This screen is showing a tenant who is gone, and the house's list has
        // already been invalidated by the mutation. Deep-linked straight here
        // there is nothing behind it, so that list takes its place.
        if (router.canGoBack()) router.back();
        else
          router.replace({
            pathname: "/houses/[houseId]",
            params: { houseId },
          });
      },
      onError: (err) => setDeleteError(neonErrorMessage(err)),
    });
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <TenantProfile
        name={tenant.name}
        floorNumber={tenant.floor_number}
        houseName={tenant.house_name}
        monthlyRent={tenant.monthly_rent}
        electricityRate={tenant.electricity_rate}
        // The tenantId param is what turns the Create Tenant form into an edit.
        onEdit={() =>
          router.push({
            pathname: "/houses/[houseId]/tenantForm",
            params: { houseId, tenantId },
          })
        }
      />

      <TenantSummaryCard
        outstanding={outstandingAmount(bills)}
        billed={currentBill?.total_billed ?? 0}
        paid={currentBill?.amount_paid ?? 0}
        // Nothing to view until the month has been billed, which is what dims the
        // link while the card is showing zeros.
        onViewDetails={currentBill ? () => openBill(currentBill.id) : undefined}
        // Edit doubles as "raise it": the same form creates this month's bill when
        // the card is showing zeros because there is nothing to edit yet.
        onEditBill={() =>
          router.push({
            pathname: "/houses/[houseId]/tenants/[tenantId]/billForm",
            params: { houseId, tenantId, month: `${thisMonth}-01` },
          })
        }
        // Dimmed until some month has a bill: there is nothing for the money to
        // go against, and the sheet would open on no month at all.
        onAddPayment={
          paymentMonths.length > 0
            ? () => {
                setPaymentError(null);
                // Opens on the newest billed month, which is what most payments
                // are for.
                setPayingMonth(paymentMonths.at(-1)?.month ?? null);
              }
            : undefined
        }
      />

      <View style={styles.historyHead}>
        <Text style={[styles.historyTitle, { color: colors.text }]}>
          Payment history
        </Text>
        {/* Only worth offering when there is something the two cards below do not
            already show — otherwise it leads to the same list. */}
        {bills.length > RECENT_MONTHS ? (
          <Button
            text="View all"
            textColor={colors.tint}
            backgroundColor="transparent"
            accessibilityLabel="View all payments"
            onPress={() =>
              router.push({
                pathname: "/houses/[houseId]/tenants/[tenantId]/paymentHistory",
                params: { houseId, tenantId },
              })
            }
            paddingVertical={0}
            paddingHorizontal={0}
          />
        ) : null}
      </View>

      {bills.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          No bill has been raised for {tenant.name} yet.
        </Text>
      ) : (
        recent.map((bill) => (
          <PaymentCard
            key={bill.id}
            month={bill.bill_month}
            billed={bill.total_billed}
            paid={bill.amount_paid}
            onPress={() => openBill(bill.id)}
          />
        ))
      )}

      <Button
        text="Delete Tenant"
        textColor={colors.buttonText}
        backgroundColor={colors.error}
        icon={<Trash2 size={18} color={colors.buttonText} />}
        onPress={() => {
          setDeleteError(null);
          setConfirmingDelete(true);
        }}
        paddingVertical={15}
        style={styles.delete}
      />

      <AddPaymentSheet
        visible={payingMonth !== null}
        months={paymentMonths}
        month={payingMonth ?? ""}
        onChangeMonth={(month) => {
          setPaymentError(null);
          setPayingMonth(month);
        }}
        onSave={onSavePayment}
        onClose={() => setPayingMonth(null)}
        // Also busy while the draft is on its way: Save has nothing to send back
        // unchanged until the month it is paying against has arrived.
        saving={isSavingPayment || payingDraft.isPending}
        errorMessage={
          paymentError ??
          (payingDraft.error ? neonErrorMessage(payingDraft.error) : null)
        }
      />

      <DeleteDialog
        visible={confirmingDelete}
        title="Delete this tenant?"
        // What the delete really does: the row is kept so the bills it owns are
        // not cascaded away, but the tenant and their history leave the app for
        // good, and the floor is free for whoever moves in. Promising permanent
        // destruction would be a claim the delete does not make.
        message={`${tenant.name} and their billing history will be removed from KirayaKit, and their floor freed. This cannot be undone.`}
        confirmText="Delete Tenant"
        onDelete={onConfirmDelete}
        onCancel={() => setConfirmingDelete(false)}
        deleting={isDeleting}
        errorMessage={deleteError}
      />
    </ScrollView>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
  },
  historyHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 5,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  empty: {
    fontSize: 13,
  },
  // The mock sets the delete button apart from the last month with a wider gap
  // than the 12 the rest of the column uses.
  delete: {
    alignSelf: "stretch",
    marginTop: 20,
  },
});

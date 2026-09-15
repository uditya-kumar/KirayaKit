import { outstandingAmount, type Bill } from "@/api/bills";
import { BillBreakdown } from "@/components/rentComponents/BillBreakdown";
import Button from "@/components/rentComponents/Button";
import { DeleteDialog } from "@/components/rentComponents/DeleteDialog";
import { PaymentCard } from "@/components/rentComponents/PaymentCard";
import { TenantProfile } from "@/components/rentComponents/TenantProfile";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useBills } from "@/hooks/useBills";
import { useDeleteTenant } from "@/hooks/useDeleteTenant";
import { useTenant } from "@/hooks/useTenant";
import { neonErrorMessage } from "@/libs/neon-errors";
import { formatRupees } from "@/utils/format";
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
 * The month the app is running in, as "2026-09", to match against a bill's
 * `bill_month` ("2026-09-01").
 *
 * Built from the local parts rather than sliced off toISOString, which is UTC and
 * would still say August through the first hours of the 1st in IST.
 */
function currentBillMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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
  const thisMonth = currentBillMonth();
  const currentBill: Bill | undefined = bills.find(
    (bill) => bill.bill_month.slice(0, 7) === thisMonth,
  );

  // The whole ledger is already in hand — this screen simply shows the top of it
  // and hands the rest to Payment History.
  const recent = bills.slice(0, RECENT_MONTHS);

  // Signed, so overpayment can be said rather than hidden: paying past the total
  // leaves a credit that the next bill takes off, and showing it as "-₹500
  // pending" in the same red as a debt would read as an alarm about the opposite
  // of what happened. Red is kept for money actually owed, which is also why a
  // settled ₹0 is not red either.
  const outstanding = outstandingAmount(bills);
  const inCredit = outstanding < 0;

  function openBill(billId: string) {
    router.push({
      pathname: "/houses/[houseId]/tenants/[tenantId]/bills/[billId]",
      params: { houseId, tenantId, billId },
    });
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

      {/* A plain frame in the mock (node Uy7Zi) rather than a component: one row
          of two words, used nowhere else. */}
      <View
        style={[
          styles.pending,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.borderColor,
          },
        ]}
      >
        <Text style={[styles.pendingLabel, { color: colors.text }]}>
          {inCredit ? "In credit" : "Total pending"}
        </Text>
        <Text
          style={[
            styles.pendingAmount,
            { color: outstanding > 0 ? colors.error : colors.success },
          ]}
        >
          {formatRupees(Math.abs(outstanding))}
        </Text>
      </View>

      <BillBreakdown
        title="Current Month"
        billed={currentBill?.total_billed ?? 0}
        paid={currentBill?.amount_paid ?? 0}
        // Nothing to view until the month has been billed, which is what dims the
        // button while the card is showing zeros.
        onViewDetails={currentBill ? () => openBill(currentBill.id) : undefined}
        // Edit doubles as "raise it": the same form creates this month's bill when
        // the card is showing zeros because there is nothing to edit yet.
        onEdit={() =>
          router.push({
            pathname: "/houses/[houseId]/tenants/[tenantId]/billForm",
            params: { houseId, tenantId, month: `${thisMonth}-01` },
          })
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
  pending: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  pendingLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  pendingAmount: {
    fontSize: 18,
    fontWeight: "600",
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

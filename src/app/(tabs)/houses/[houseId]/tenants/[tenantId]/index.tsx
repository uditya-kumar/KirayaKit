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
 * The pending figure is derived from the bills rather than read from
 * `v_tenant_list.total_pending` — see `outstandingAmount`, and the TODO in
 * api/tenants.ts explaining why the view's number is too big.
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
          {error?.message ?? "The tenant is no longer here."}
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
          Total pending
        </Text>
        <Text style={[styles.pendingAmount, { color: colors.error }]}>
          {formatRupees(outstandingAmount(bills))}
        </Text>
      </View>

      {/* TODO: Bill Details (design node ioyXF) is not built yet, so that action
          draws dimmed. */}
      <BillBreakdown
        title="Current Month"
        billed={currentBill?.total_billed ?? 0}
        paid={currentBill?.amount_paid ?? 0}
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
          // TODO: tapping a month should open Bill Details (ioyXF); with nothing
          // to push the card deliberately takes no tap.
          <PaymentCard
            key={bill.id}
            month={bill.bill_month}
            billed={bill.total_billed}
            paid={bill.amount_paid}
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
        message={`This will permanently remove ${tenant.name} and their whole billing history. This action cannot be undone.`}
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

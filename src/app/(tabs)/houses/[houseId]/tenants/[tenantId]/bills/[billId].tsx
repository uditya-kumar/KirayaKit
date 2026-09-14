import type { BillReceipt } from "@/api/bills";
import Button from "@/components/rentComponents/Button";
import {
  ReceiptCard,
  type ReceiptLine,
} from "@/components/rentComponents/ReceiptCard";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useBillReceipt } from "@/hooks/useBillReceipt";
import {
  formatBillMonth,
  formatFloor,
  formatRupees,
  formatUnits,
} from "@/utils/format";
import { useLocalSearchParams } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/**
 * The receipt as WhatsApp will carry it: the same lines the card draws, in text.
 *
 * Built from the lines rather than from the bill again, so the message can never
 * list something different from what is on screen — which is also why it stops at
 * the total: what has been paid and what is still owed are the owner's ledger, not
 * part of the receipt. The asterisks are WhatsApp's own bold markers.
 */
function receiptMessage(bill: BillReceipt, lines: ReceiptLine[]): string {
  return [
    `*RENT RECEIPT*`,
    `${bill.tenant_name} — ${formatBillMonth(bill.bill_month)}`,
    "",
    ...lines.map(
      (line) =>
        `${line.label}${line.sub ? ` (${line.sub})` : ""}: ${formatRupees(line.amount)}`,
    ),
    "",
    `*Total billed: ${formatRupees(bill.total_billed)}*`,
  ].join("\n");
}

/**
 * Bill Details: one month's bill in full, and the button that sends it to the
 * tenant. Design node ioyXF.
 *
 * Every line comes from the bill rather than being worked out here — the rent and
 * the rate are snapshotted on the row, so an old month keeps the terms it was
 * raised under even after the tenant's rent changes.
 */
export default function BillDetailScreen() {
  // The palette follows the device setting, so anything coloured is applied
  // inline; StyleSheet below keeps only the layout, which never changes.
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { billId } = useLocalSearchParams<{ billId: string }>();
  const { data: bill, error, isPending, refetch } = useBillReceipt(billId);
  const [shareError, setShareError] = useState<string | null>(null);

  if (isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (error || !bill) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Couldn&apos;t load this bill
        </Text>
        <Text style={[styles.error, { color: colors.textMuted }]} selectable>
          {error?.message ?? "The bill is no longer here."}
        </Text>
        <Button
          text="Try again"
          textColor={colors.tint}
          backgroundColor="transparent"
          onPress={() => void refetch()}
          paddingHorizontal={0}
        />
      </View>
    );
  }

  // Rent and electricity always, then whatever charges were put on the bill, then
  // the balance carried in from last month. Zeros are kept rather than dropped:
  // the mock lists "IGL (Gas) ₹0", because a line missing from a receipt reads as
  // an oversight while a zero reads as a decision.
  const lines: ReceiptLine[] = [
    { label: "Rent", amount: bill.rent_amount },
    {
      label: "Electricity",
      sub: formatUnits(bill.units_consumed, bill.electricity_rate),
      amount: bill.electricity_amount,
    },
    ...bill.charges,
    { label: "Previous balance", amount: bill.previous_balance },
  ];

  // Prepared out here rather than inside onShare: a hoisted function cannot rely
  // on the narrowing above, since TypeScript has to assume it might be called
  // before the guard has run.
  const message = encodeURIComponent(receiptMessage(bill, lines));

  // Sharing records nothing: handing the text to WhatsApp is all the app can
  // observe, and 0004 dropped bills.shared_at rather than keep a column that
  // would have to guess whether the message was really sent.
  async function onShare() {
    setShareError(null);
    // wa.me rather than the whatsapp:// scheme: it is the documented link and it
    // falls back to the browser instead of failing when WhatsApp is not
    // installed. No recipient in it — mobile numbers are stored as the owner
    // typed them, and wa.me needs a country code it cannot assume.
    try {
      await Linking.openURL(`https://wa.me/?text=${message}`);
    } catch {
      setShareError("Couldn't open WhatsApp on this device.");
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* The mock keeps the button on the screen rather than under the receipt
          (node Z6fZA8 is space_between), so the card scrolls on its own — a bill
          with several extra charges is taller than a phone. */}
      <ScrollView contentContainerStyle={styles.content}>
        <ReceiptCard
          tenantName={bill.tenant_name}
          address={`${formatFloor(bill.floor_number)} · ${bill.house_name}`}
          month={bill.bill_month}
          lines={lines}
          total={bill.total_billed}
        />
      </ScrollView>

      <View style={styles.footer}>
        {shareError ? (
          <Text style={[styles.error, { color: colors.error }]}>
            {shareError}
          </Text>
        ) : null}
        <Button
          text="Share via WhatsApp"
          textColor={colors.buttonText}
          backgroundColor={colors.whatsapp}
          icon={<MessageCircle size={20} color={colors.buttonText} />}
          accessibilityLabel={`Share the ${formatBillMonth(bill.bill_month)} receipt via WhatsApp`}
          onPress={() => void onShare()}
          paddingVertical={16}
          style={styles.share}
        />
      </View>
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  error: {
    fontSize: 13,
    textAlign: "center",
  },
  footer: {
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  // The button spans the footer; Button itself only centres its label.
  share: {
    alignSelf: "stretch",
  },
});

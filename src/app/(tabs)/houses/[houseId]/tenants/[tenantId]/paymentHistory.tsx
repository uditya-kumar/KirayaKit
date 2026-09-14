import type { Bill } from "@/api/bills";
import Button from "@/components/rentComponents/Button";
import { PaymentCard } from "@/components/rentComponents/PaymentCard";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useBills } from "@/hooks/useBills";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Outside the component on purpose: it closes over nothing, so FlashList gets the
// same function on every render instead of a fresh one.
const keyExtractor = (bill: Bill) => bill.id;

/**
 * Payment History: every month a tenant has been billed for, newest first. Design
 * node dam1y.
 *
 * Nothing is fetched that the tenant's own screen has not already loaded — both
 * read the same `["bills", "list", tenantId]` query — so arriving here from "View
 * all" draws immediately and only a pull refetches.
 */
export default function PaymentHistoryScreen() {
  // The palette follows the device setting, so anything coloured is applied
  // inline; StyleSheet below keeps only the layout, which never changes.
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const {
    data: bills,
    error,
    isPending,
    isRefetching,
    refetch,
  } = useBills(tenantId);

  // TODO: tapping a month should open Bill Details (design node ioyXF), which is
  // not built yet; with nothing to push the card deliberately takes no tap.
  const renderItem: ListRenderItem<Bill> = ({ item }) => (
    <PaymentCard
      month={item.bill_month}
      billed={item.total_billed}
      paid={item.amount_paid}
    />
  );

  const emptyTextStyle = [styles.emptyText, { color: colors.text }];
  const emptySubtextStyle = [styles.emptySubtext, { color: colors.textMuted }];

  const listEmpty = isPending ? (
    <View style={styles.listCentered}>
      <ActivityIndicator size="large" color={colors.tint} />
    </View>
  ) : error ? (
    <View style={styles.listCentered}>
      <Text style={emptyTextStyle}>Couldn&apos;t load the history</Text>
      <Text style={emptySubtextStyle} selectable>
        {error.message}
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
    <View style={styles.listCentered}>
      <Text style={emptyTextStyle}>No bills yet</Text>
      <Text style={emptySubtextStyle}>
        Months appear here once this tenant has been billed for one.
      </Text>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlashList
        data={bills ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.textMuted}
          />
        }
      />
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
    // So listEmpty can centre itself with flex: 1 — without it the content
    // container is only as tall as its children, leaving nothing to centre in.
    flexGrow: 1,
  },
  separator: {
    height: 12,
  },
  listCentered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingBottom: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
  },
});

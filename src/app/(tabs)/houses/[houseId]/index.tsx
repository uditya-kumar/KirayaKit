import type { Tenant } from "@/api/tenants";
import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { TenantCard } from "@/components/rentComponents/TenantCard";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useHouses } from "@/hooks/useHouses";
import { useTenants } from "@/hooks/useTenants";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { Stack, useLocalSearchParams } from "expo-router";
import { Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Outside the component on purpose: it closes over nothing, so FlashList gets
// the same function on every render instead of a fresh one.
const keyExtractor = (tenant: Tenant) => tenant.id;

/** Tenants: who lives in one house. Design node hf8HL. */
export default function TenantsScreen() {
  // The palette follows the device setting, so anything coloured is applied
  // inline; StyleSheet below keeps only the layout, which never changes.
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { houseId } = useLocalSearchParams<{ houseId: string }>();
  const {
    data: tenants,
    error,
    isPending,
    isRefetching,
    refetch,
  } = useTenants(houseId);
  const [query, setQuery] = useState("");

  // The mock puts the house name in the title bar, and the param is a uuid. The
  // name comes off the list query, which is already cached when you arrive by
  // tapping a card; on a cold deep link it costs one small request and the bar
  // reads "House" until it lands.
  const { data: houses } = useHouses();
  const house = houses?.find((candidate) => candidate.id === houseId);

  // TODO: the card's chevron should open the tenant profile once
  // houses/[houseId]/tenants/[tenantId] exists — the folder is still empty, so
  // there is nothing to push and the row deliberately has no onPress.
  const renderItem: ListRenderItem<Tenant> = ({ item }) => (
    <TenantCard
      name={item.name}
      floorNumber={item.floor_number}
      monthlyRent={item.monthly_rent}
      totalPending={item.total_pending}
    />
  );

  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!tenants) return [];
    if (!needle) return tenants;
    // Filtered here rather than in the query: one house holds a handful of
    // tenants, and matching as you type beats a round trip per keystroke.
    return tenants.filter((tenant) =>
      tenant.name.toLowerCase().includes(needle),
    );
  }, [tenants, needle]);

  const emptyTextStyle = [styles.emptyText, { color: colors.text }];
  const emptySubtextStyle = [styles.emptySubtext, { color: colors.textMuted }];

  // All three states live here rather than replacing the screen, so the search
  // bar and the count stay put while the list loads or fails.
  const listEmpty = isPending ? (
    <View style={styles.listCentered}>
      <ActivityIndicator size="large" color={colors.tint} />
    </View>
  ) : error ? (
    <View style={styles.listCentered}>
      <Text style={emptyTextStyle}>Couldn&apos;t load the tenants</Text>
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
      <Text style={emptyTextStyle}>
        {needle ? "No tenant matches" : "No tenants yet"}
      </Text>
      <Text style={emptySubtextStyle}>
        {needle
          ? `Nobody named “${query.trim()}” lives here. Try a different spelling.`
          : "Every floor of this house is empty."}
      </Text>
    </View>
  );

  const listHeader = (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {isPending
          ? "Tenants"
          : `${visible.length} ${visible.length === 1 ? "Tenant" : "Tenants"}`}
      </Text>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* The title is set here rather than in ../_layout.tsx because only this
          screen knows which house it is looking at. */}
      <Stack.Screen options={{ title: house?.name ?? "House" }} />

      {/* The search field lives outside the list so it stays put while the
          cards scroll under it; only the count header travels with the list. */}
      <View style={styles.search}>
        <CustomTextInput
          placeholder="Search tenant by name"
          value={query}
          onChangeText={setQuery}
          icon={<Search size={18} color={colors.textMuted} />}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
      <FlashList
        data={visible}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={Separator}
        ListHeaderComponentStyle={styles.listHeaderSpacing}
        ListHeaderComponent={listHeader}
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
    paddingHorizontal: 20,
    paddingBottom: 13,
    // So the three states in listEmpty can centre themselves with flex: 1 —
    // without it the content container is only as tall as its children and
    // there is no leftover space to centre in.
    flexGrow: 1,
  },
  search: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  listHeaderSpacing: {
    paddingBottom: 14,
  },
  separator: {
    height: 14,
  },
  sectionHeader: {
    paddingTop: 10,
    paddingBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
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

import type { House } from "@/api/houses";
import Button from "@/components/rentComponents/Button";
import { HouseCard } from "@/components/rentComponents/HouseCard";
import { SearchBar } from "@/components/rentComponents/SearchBar";
import Colors from "@/constants/Colors";
import { useHouses } from "@/hooks/useHouses";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

const colors = Colors.light;

// Outside the component on purpose: they close over nothing, so FlashList gets
// the same functions on every render instead of fresh ones.
const keyExtractor = (house: House) => house.id;

const renderItem: ListRenderItem<House> = ({ item }) => (
  <HouseCard
    name={item.name}
    address={item.address}
    tenantCount={item.tenant_count ?? 0}
    // TODO: the Tenants screen (design node hf8HL) is not built yet.
  />
);

/** Home: the landlord's properties. */
export default function HomeScreen() {
  const { data: houses, error, isPending, isRefetching, refetch } = useHouses();
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!houses) return [];
    if (!needle) return houses;
    // Filtered here rather than in the query: the list is short, and matching as
    // you type beats a round trip per keystroke.
    return houses.filter((house) => house.name.toLowerCase().includes(needle));
  }, [houses, needle]);

  // All three states live here rather than replacing the screen, so the search
  // bar and the count stay put while the list loads or fails.
  const listEmpty = isPending ? (
    <View style={styles.listCentered}>
      <ActivityIndicator size="large" color={colors.tint} />
    </View>
  ) : error ? (
    <View style={styles.listCentered}>
      <Text style={styles.emptyText}>Couldn&apos;t load your properties</Text>
      <Text style={styles.emptySubtext} selectable>
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
      <Text style={styles.emptyText}>
        {needle ? "No property matches" : "No properties yet"}
      </Text>
      <Text style={styles.emptySubtext}>
        {needle
          ? `Nothing named “${query.trim()}”. Try a different spelling.`
          : "Tap + to add your first one."}
      </Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      {/* The search field lives outside the list so it stays put while the
          cards scroll under it; only the count header travels with the list. */}
      <View style={styles.search}>
        <SearchBar
          placeholder="Search property by name"
          value={query}
          onChangeText={setQuery}
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
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isPending
                ? "Properties"
                : `${visible.length} ${visible.length === 1 ? "Property" : "Properties"}`}
            </Text>
          </View>
        }
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.text,
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
    color: colors.text,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
});

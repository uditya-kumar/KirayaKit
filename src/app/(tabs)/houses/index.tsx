import type { House } from "@/api/houses";
import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { HouseCard } from "@/components/rentComponents/HouseCard";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useHouses } from "@/hooks/useHouses";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { useRouter } from "expo-router";
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
const keyExtractor = (house: House) => house.id;

/** Home: the landlord's properties. */
export default function HomeScreen() {
  // The palette follows the device setting, so anything coloured is applied
  // inline; StyleSheet below keeps only the layout, which never changes.
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { data: houses, error, isPending, isRefetching, refetch } = useHouses();
  const [query, setQuery] = useState("");
  const router = useRouter();

  // The object form rather than a built string so typed routes check the param
  // name against the route.
  const handleHousePress = (house: House) => {
    router.push({
      pathname: "/houses/[houseId]",
      params: { houseId: house.id },
    });
  };

  // Inside the component because the row needs the screen's press handler.
  // FlashList gets a new function each render as a result; the list is short
  // enough that it costs nothing measurable.
  const renderItem: ListRenderItem<House> = ({ item }) => (
    <HouseCard
      name={item.name}
      address={item.address}
      tenantCount={item.tenant_count ?? 0}
      onPress={() => handleHousePress(item)}
    />
  );

  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!houses) return [];
    if (!needle) return houses;
    // Filtered here rather than in the query: the list is short, and matching as
    // you type beats a round trip per keystroke.
    return houses.filter((house) => house.name.toLowerCase().includes(needle));
  }, [houses, needle]);

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
      <Text style={emptyTextStyle}>Couldn&apos;t load your properties</Text>
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
        {needle ? "No property matches" : "No properties yet"}
      </Text>
      <Text style={emptySubtextStyle}>
        {needle
          ? `Nothing named “${query.trim()}”. Try a different spelling.`
          : "Tap + to add your first one."}
      </Text>
    </View>
  );

  const listHeader = (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {isPending
          ? "Properties"
          : `${visible.length} ${visible.length === 1 ? "Property" : "Properties"}`}
      </Text>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* The search field lives outside the list so it stays put while the
          cards scroll under it; only the count header travels with the list. */}
      <View style={styles.search}>
        <CustomTextInput
          placeholder="Search property by name"
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

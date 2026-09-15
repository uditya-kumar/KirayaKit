import type { Tenant } from "@/api/tenants";
import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { DeleteDialog } from "@/components/rentComponents/DeleteDialog";
import {
  DropdownMenu,
  type MenuItem,
} from "@/components/rentComponents/DropdownMenu";
import { TenantCard } from "@/components/rentComponents/TenantCard";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useDeleteHouse } from "@/hooks/useDeleteHouse";
import { useHouses } from "@/hooks/useHouses";
import { useTenants } from "@/hooks/useTenants";
import { neonErrorMessage } from "@/libs/neon-errors";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  EllipsisVertical,
  House,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react-native";
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

/**
 * Tenants: who lives in one house, and what can be done to the house itself.
 * Design node hf8HL.
 *
 * The bar is set from here rather than in ../_layout.tsx: the title is the
 * house's name and the ⋮ button opens the house menu, and this is the only place
 * that knows which house that is — the route param is a uuid.
 */
export default function TenantsScreen() {
  // The palette follows the device setting, so anything coloured is applied
  // inline; StyleSheet below keeps only the layout, which never changes.
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { houseId } = useLocalSearchParams<{ houseId: string }>();
  const {
    data: tenants,
    error,
    isPending,
    isRefetching,
    refetch,
  } = useTenants(houseId);
  const [query, setQuery] = useState("");

  // The name for the title and the confirmation copy comes off the list query,
  // already cached when you arrive by tapping a card; on a cold deep link it is
  // one small request and the bar reads "House" until it lands.
  const { data: houses } = useHouses();
  const house = houses?.find((candidate) => candidate.id === houseId);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { mutate: deleteHouse, isPending: isDeleting } = useDeleteHouse();

  const houseActions: MenuItem[] = [
    {
      key: "edit-house",
      label: "Edit House",
      icon: House,
      // Add House and Edit House are one screen (design nodes umV64 and slGmE);
      // the houseId param is what turns the form into an edit.
      onPress: () =>
        router.push({ pathname: "/houses/houseForm", params: { houseId } }),
    },
    {
      key: "create-tenant",
      label: "Create Tenant",
      icon: UserPlus,
      // Create Tenant and Edit Tenant are one screen (design nodes sB7vt and
      // lXpcT); with no tenantId param the form is a create. The object form
      // rather than a built string, so typed routes check the param name.
      onPress: () =>
        router.push({
          pathname: "/houses/[houseId]/tenantForm",
          params: { houseId },
        }),
    },
    {
      key: "delete-house",
      label: "Delete House",
      icon: Trash2,
      destructive: true,
      onPress: () => {
        setDeleteError(null);
        setConfirmingDelete(true);
      },
    },
  ];

  function onConfirmDelete() {
    setDeleteError(null);
    deleteHouse(houseId, {
      onSuccess: () => {
        setConfirmingDelete(false);
        // This screen is showing a house that no longer exists, and the list it
        // returns to has already been invalidated by the mutation. Deep-linked
        // straight here there is nothing behind it, so the list takes its place.
        if (router.canGoBack()) router.back();
        else router.replace("/houses");
      },
      onError: (err) => setDeleteError(neonErrorMessage(err)),
    });
  }

  const headerRight = () => (
    <DropdownMenu
      accessibilityLabel="House actions"
      items={houseActions}
      style={styles.headerButton}
    >
      <EllipsisVertical size={24} color={colors.text} />
    </DropdownMenu>
  );

  const renderItem: ListRenderItem<Tenant> = ({ item }) => (
    <TenantCard
      name={item.name}
      floorNumber={item.floor_number}
      monthlyRent={item.monthly_rent}
      totalPending={item.total_pending}
      onPress={() =>
        router.push({
          pathname: "/houses/[houseId]/tenants/[tenantId]",
          params: { houseId, tenantId: item.id },
        })
      }
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
      {/* Translated, because this screen is reachable by link: an id that lost a
          character arrives as Postgres 22P02, whose raw text is a complaint
          about uuid syntax rather than about the link. */}
      <Text style={emptySubtextStyle} selectable>
        {neonErrorMessage(error)}
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
      <Stack.Screen options={{ title: house?.name ?? "House", headerRight }} />

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

      <DeleteDialog
        visible={confirmingDelete}
        title="Delete this house?"
        // "and its tenants" is now true: 0005 stamps them deleted with the house,
        // which is what stopped a deleted house's debts from turning up in the
        // Profile totals. Not "permanently" though — nothing is destroyed, it
        // leaves the app, which is the part that matters to the person deciding.
        message={`${house?.name ?? "This house"} will be removed from KirayaKit, along with its tenants and their billing history. This cannot be undone.`}
        confirmText="Delete House"
        onDelete={onConfirmDelete}
        onCancel={() => setConfirmingDelete(false)}
        deleting={isDeleting}
        errorMessage={deleteError}
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
  headerButton: {
    marginRight: 16,
  },
});

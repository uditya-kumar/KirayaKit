import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { Link, Stack } from "expo-router";
import { CirclePlus } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

/**
 * The Home tab's own stack, so Tenants and Add House can push over it while the
 * tab bar stays put. The header belongs to this stack — the tab navigator's is
 * turned off in ../_layout.tsx, or the screen would carry two of them.
 */
export default function HomeLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  // A Link rather than an onPress handler so the header action is a real
  // navigable target — long-press preview and web anchors come for free.
  const addHouseButton = () => (
    <Link href="/houses/houseForm" asChild>
      <Pressable accessibilityRole="button" accessibilityLabel="Add house">
        {({ pressed }) => (
          <CirclePlus
            size={24}
            color={colors.text}
            style={[styles.headerIcon, { opacity: pressed ? 0.5 : 1 }]}
          />
        )}
      </Pressable>
    </Link>
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.cardBackground },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Home",
          headerRight: addHouseButton,
        }}
      />
      {/* One form for both jobs, so it sets its own title: "New House" when
          adding, "Edit House" when a houseId param says which house to load. */}
      <Stack.Screen name="houseForm" />
      {/* Tenants fills in its own bar — the title is the house's name and
          headerRight is the ⋮ actions button, and only that screen knows which
          house either belongs to. */}
      <Stack.Screen name="[houseId]/index" />
      {/* One form for both jobs, so it sets its own title: "Create Tenant" when
          someone is moving in, "Edit Tenant" when a tenantId param says whose
          details are being corrected. */}
      <Stack.Screen name="[houseId]/tenantForm" />
      {/* The tenant's own name is already the first line of the screen, so the
          bar keeps the mock's fixed title. */}
      <Stack.Screen
        name="[houseId]/tenants/[tenantId]/index"
        options={{ title: "Tenant Detail" }}
      />
      <Stack.Screen
        name="[houseId]/tenants/[tenantId]/paymentHistory"
        options={{ title: "Payment History" }}
      />
      {/* One form for both jobs, so it sets its own title: "Create Bill" for a
          month that has never been billed, "Edit Bill" for one that has. */}
      <Stack.Screen name="[houseId]/tenants/[tenantId]/billForm" />
      {/* The receipt names its own month, so the bar keeps the mock's title. */}
      <Stack.Screen
        name="[houseId]/tenants/[tenantId]/bills/[billId]"
        options={{ title: "Bill Details" }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerIcon: {
    marginRight: 16,
  },
});

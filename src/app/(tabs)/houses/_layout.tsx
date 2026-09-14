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
      {/* "Create Tenant" is both the mock's bar title and its button label. */}
      <Stack.Screen
        name="[houseId]/createTenant"
        options={{ title: "Create Tenant" }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerIcon: {
    marginRight: 16,
  },
});

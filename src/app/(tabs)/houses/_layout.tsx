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
  const headerRight = () => (
    <Link href="/houses/createHouse" asChild>
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
          headerRight,
        }}
      />
      {/* "New House" is the mock's bar title; the button on the form says
          "Add House". */}
      <Stack.Screen name="createHouse" options={{ title: "New House" }} />
      {/* TODO: the title should be the house name once the detail screen (design
          node hf8HL) loads it; the param is a uuid, so it can't be the title. */}
      <Stack.Screen name="[houseId]/index" options={{ title: "House" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerIcon: {
    marginRight: 16,
  },
});

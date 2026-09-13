import Colors from "@/constants/Colors";
import { Stack } from "expo-router";
import { CirclePlus } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

const colors = Colors.light;

/**
 * The Home tab's own stack, so Tenants and Add House can push over it while the
 * tab bar stays put. The header belongs to this stack — the tab navigator's is
 * turned off in ../_layout.tsx, or the screen would carry two of them.
 */
export default function HomeLayout() {
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
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add house"
              // TODO: the Add House screen (design node umV64) is not built yet.
              style={({ pressed }) => [
                styles.headerAction,
                pressed && styles.pressed,
              ]}
            >
              <CirclePlus size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    paddingHorizontal: 16,
  },
  pressed: {
    opacity: 0.8,
  },
});

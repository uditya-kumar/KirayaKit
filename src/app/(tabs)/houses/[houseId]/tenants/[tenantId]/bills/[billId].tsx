import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

/**
 * Bill Details — a single month's bill in full.
 *
 * TODO: the Bill Details screen (design node ioyXF) is not built yet. The route
 * exists because expo-router requires a default export from every file under
 * `app/`, and an empty file fails that check. Nothing navigates here yet:
 * Tenant Detail's month cards take no tap and "View Details" draws dimmed.
 */
export default function BillDetailScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: "Bill Details" }} />
      <Text style={[styles.text, { color: colors.textMuted }]}>
        This screen isn&apos;t built yet.
      </Text>
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  text: {
    fontSize: 14,
    textAlign: "center",
  },
});

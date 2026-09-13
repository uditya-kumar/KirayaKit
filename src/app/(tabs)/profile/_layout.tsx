import Colors from "@/constants/Colors";
import { Stack } from "expo-router";

const colors = Colors.light;

/** The Settings tab's stack — same shape as the Home tab's, room to push into. */
export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.cardBackground },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Settings" }} />
    </Stack>
  );
}

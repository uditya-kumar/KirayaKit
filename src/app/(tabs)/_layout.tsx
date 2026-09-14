import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { Tabs } from "expo-router";
import { House, Settings } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const colors = Colors.light;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.tabBackground,
          height: 60 + insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="houses"
        options={{
          title: "Home",
          tabBarLabel: "Houses",
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

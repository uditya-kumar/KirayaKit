import Colors from "@/constants/Colors";
import { Tabs } from "expo-router";
import { House, Settings } from "lucide-react-native";

const colors = Colors.light;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: { backgroundColor: colors.tabBackground },
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

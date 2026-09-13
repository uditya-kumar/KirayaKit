import { colors } from "@/constants/design";
import { BatteryFull, SignalHigh, Wifi } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

/**
 * The mock status bar from the design, kept so a screen can be rendered next to
 * the mock and compared pixel for pixel.
 *
 * This is not the real thing: on a device the system draws the status bar and
 * expo-status-bar controls its style. Use this only in previews and screenshots.
 */
export function StatusBar({ time = "9:41" }: { time?: string }) {
  return (
    <View style={styles.bar}>
      <Text style={styles.time}>{time}</Text>
      <View style={styles.icons}>
        <SignalHigh size={18} color={colors.text} />
        <Wifi size={18} color={colors.text} />
        <BatteryFull width={24} height={18} color={colors.text} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    height: 50,
    paddingHorizontal: 32,
    backgroundColor: colors.card,
  },
  time: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
  },
  icons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
});

import Colors from "@/constants/Colors";
import { StyleSheet, Text, View } from "react-native";

const colors = Colors.light;

/** Add House: the form for creating a property. */
export default function CreateHouseScreen() {
  return (
    <View style={styles.screen}>
      {/* TODO: build the form to match design node umV64. */}
      <Text style={styles.placeholder}>Add House</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  placeholder: {
    fontSize: 16,
    color: colors.textMuted,
  },
});

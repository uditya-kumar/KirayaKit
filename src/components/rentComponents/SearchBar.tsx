import Colors from "@/constants/Colors";
import { Search } from "lucide-react-native";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";

const colors = Colors.light;

/**
 * The filter field at the top of a list screen.
 *
 * Unlike the form inputs this one is outlined — it sits directly on the screen
 * background rather than inside a card, so the border is what defines it.
 */
export function SearchBar({
  placeholder = "Search",
  style,
  ...inputProps
}: TextInputProps) {
  return (
    <View style={styles.bar}>
      <Search size={18} color={colors.textMuted} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        {...inputProps}
        style={[styles.input, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
    color: colors.text,
    padding: 0,
  },
});

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import type { ReactNode } from "react";
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
  View,
} from "react-native";

type CustomTextInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** Sizes and places the whole field, label included — `flex`, `width`, margins. */
  style?: StyleProp<ViewStyle>;
  keyboardType?: KeyboardTypeOptions;
  /** Omit for a bare field, like the search box or a login form. */
  labelText?: string;
  /** Drawn inside the box, ahead of the text: a search glyph, a ₹ sign. */
  icon?: ReactNode;
} & Omit<
  TextInputProps,
  "value" | "onChangeText" | "placeholder" | "style" | "keyboardType"
>;

/**
 * Every text field in the app. The box carries the border and the padding so an
 * `icon` can sit beside the text; the rest of the TextInput props pass straight
 * through, which is how the auth screens get `secureTextEntry` and friends.
 */
function CustomTextInput({
  value,
  onChangeText,
  placeholder,
  style,
  keyboardType,
  labelText,
  icon,
  ...inputProps
}: CustomTextInputProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const labelStyle = [styles.label, { color: colors.text }];

  const fieldStyle = [
    styles.field,
    {
      backgroundColor: colors.cardBackground,
      borderColor: colors.borderColor,
    },
  ];

  return (
    // `style` goes on the outer view, not the box: a field in a row needs its
    // `flex` or `width` to apply to the label as well.
    <View style={[styles.container, style]}>
      {labelText ? <Text style={labelStyle}>{labelText}</Text> : null}
      <View style={fieldStyle}>
        {icon}
        <TextInput
          accessibilityLabel={labelText ?? placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          autoCorrect={false}
          keyboardType={keyboardType}
          {...inputProps}
          style={[styles.input, { color: colors.text }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 45,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
    // The box supplies the padding; TextInput adds its own on Android.
    padding: 0,
  },
});

export default CustomTextInput;

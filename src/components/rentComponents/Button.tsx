import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  type StyleProp,
} from "react-native";

type ButtonProps = {
  text: string;
  textColor: string;
  backgroundColor: string;
  borderColor?: string;
  onPress?: () => void;
  paddingVertical?: number;
  paddingHorizontal?: number;
  loading?: boolean;
  /** Greyed out and unpressable, with no spinner — a form that is not ready. */
  disabled?: boolean;
  /** Overrides `text` for screen readers, when the label needs more context. */
  accessibilityLabel?: string;
  icon?: ReactNode;
  /**
   * Layout only: where the button sits and how wide it is (`alignSelf`, `flex`,
   * margins). Colour, padding and radius come from the props above so that
   * every button in the app matches.
   */
  style?: StyleProp<ViewStyle>;
};

/**
 * The app's one button. Colours come in as props rather than from the tokens
 * because the mock draws several treatments — blue primary, red destructive,
 * bordered outline — and only the caller knows which it is; `borderColor`
 * decides on its own whether there is a border at all.
 */
function Button({
  text,
  textColor,
  backgroundColor,
  borderColor = "transparent",
  onPress,
  paddingVertical = 11,
  loading = false,
  paddingHorizontal = 15,
  disabled = false,
  accessibilityLabel,
  icon,
  style,
}: ButtonProps) {
  const inactive = loading || disabled;

  const buttonBaseStyle: ViewStyle = {
    paddingVertical,
    paddingHorizontal,
    backgroundColor,
    borderColor,
    borderWidth: borderColor !== "transparent" ? 1 : 0,
  };

  const textColorStyle = { color: textColor };

  const getPressableStyle = ({ pressed }: { pressed: boolean }) => [
    styles.button,
    buttonBaseStyle,
    { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
    style,
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      // Announced as busy, and unpressable, while it waits or is not ready.
      accessibilityState={{ busy: loading, disabled: inactive }}
      style={getPressableStyle}
      disabled={inactive}
      onPress={!inactive ? onPress : undefined}
    >
      {icon}
      <Text
        style={[styles.text, textColorStyle, icon ? styles.textWithIcon : null]}
      >
        {text}
      </Text>

      {loading && (
        <ActivityIndicator
          size="small"
          color={textColor}
          style={styles.spinner}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    justifyContent: "center",
  },
  spinner: {
    marginLeft: 10,
  },
  text: {
    fontWeight: "600",
    fontSize: 14,
  },
  textWithIcon: {
    marginLeft: 6,
  },
});

export default Button;

import Button from "@/components/rentComponents/Button";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { StyleSheet } from "react-native";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
};

type LinkButtonProps = {
  label: string;
  onPress: () => void;
};

export function PrimaryButton({
  label,
  onPress,
  busy,
  disabled,
}: PrimaryButtonProps) {
  const theme = Colors[useColorScheme() ?? "light"];
  return (
    <Button
      text={label}
      textColor={theme.buttonText}
      backgroundColor={theme.buttonBackground}
      onPress={onPress}
      loading={busy}
      disabled={disabled}
      paddingVertical={14}
      style={styles.button}
    />
  );
}

/** Text link used for "already have an account?" style navigation. */
export function LinkButton({ label, onPress }: LinkButtonProps) {
  const theme = Colors[useColorScheme() ?? "light"];
  return (
    <Button
      text={label}
      textColor={theme.tint}
      backgroundColor="transparent"
      onPress={onPress}
      paddingVertical={8}
    />
  );
}

const styles = StyleSheet.create({
  // Layout only; Button draws the rest.
  button: {
    marginTop: 4,
    minHeight: 48,
  },
});

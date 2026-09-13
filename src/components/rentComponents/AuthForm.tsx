import Button from "@/components/rentComponents/Button";
import { Text, View } from "@/components/Themed";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  error?: string | null;
  children: React.ReactNode;
};

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

/** Screen shell: centred column with a title and an optional error line. */
export function AuthShell({
  title,
  subtitle,
  error,
  children,
}: AuthShellProps) {
  const theme = Colors[useColorScheme() ?? "light"];
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {error ? (
        <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
      ) : null}
      {children}
    </View>
  );
}

export function Field(props: TextInputProps) {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];
  return (
    <TextInput
      {...props}
      style={[
        styles.field,
        { color: theme.text, borderColor: theme.borderColor },
        props.style,
      ]}
      placeholderTextColor={theme.placeholder}
    />
  );
}

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
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.7,
    marginBottom: 4,
  },
  error: {
    fontSize: 14,
  },
  field: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  // Layout only; Button draws the rest.
  button: {
    marginTop: 4,
    minHeight: 48,
  },
});

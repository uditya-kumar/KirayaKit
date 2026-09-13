import Colors from "@/constants/Colors";
import { Text, View } from "@/components/Themed";
import { useColorScheme } from "@/components/useColorScheme";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
} from "react-native";

/** Screen shell: centred column with a title and an optional error line. */
export function AuthShell({
  title,
  subtitle,
  error,
  children,
}: {
  title: string;
  subtitle?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
        { color: theme.text, borderColor: theme.tabIconDefault },
        props.style,
      ]}
      placeholderTextColor={theme.tabIconDefault}
    />
  );
}

export function PrimaryButton({
  label,
  onPress,
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const scheme = useColorScheme() ?? "light";
  const tint = Colors[scheme].tint;
  const isDisabled = busy || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: tint, opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonLabel} lightColor="#fff" darkColor="#000">
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Text link used for "already have an account?" style navigation. */
export function LinkButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const scheme = useColorScheme() ?? "light";
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.link}>
      <Text style={{ color: Colors[scheme].tint }}>{label}</Text>
    </Pressable>
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
    color: "#d92d20",
    fontSize: 14,
  },
  field: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    minHeight: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  link: {
    alignItems: "center",
    paddingVertical: 8,
  },
});

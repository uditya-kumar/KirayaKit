import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { Text, View } from "@/components/Themed";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { clerkErrorMessage } from "@/libs/clerk-errors";
import { useSignIn } from "@clerk/expo";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";

export default function SignInScreen() {
  const theme = Colors[useColorScheme() ?? "light"];
  // @clerk/expo v4 exposes the signals API: calls resolve to { error } instead
  // of throwing, and fetchStatus is the in-flight flag.
  const { signIn, fetchStatus } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const busy = fetchStatus === "fetching";

  async function onSignIn() {
    if (busy) return;
    setError(null);

    const attempt = await signIn.password({
      identifier: email.trim(),
      password,
    });
    if (attempt.error) {
      setError(clerkErrorMessage(attempt.error));
      return;
    }
    if (signIn.status !== "complete") {
      // Two-factor or another second step, which this screen doesn't collect.
      setError(`Sign-in needs another step (${signIn.status}).`);
      return;
    }

    // finalize() activates the session, which flips useAuth().isSignedIn — the
    // root layout guards on that, so there is no navigation to do here.
    const done = await signIn.finalize();
    if (done.error) {
      setError(clerkErrorMessage(done.error));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.subtitle}>Rentica</Text>
      {error ? (
        <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
      ) : null}
      <CustomTextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <CustomTextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        secureTextEntry
        onSubmitEditing={onSignIn}
        returnKeyType="go"
      />
      <Button
        text="Sign in"
        textColor={theme.buttonText}
        backgroundColor={theme.buttonBackground}
        onPress={onSignIn}
        loading={busy}
        disabled={!email || !password}
        paddingVertical={14}
        style={styles.primary}
      />
      <Button
        text="No account? Sign up"
        textColor={theme.tint}
        backgroundColor="transparent"
        onPress={() => router.push("/sign-up")}
        paddingVertical={8}
      />
    </View>
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
  // Layout only; Button draws the rest.
  primary: {
    marginTop: 4,
    minHeight: 48,
  },
});

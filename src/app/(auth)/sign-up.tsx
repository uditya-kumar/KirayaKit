import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { Text, View } from "@/components/Themed";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { clerkErrorMessage } from "@/libs/clerk-errors";
import { useSignUp } from "@clerk/expo";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";

export default function SignUpScreen() {
  const theme = Colors[useColorScheme() ?? "light"];
  const { signUp, fetchStatus } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  // Clerk emails a 6-digit code after the sign-up is created, so this screen
  // has two states: collect credentials, then collect the code.
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = fetchStatus === "fetching";

  async function onSignUp() {
    if (busy) return;
    setError(null);

    const created = await signUp.password({
      emailAddress: email.trim(),
      password,
    });
    if (created.error) {
      setError(clerkErrorMessage(created.error));
      return;
    }

    const sent = await signUp.verifications.sendEmailCode();
    if (sent.error) {
      setError(clerkErrorMessage(sent.error));
      return;
    }
    setAwaitingCode(true);
  }

  async function onVerify() {
    if (busy) return;
    setError(null);

    const verified = await signUp.verifications.verifyEmailCode({
      code: code.trim(),
    });
    if (verified.error) {
      setError(clerkErrorMessage(verified.error));
      return;
    }
    if (signUp.status !== "complete") {
      setError(`Sign-up needs another step (${signUp.status}).`);
      return;
    }

    const done = await signUp.finalize();
    if (done.error) {
      setError(clerkErrorMessage(done.error));
    }
  }

  if (awaitingCode) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to {email.trim()}.
        </Text>
        {error ? (
          <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
        ) : null}
        <CustomTextInput
          value={code}
          onChangeText={setCode}
          placeholder="Verification code"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          onSubmitEditing={onVerify}
          returnKeyType="go"
        />
        <Button
          text="Verify"
          textColor={theme.buttonText}
          backgroundColor={theme.buttonBackground}
          onPress={onVerify}
          loading={busy}
          disabled={!code}
          paddingVertical={14}
          style={styles.primary}
        />
        <Button
          text="Use a different email"
          textColor={theme.tint}
          backgroundColor="transparent"
          onPress={async () => {
            await signUp.reset();
            setAwaitingCode(false);
            setCode("");
            setError(null);
          }}
          paddingVertical={8}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
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
        autoComplete="new-password"
        textContentType="newPassword"
        secureTextEntry
        onSubmitEditing={onSignUp}
        returnKeyType="go"
      />
      <Button
        text="Sign up"
        textColor={theme.buttonText}
        backgroundColor={theme.buttonBackground}
        onPress={onSignUp}
        loading={busy}
        disabled={!email || !password}
        paddingVertical={14}
        style={styles.primary}
      />
      <Button
        text="Already have an account? Sign in"
        textColor={theme.tint}
        backgroundColor="transparent"
        onPress={() => router.replace("/sign-in")}
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

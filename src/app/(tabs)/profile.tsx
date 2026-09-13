import { PrimaryButton } from "@/components/AuthForm";
import { Text, View } from "@/components/Themed";
import { useDataApi } from "@/lib/data-api";
import { useAuth, useUser } from "@clerk/expo";
import { useState } from "react";
import { StyleSheet } from "react-native";

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut, userId } = useAuth();
  const db = useDataApi();
  const [probe, setProbe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Proves the whole chain in one tap: Clerk token -> Neon Data API -> RLS.
  // ensure_profile() creates this landlord's users row on first run; the house
  // count then comes back through the owner policy, so a number here means the
  // JWT was accepted and auth.user_id() matched.
  async function checkDatabase() {
    setBusy(true);
    setProbe(null);
    try {
      const profile = await db.rpc("ensure_profile");
      if (profile.error) throw new Error(profile.error.message);

      const houses = await db.from("houses").select("id", { count: "exact", head: true });
      if (houses.error) throw new Error(houses.error.message);

      setProbe(`Connected. Profile ready, ${houses.count ?? 0} house(s).`);
    } catch (err) {
      setProbe(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>
        {user?.primaryEmailAddress?.emailAddress ?? "Signed in"}
      </Text>
      <Text style={styles.meta} selectable>
        {userId}
      </Text>

      <View
        style={styles.separator}
        lightColor="#eee"
        darkColor="rgba(255,255,255,0.1)"
      />

      <PrimaryButton
        label="Check database connection"
        onPress={checkDatabase}
        busy={busy}
      />
      {probe ? <Text style={styles.meta}>{probe}</Text> : null}

      <PrimaryButton label="Sign out" onPress={() => signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  email: {
    fontSize: 16,
  },
  meta: {
    fontSize: 13,
    opacity: 0.6,
  },
  separator: {
    marginVertical: 24,
    height: 1,
    width: "100%",
  },
});

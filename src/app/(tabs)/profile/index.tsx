import Button from "@/components/rentComponents/Button";
import Colors from "@/constants/Colors";
import { queryClient } from "@/libs/query-client";
import { useAuth } from "@clerk/expo";
import { StyleSheet, View } from "react-native";

const colors = Colors.light;

/**
 * Settings — empty until the mock's Settings screen is built.
 *
 * Sign out is the one thing kept: it is the only way out of the signed-in app,
 * and the guard in the root layout has no other exit.
 */
export default function ProfileScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.screen}>
      <Button
        text="Sign out"
        textColor={colors.error}
        backgroundColor="transparent"
        onPress={async () => {
          await signOut();
          // The cache holds rows RLS returned for this session; the next person
          // to sign in on this device must not see them.
          queryClient.clear();
        }}
        paddingVertical={12}
        paddingHorizontal={0}
        style={styles.signOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  // Hugs its label at the left edge instead of stretching across the screen,
  // which is what a full-width red bar would look like.
  signOut: {
    alignSelf: "flex-start",
  },
});

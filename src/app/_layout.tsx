import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useColorScheme } from "@/components/useColorScheme";
import { queryClient } from "@/libs/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StrictMode, useEffect } from "react";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add your key to .env.local.\nRun: 1) clerk auth login  2) clerk link  3) clerk env pull — then restart the dev server.",
  );
}

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {/* Inside ClerkProvider: every query carries that session's token, so the
          cache must not outlive it. */}
      <QueryClientProvider client={queryClient}>
        <StrictMode>
          <RootLayoutNav />
        </StrictMode>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

/**
 * The root navigator, and the only place route access is decided.
 *
 * Stack.Protected is client-side navigation only — on web the bundle for a
 * guarded route is still fetchable by anyone who knows the URL. It keeps the UI
 * honest; the data is kept honest by Neon's row-level security, which checks the
 * Clerk token on every request.
 */
function RootLayoutNav() {
  const colorScheme = useColorScheme();
  // Clerk reads the cached session from expo-secure-store on startup. Until it
  // has, isSignedIn is false for a returning user, so hold the splash screen
  // rather than flashing the sign-in screen at someone already signed in.
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  if (!isLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          {/* A denied route falls back to the anchor route, or to the first
              screen still available if the anchor itself is guarded. `index` is
              guarded with the rest so that a signed-out visitor cannot land on
              it: it only redirects into (tabs), which would bounce straight
              back. With it removed, (auth) is the first screen left. */}
          <Stack.Protected guard={isSignedIn}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="message"
              options={{ presentation: "modal", title: "Message" }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!isSignedIn}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>
          {/* +not-found stays outside both guards: a bad URL should show the
              404 either way, and its "Go to home screen" link resolves through
              the guards above. */}
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

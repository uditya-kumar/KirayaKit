import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import {
  AppearanceProvider,
  useColorScheme,
} from "@/components/useColorScheme";
import { queryClient } from "@/libs/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StrictMode, useEffect } from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";
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
  // The anchor a denied route falls back to, and what a deep link into a nested
  // screen gets behind it so Back leads into the app rather than out of it.
  initialRouteName: "(tabs)",
};

// Held until Clerk has read the cached session, so a returning user never sees
// the sign-in screen flash past. The promise rejects when the splash screen has
// already gone — a fast refresh re-runs this module — and that is nothing to act
// on, so it is swallowed rather than left to become an unhandled rejection.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {/* Inside ClerkProvider: every query carries that session's token, so the
          cache must not outlive it. */}
      <QueryClientProvider client={queryClient}>
        <StrictMode>
          {/* Every form in the app reaches the keyboard through this one native
              listener, so it is mounted once here rather than per screen. It is
              what makes a focused field move on Android at all: the app is
              edge-to-edge, so the window is no longer resized when the keyboard
              opens and React Native's own KeyboardAvoidingView has nothing to
              react to.

              Both props tell it that: without them it assumes the app is not
              edge-to-edge and gives the whole thing a top margin the height of
              the status bar and a bottom one the height of the navigation bar, to
              imitate an ordinary window. Every screen here already offsets itself
              — stack headers through safe-area-context, the tab bar through
              insets.bottom — so those margins stack on insets already applied and
              leave a second status bar's worth of blank space above every header.
              The library does detect edge-to-edge itself, but only from React
              Native's feature flag, which is off on Android 14 and older however
              the app is really laid out. */}
          <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
            {/* Above the navigator, because the theme it picks and every screen's
                colours read from the same choice. */}
            <AppearanceProvider>
              <RootLayoutNav />
            </AppearanceProvider>
          </KeyboardProvider>
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
      // Swallowed for the same reason as preventAutoHideAsync above, and one
      // more: StrictMode runs this effect twice in development, and the second
      // call rejects because the splash screen is already gone.
      SplashScreen.hideAsync().catch(() => {});
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

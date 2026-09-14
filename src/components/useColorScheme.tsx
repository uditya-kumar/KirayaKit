import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

/** The two schemes `Colors` defines. */
type Scheme = "light" | "dark";

type Appearance = {
  /** What is in force: the landlord's choice if they made one, else the device's. */
  scheme: Scheme | null;
  /** Fixes the scheme; `null` hands the choice back to the device. */
  setScheme: (scheme: Scheme | null) => void;
};

const AppearanceContext = createContext<Appearance | null>(null);

// A theme preference is not a secret, but expo-secure-store is the only key-value
// store the app already ships (Clerk keeps its session there) and this is one
// short string — not worth a second storage dependency.
const STORED_SCHEME = "appearance-scheme";

/**
 * Holds the landlord's appearance choice for the whole app, so the toggle on the
 * Profile screen can override what the device asks for.
 *
 * Mounted in the root layout, above every screen that reads `useColorScheme`.
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useDeviceScheme();
  // Null means "no choice made" — follow the device, which is also what someone
  // who has never touched the toggle should see.
  const [chosen, setChosen] = useState<Scheme | null>(null);

  // Read once on startup. The device setting is in force until this lands, so the
  // worst case is a stored dark choice painting light for a frame.
  useEffect(() => {
    let current = true;
    readStoredScheme().then((stored) => {
      if (current && stored) setChosen(stored);
    });
    return () => {
      current = false;
    };
  }, []);

  const appearance = useMemo<Appearance>(
    () => ({
      scheme: chosen ?? deviceScheme,
      setScheme: (scheme) => {
        // Applied immediately and stored in the background: the toggle must not
        // wait on the disk to move, and a failed write only costs the choice on
        // the next launch.
        setChosen(scheme);
        void storeScheme(scheme);
      },
    }),
    [chosen, deviceScheme],
  );

  return (
    <AppearanceContext.Provider value={appearance}>
      {children}
    </AppearanceContext.Provider>
  );
}

/**
 * The scheme to paint with: `Colors[useColorScheme() ?? "light"]`.
 *
 * Returns the landlord's choice when they have made one, otherwise the device's
 * setting — and the device's alone when called above `AppearanceProvider`.
 */
export function useColorScheme(): Scheme | null {
  const appearance = useContext(AppearanceContext);
  const deviceScheme = useDeviceScheme();
  return appearance ? appearance.scheme : deviceScheme;
}

/**
 * For the one control that changes the scheme rather than following it — the
 * Appearance row on the Profile screen.
 */
export function useAppearance(): Appearance {
  const appearance = useContext(AppearanceContext);
  if (!appearance) {
    throw new Error("useAppearance must be used inside AppearanceProvider.");
  }
  return appearance;
}

// React Native's `useColorScheme` can return `'unspecified'` in addition to
// `'light' | 'dark' | null`. Narrow it so callers only ever deal with the two
// schemes our theme defines.
function useDeviceScheme(): Scheme | null {
  const scheme = useRNColorScheme();
  return scheme === "light" || scheme === "dark" ? scheme : null;
}

// Both helpers swallow their errors: SecureStore is unavailable on web and can
// fail on a locked device, and neither is a reason to break the app over a theme.
async function readStoredScheme(): Promise<Scheme | null> {
  try {
    const stored = await SecureStore.getItemAsync(STORED_SCHEME);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

async function storeScheme(scheme: Scheme | null): Promise<void> {
  try {
    if (scheme === null) {
      await SecureStore.deleteItemAsync(STORED_SCHEME);
    } else {
      await SecureStore.setItemAsync(STORED_SCHEME, scheme);
    }
  } catch {
    // Nothing to do — the choice simply will not survive a restart.
  }
}

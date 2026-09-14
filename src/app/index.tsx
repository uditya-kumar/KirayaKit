import { Redirect } from "expo-router";

/**
 * `/` has no screen of its own now that the house list lives at
 * (tabs)/houses/index.tsx, so this sends it on. Without it `expo start --web`
 * opens on the not-found screen, and any link to `/` dead-ends.
 *
 * This route is itself inside the signed-in guard in _layout.tsx, so it never
 * renders for a visitor who is not signed in — they get the sign-in screen,
 * which is the only screen the root stack leaves available.
 */
export default function Index() {
  return <Redirect href="/houses" />;
}

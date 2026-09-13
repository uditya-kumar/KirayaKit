import { Redirect } from "expo-router";

/**
 * `/` has no screen of its own now that the house list lives at
 * (tabs)/houses/index.tsx, so this sends it on. Without it `expo start --web`
 * opens on the not-found screen, and any link to `/` dead-ends.
 *
 * If the visitor is not signed in, the guard in _layout.tsx has already removed
 * the (tabs) group, so this resolves to the sign-in screen instead.
 */
export default function Index() {
  // `/houses/index` rather than `/houses`: both resolve to the same screen, but
  // the folder-index form is the one expo-router's generated route types accept.
  return <Redirect href="/houses/index" />;
}

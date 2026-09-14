# RentTrack

Expo (SDK 57) + expo-router app for landlords tracking houses, tenants, bills and
receipts. Two moving parts only: **this client and a Neon Postgres database**.
There is no backend server of ours and there will not be one — anything that
looks like it needs a server belongs in SQL (a view, an RPC) or in the client.

Auth is Clerk; data access is the Neon Data API (PostgREST) with row-level
security. The Clerk session token is what authorises every request.

## Verifying a change

```bash
npx tsc --noEmit                  # must be clean before you call anything done
npx expo export --platform web    # catches route and bundling problems
```

`npm run lint` (`expo lint`) is currently broken in this repo — an unrelated
`zod-validation-error` export map failure. Don't spend time on it; use the two
commands above.

After any change to `src/db/migrations/`, run `npm run gen-types` to regenerate
`src/types/database.ts`. It is committed, so it goes stale silently if skipped.

Never add a dependency without asking first. Never print or commit the contents
of `.env.local`; ask for missing config by name instead.

## Folder structure — where to write what

```
src/
  app/            Routes only. One file = one screen or layout, nothing else.
    _layout.tsx     Providers + the auth guards. The only place route access is decided.
    (auth)/         sign-in, sign-up. Rendered only when signed out.
    (tabs)/         The signed-in app. Each tab is a folder with its own Stack.
  api/            One module per domain noun (houses.ts, profile.ts). Talks to Neon.
  hooks/          use<Thing>.ts — wraps an api function in React Query.
  components/
    rentComponents/  The app's own presentational components.
    Themed.tsx       Template Text/View. Only the auth screens and the two
                     leftover template routes (+not-found, message) use it;
                     new screens style with Colors directly.
  constants/Colors.ts  Every colour in the app. Nothing else holds a hex.
  libs/           Third-party client setup: neon.ts, query-client.ts, clerk-errors.ts.
  types/database.ts    GENERATED. Never edit by hand.
  utils/format.ts      Display formatting (₹ amounts, floors, bill months).
  db/migrations/  Numbered SQL. The schema's source of truth.
```

`@/` is the alias for `src/` — always use it, never a relative `../../` import.

### Adding a feature, in order

1. **Schema** — if new data is needed, add a numbered migration in
   `src/db/migrations/`. Every table gets RLS enabled and an owner policy; list
   screens read from a `v_*` view (`security_invoker = true`) so one request
   fills a screen; multi-step writes go in a SQL function called via `.rpc()`.
2. `npm run gen-types`.
3. **`src/api/<noun>.ts`** — one exported `async function` per query. It selects
   an explicit column list, `throw`s on `error`, and narrows the generated
   nullable row type into a hand-written domain type (see `House` in
   `api/houses.ts`). No React in this layer. Do not filter by `owner_id` — RLS
   already scopes rows, and a redundant filter reads like the security lives here.
4. **`src/hooks/use<Thing>.ts`** — the React Query wrapper. Keys are tuples,
   `["houses", "list"] as const`. Keep it to a few lines; logic goes in `api/`.
5. **Screen** in `src/app/...` — calls the hook, owns the loading / error / empty
   states, holds screen-local UI state (search text, dialog open).
6. **Component** in `rentComponents/` only if the piece is reused or the screen is
   getting long.

### Layer rules

- Components are presentational: props in, callbacks out. They never fetch, never
  navigate, never read the query cache. A screen passes `onPress`.
- Writes invalidate their query key. Never rely on `staleTime` to refresh a list
  after an insert or delete.
- Sign-out must `queryClient.clear()` — the cache holds rows RLS returned for a
  session that has ended.
- Route access lives in `src/app/_layout.tsx` and nowhere else. It uses
  `Stack.Protected guard={isSignedIn}` / `guard={!isSignedIn}`, and holds the
  splash until Clerk's `isLoaded`. Guards are client-side only; RLS is the actual
  enforcement.

## Shared components — use them, don't rebuild them

- **`Button`** — every labelled, tappable thing in the app. Colours, padding and
  `loading` / `disabled` are props; the `style` prop is layout only (`alignSelf`,
  `flex`, margins). Never hand-roll a `Pressable` with a `Text` inside it.
- **`CustomTextInput`** — every text field. `labelText` and `icon` are optional;
  remaining `TextInputProps` pass through. `style` sizes the whole field.
- **`DateField`** — every date in a form. It looks like `CustomTextInput` but the
  box opens the platform's date picker, so a day is always picked and never
  typed; it takes and returns `Date | null` and displays DD/MM/YYYY. Converting
  that to what a `date` column stores is the screen's job — see `toDateColumn` in
  `tenantForm.tsx`. Never put a date in a `CustomTextInput`.

  It drives `@react-native-community/datetimepicker` directly —
  `DateTimePickerAndroid.open()` on Android, the picker inside our own sheet on
  iOS — with `onValueChange`. Don't reach for
  `react-native-modal-datetime-picker`: its latest release still passes the
  deprecated `onChange`, which warns on every mount.
- Icon-only controls stay a plain `Pressable` with an accessible label.

If a new shared primitive is genuinely needed, put it in `rentComponents/` and
migrate the existing call sites in the same change — one component per job, no
parallel implementations.

## Code style

Match the surrounding file. In short:

- **Colours**: every colour comes from `Colors`, picked at runtime so the app
  follows the device's light/dark setting:

  ```ts
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  ```

  `useColorScheme` is `@/components/useColorScheme`. Because `colors` is only
  known inside the component, `StyleSheet.create` holds **layout only** and
  colours are applied inline: `style={[styles.screen, { backgroundColor:
  colors.background }]}`, or a named array above the JSX
  (`const emptyTextStyle = [styles.emptyText, { color: colors.text }]`) when the
  same pair is used more than once. Never put a colour inside
  `StyleSheet.create`. No hex literals outside `Colors.ts` (box-shadow black with
  alpha is the one exception — that's an elevation, not a colour).

  Older files still hold a module-scope `const colors = Colors.light;`
  (`rentComponents/*`, the profile screen, the tab and stack layouts). That is
  the shape being migrated away from — convert a file when you next touch it.
- **No design-token file.** Radii, spacing and font sizes are written as plain
  numbers where they're used. `src/constants/design.ts` was deliberately deleted;
  don't reintroduce it.
- **Styles**: one `StyleSheet.create` at the bottom of the file, keys named for
  the role (`screen`, `card`, `listCentered`, `emptySubtext`). Dynamic values go
  in an inline array: `style={[styles.card, pressed && styles.pressed]}`.
- **Props**: a `type <Name>Props = { … }` above the component, destructured in the
  signature with defaults. No `React.FC`, no `interface`, no prop-spreading
  except the deliberate `...rest` passthrough in `CustomTextInput`.
- **Exports**: screens and layouts are `export default` (expo-router requires
  it). For components either form is fine — `Button` and `CustomTextInput` are
  default exports, the rest are named; follow the file you're editing.
- **Imports**: one block, no blank-line grouping. Most files are sorted
  alphabetically by module path (editor "organize imports"), which puts `@/`
  first; keep whatever order the file you're editing already has. Use
  `import type` for type-only imports.
- **Formatting**: 2-space indent, double quotes, semicolons, trailing commas —
  Prettier defaults. There is no Prettier config; don't run it across files you
  aren't editing, it churns unrelated ones.
- **Accessibility is not optional**: `accessibilityRole` and a real
  `accessibilityLabel` on anything tappable; `accessibilityState` for busy and
  disabled.
- **TypeScript**: `strict` is on. No `any`, no non-null `!` on data from the
  network — narrow it (`row is House`) or handle the null.

### Comments

This is the part of the style that matters most here. Comments explain **why the
code is the way it is**, never what the line does. Written as prose, full
sentences, and they earn their place by recording a decision, a constraint, or a
trap:

```ts
// Filtered here rather than in the query: the list is short, and matching as
// you type beats a round trip per keystroke.
```

```ts
// The box supplies the padding; TextInput adds its own on Android.
```

Every exported function, component and screen gets a short doc comment saying
what it is for and anything surprising about it. Non-obvious props get a one-line
`/** … */`. Unbuilt work is marked with a `TODO:` that names the design node,
e.g. `// TODO: the Add House screen (design node umV64) is not built yet.`

Don't leave commented-out code, changelog comments, or notes about what a change
used to be — git holds that.

## Design source

The mock is the Pencil document at `requirements/design file` (a `.pen` file
saved without its extension). It is encrypted: read it through the Pencil MCP
tools only, never with Read or Grep. It is light-mode only, which is why
`Colors.light` is what screens use. When a screen and the mock disagree, say so
rather than quietly inventing layout.

`requirements/Rent Track.txt` and `requirements/RentTrack.xlsx` are the original
written requirements — the rent maths and the spreadsheet the app replaces.

`.agents/skills/` holds vendor skills worth consulting before guessing —
`building-native-ui` (route structure, tabs, search, icons) and the `clerk-*`
ones for auth.

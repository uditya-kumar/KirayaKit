/**
 * Design tokens lifted from requirements/design file (the Pencil mock).
 *
 * The mock is a fixed 390pt light-mode frame, so these are literal values, not
 * a theme: every colour below appears in the exported CSS. Components in
 * src/components use nothing else. When a screen needs a colour that is not
 * here, it is a sign the design has moved on and the mock should be re-read.
 *
 * Two deliberate translations from the export:
 *   * Fixed widths (358, 350, 320) become flexible — cards stretch to their
 *     parent and screens supply `spacing.screen` (16pt) of horizontal padding,
 *     which reproduces 358 on a 390pt device and still works on every other.
 *   * Side-by-side stat boxes were exported at 151/155pt each; they use
 *     `flex: 1` instead so the pair always fills the row.
 *
 * The mock is set in Inter, which is not bundled. Nothing here sets a
 * fontFamily, so the platform default is used and the weights still read
 * correctly. Load Inter via expo-font and add it to the text styles if the
 * exact face matters.
 */

export const colors = {
  /** Primary copy: names, values, titles. */
  text: "#1C1C1E",
  /** Secondary copy: labels, addresses, hints. */
  muted: "#8E8E93",
  /** Empty input values. */
  placeholder: "#C7C7CC",
  /** Card and input hairlines. */
  border: "#E5E5EA",
  /** Card background. */
  card: "#FFFFFF",
  /** Fill behind stat boxes and the dialog's confirm input. */
  fill: "#F9F9FB",
  /** Fill behind the tenant-count pill — a shade warmer than `fill`. */
  pill: "#F7F7F8",
  /** Interactive accent: the active tab, the edit action. */
  blue: "#007AFF",
  /** Active tab background. */
  blueTint: "#EAF3FF",
  /** Destructive accent: pending amounts, delete actions. */
  red: "#FF3B30",
  /** Background behind the charge-row remove button. */
  redTint: "#FFECEB",
  /** Money received. */
  green: "#34C759",
  /** Receipt header block. */
  receiptHeader: "#EFFBF5",
  /** Month pill inside the receipt header. */
  receiptMonthPill: "#D8F6E0",
  /** The heavier rule above the receipt total — darker than `border`. */
  divider: "#C7C7CC",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const radii = {
  /** Tenant-count pill. */
  pill: 9,
  /** Buttons. */
  button: 10,
  /** Tab-bar item. */
  tab: 12,
  /** Stat boxes and inputs. */
  tile: 14,
  /** Menu surface. */
  menu: 16,
  /** List cards. */
  card: 18,
  /** Detail panels and the receipt. */
  panel: 20,
  /** Dialog. */
  dialog: 24,
} as const;

export const spacing = {
  /** Horizontal padding a screen should apply around full-width cards. */
  screen: 16,
} as const;

/** Opacity applied while a Pressable is held down. */
export const pressedOpacity = 0.8;

/** Opacity applied to a disabled control. */
export const disabledOpacity = 0.5;

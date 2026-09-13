/**
 * Every colour the app is allowed to use. Nothing outside this file should hold
 * a hex value, bar the black-with-alpha of a box shadow, which is an elevation
 * rather than a colour.
 *
 * The light values come from the Pencil mock in requirements/design file, which
 * is drawn light-mode only; the dark ones are their sensible counterparts and
 * are so far read by AuthForm alone — the rest of the screens take `light`
 * directly. Wire useColorScheme() through them when dark mode is actually due.
 */

const tintColorLight = "#007AFF";
const tintColorDark = "#0A84FF";

export default {
  light: {
    text: "#1C1C1E",
    textMuted: "#8E8E93",
    placeholder: "#C7C7CC",
    background: "#FAFAFA",
    cardBackground: "#FFFFFF",
    fillBackground: "#F9F9FB",
    borderColor: "#E5E5EA",
    divider: "#C7C7CC",
    tint: tintColorLight,
    tabBackground: "#FFFFFF",
    tabIconDefault: "#8E8E93",
    tabIconSelected: tintColorLight,
    buttonBackground: tintColorLight,
    buttonText: "#FFFFFF",
    error: "#FF3B30",
    errorBackground: "#FFECEB",
    success: "#34C759",
    receiptBackground: "#EFFBF5",
    receiptMonthBackground: "#D8F6E0",
  },
  dark: {
    text: "#FFFFFF",
    textMuted: "#98989F",
    placeholder: "#5A5A5F",
    background: "#000000",
    cardBackground: "#1C1C1E",
    fillBackground: "#2C2C2E",
    borderColor: "#38383A",
    divider: "#48484A",
    tint: tintColorDark,
    tabBackground: "#191919",
    tabIconDefault: "#98989F",
    tabIconSelected: tintColorDark,
    buttonBackground: tintColorDark,
    buttonText: "#FFFFFF",
    error: "#FF453A",
    errorBackground: "#3B1F1D",
    success: "#30D158",
    receiptBackground: "#12291D",
    receiptMonthBackground: "#1D3D28",
  },
};

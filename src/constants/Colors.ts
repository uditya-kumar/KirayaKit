/**
 * Every colour the app is allowed to use. Nothing outside this file should hold
 * a hex value, bar the black-with-alpha of a box shadow, which is an elevation
 * rather than a colour.
 *
 * The light values come from the Pencil mock in requirements/design file, which
 * is drawn light-mode only; the dark ones are their sensible counterparts, so
 * they are the half of this file with no node behind it. Screens pick between the
 * two at runtime with `Colors[useColorScheme() ?? "light"]`, following the device
 * unless the Appearance toggle on the Profile screen has overridden it.
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
    // Behind a modal dialog. The mock draws its dialogs on their own, so this is
    // the one colour here without a node to point at.
    scrim: "#00000066",
    tint: tintColorLight,
    tabBackground: "#FFFFFF",
    tabIconDefault: "#8E8E93",
    tabIconSelected: tintColorLight,
    buttonBackground: tintColorLight,
    buttonText: "#FFFFFF",
    error: "#FF3B30",
    errorBackground: "#FFECEB",
    success: "#34C759",
    // Electricity, on the bill form: the orange panel that shows the meter
    // reading it worked the units out from (design node H68UY).
    warning: "#FF9500",
    warningBackground: "#FFF3E0",
    warningBorder: "#FF950033",
    receiptBackground: "#EFFBF5",
    receiptMonthBackground: "#D8F6E0",
    receiptMonthIcon: "#10762D",
    // WhatsApp's own green, on the button that shares a receipt through it. A
    // brand colour, so it does not shift with the device's light/dark setting.
    whatsapp: "#17AD48",
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
    scrim: "#000000A6",
    tint: tintColorDark,
    tabBackground: "#191919",
    tabIconDefault: "#98989F",
    tabIconSelected: tintColorDark,
    buttonBackground: tintColorDark,
    buttonText: "#FFFFFF",
    error: "#FF453A",
    errorBackground: "#3B1F1D",
    success: "#30D158",
    warning: "#FF9F0A",
    warningBackground: "#2B1E06",
    warningBorder: "#FF9F0A33",
    receiptBackground: "#12291D",
    receiptMonthBackground: "#1D3D28",
    receiptMonthIcon: "#30D158",
    whatsapp: "#17AD48",
  },
};

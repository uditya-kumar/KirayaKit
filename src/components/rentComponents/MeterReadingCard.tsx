import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
  formatAmount,
  formatRate,
  formatRupees,
  formatUnits,
} from "@/utils/format";
import { ArrowRight, Zap } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

type MeterReadingCardProps = {
  previousReading: number;
  /** Held as text by the form, so a half-typed "4651." is not mangled. */
  currentReading: string;
  onChangeCurrentReading: (value: string) => void;
  electricityRate: number;
  /** Worked out by the form, which needs the same figures for the bill's total. */
  units: number;
  electricityAmount: number;
};

/**
 * The bill form's electricity card (design node y3Ilk): last month's reading,
 * the one field the landlord types each month, and what the two come to.
 *
 * The rate is a pill in the header rather than a field because the bill
 * snapshots it — there is nothing to change here, only something to check the
 * sum against.
 */
export function MeterReadingCard({
  previousReading,
  currentReading,
  onChangeCurrentReading,
  electricityRate,
  units,
  electricityAmount,
}: MeterReadingCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const resultTextStyle = [styles.resultText, { color: colors.warningText }];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderColor,
        },
      ]}
    >
      <View style={styles.head}>
        <View style={styles.headTitle}>
          <View
            style={[
              styles.boltTile,
              { backgroundColor: colors.warningBackground },
            ]}
          >
            <Zap size={17} color={colors.warning} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Meter reading
          </Text>
        </View>
        <View
          style={[styles.ratePill, { backgroundColor: colors.fillBackground }]}
        >
          <Text style={[styles.rateText, { color: colors.textMuted }]}>
            {formatRate(electricityRate)}
          </Text>
        </View>
      </View>

      <View style={styles.readings}>
        {/* The mock labels this "Previous · Sep bill", but the draft does not say
            whether the figure came from last month's bill or the tenant's
            opening reading, so it is not named. */}
        <View
          style={styles.reading}
          accessible
          accessibilityLabel={`Previous reading, ${formatAmount(previousReading)}`}
        >
          <Text style={[styles.label, { color: colors.textMuted }]}>
            Previous
          </Text>
          <View
            style={[
              styles.previousBox,
              { backgroundColor: colors.fillBackground },
            ]}
          >
            <Text style={[styles.previousValue, { color: colors.textMuted }]}>
              {formatAmount(previousReading)}
            </Text>
          </View>
        </View>

        <View style={styles.arrow}>
          <ArrowRight size={18} color={colors.placeholder} />
        </View>

        <View style={styles.reading}>
          <Text
            style={[styles.label, styles.currentLabel, { color: colors.tint }]}
          >
            Current
          </Text>
          <CustomTextInput
            accessibilityLabel="Current reading"
            value={currentReading}
            onChangeText={onChangeCurrentReading}
            placeholder={formatAmount(previousReading)}
            keyboardType="decimal-pad"
            returnKeyType="next"
            prominent
          />
        </View>
      </View>

      <View
        style={[styles.result, { backgroundColor: colors.warningBackground }]}
      >
        <Text style={resultTextStyle}>
          {formatUnits(units, electricityRate)}
        </Text>
        <Text style={[resultTextStyle, styles.resultAmount]}>
          {formatRupees(electricityAmount)}
        </Text>
      </View>
    </View>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  card: {
    gap: 16,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  boltTile: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  ratePill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  rateText: {
    fontSize: 12,
    fontWeight: "600",
  },
  readings: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  reading: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
  currentLabel: {
    fontWeight: "600",
  },
  // The same height as the prominent field beside it, so the two numbers sit
  // on one line with the arrow centred between them.
  previousBox: {
    height: 50,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  previousValue: {
    fontSize: 22,
    fontWeight: "600",
  },
  arrow: {
    height: 50,
    justifyContent: "center",
  },
  result: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  resultText: {
    fontSize: 14,
    fontWeight: "600",
  },
  resultAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
});

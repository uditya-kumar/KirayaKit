import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useCreateTenant } from "@/hooks/useCreateTenant";
import { neonErrorMessage } from "@/libs/neon-errors";
import { router, useLocalSearchParams } from "expo-router";
import {
  Calendar,
  Gauge,
  IdCard,
  IndianRupee,
  Layers,
  Phone,
  Plus,
  User,
  Zap,
} from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

/** A blank field means "not given", which the column stores as NULL. */
function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** A blank money field falls back to the column's default of 0. */
function amount(value: string): number {
  return value.trim() === "" ? 0 : Number(value);
}

/**
 * "31/03/2027" -> "2027-03-31", the shape a `date` column takes. Null if that is
 * not a real day, which includes 31/02 — Date rolls those over into March, so the
 * round trip through toISOString is what catches them.
 */
function parseExpiry(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;

  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10) === iso ? iso : null;
}

/** Create Tenant: the form for moving someone into a floor. Design node sB7vt. */
export default function CreateTenantScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { houseId } = useLocalSearchParams<{ houseId: string }>();

  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [openingMeter, setOpeningMeter] = useState("");
  const [floor, setFloor] = useState("");
  const [agreementExpiry, setAgreementExpiry] = useState("");
  const [electricityRate, setElectricityRate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate: createTenant, isPending } = useCreateTenant();

  function onSubmit() {
    setError(null);

    // The floor is the one number with no default: the database has to know
    // which one is being occupied, and 0 is the ground floor.
    const floorNumber = Number(floor.trim());
    if (
      floor.trim() === "" ||
      !Number.isInteger(floorNumber) ||
      floorNumber < 0
    ) {
      setError(
        "Assign a floor: 0 is the ground floor, 1 the first, and so on.",
      );
      return;
    }

    // Typed with spaces, stored as twelve digits — the column's CHECK allows
    // nothing else.
    const aadhaar = aadhaarNumber.replace(/\s/g, "");
    if (aadhaar !== "" && !/^\d{12}$/.test(aadhaar)) {
      setError("Aadhaar has to be 12 digits.");
      return;
    }

    const expiry =
      agreementExpiry.trim() === "" ? null : parseExpiry(agreementExpiry);
    if (agreementExpiry.trim() !== "" && expiry === null) {
      setError("Agreement expiry has to be a real date, written DD/MM/YYYY.");
      return;
    }

    const rent = amount(monthlyRent);
    const rate = amount(electricityRate);
    const meter = amount(openingMeter);
    if (
      ![rent, rate, meter].every(
        (value) => Number.isFinite(value) && value >= 0,
      )
    ) {
      setError(
        "Rent, rate and meter reading have to be numbers, and not negative.",
      );
      return;
    }

    createTenant(
      {
        house_id: houseId,
        name: name.trim(),
        mobile_number: orNull(mobileNumber),
        aadhaar_number: aadhaar === "" ? null : aadhaar,
        floor_number: floorNumber,
        monthly_rent: rent,
        electricity_rate: rate,
        opening_meter_reading: meter,
        agreement_expiry: expiry,
      },
      {
        // Back to the tenant list, which the mutation has already invalidated.
        onSuccess: () => router.back(),
        onError: (err) => setError(neonErrorMessage(err)),
      },
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.form}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <CustomTextInput
        labelText="Tenant name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Mr. Piyush"
        icon={<User size={18} color={colors.textMuted} />}
        autoCapitalize="words"
        returnKeyType="next"
      />

      <CustomTextInput
        labelText="Mobile number"
        value={mobileNumber}
        onChangeText={setMobileNumber}
        placeholder="98765 43210"
        icon={<Phone size={18} color={colors.textMuted} />}
        keyboardType="phone-pad"
        returnKeyType="next"
      />

      <CustomTextInput
        labelText="Aadhaar number"
        value={aadhaarNumber}
        onChangeText={setAadhaarNumber}
        placeholder="XXXX XXXX XXXX"
        icon={<IdCard size={18} color={colors.textMuted} />}
        keyboardType="number-pad"
        returnKeyType="next"
      />

      <CustomTextInput
        labelText="Opening meter reading"
        value={openingMeter}
        onChangeText={setOpeningMeter}
        placeholder="e.g. 4522"
        icon={<Gauge size={18} color={colors.textMuted} />}
        keyboardType="decimal-pad"
        returnKeyType="next"
      />

      <View style={styles.row}>
        <CustomTextInput
          labelText="Assign floor"
          value={floor}
          onChangeText={setFloor}
          placeholder="0 for ground"
          icon={<Layers size={18} color={colors.textMuted} />}
          keyboardType="number-pad"
          returnKeyType="next"
          style={styles.field}
        />
        <CustomTextInput
          labelText="Agreement expiry"
          value={agreementExpiry}
          onChangeText={setAgreementExpiry}
          placeholder="DD/MM/YYYY"
          icon={<Calendar size={18} color={colors.textMuted} />}
          keyboardType="numbers-and-punctuation"
          returnKeyType="next"
          style={styles.field}
        />
      </View>

      <View style={styles.row}>
        <CustomTextInput
          labelText="Electricity rate (₹/unit)"
          value={electricityRate}
          onChangeText={setElectricityRate}
          placeholder="e.g. 6"
          icon={<Zap size={18} color={colors.textMuted} />}
          keyboardType="decimal-pad"
          returnKeyType="next"
          style={styles.field}
        />
        <CustomTextInput
          labelText="Monthly rent"
          value={monthlyRent}
          onChangeText={setMonthlyRent}
          placeholder="e.g. 5000"
          icon={<IndianRupee size={18} color={colors.textMuted} />}
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          style={styles.field}
        />
      </View>

      {/* The mock has no error state; this is the one place a rejected insert can
          speak up, so it sits directly above the action that caused it. */}
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}

      <Button
        text="Create Tenant"
        textColor={colors.buttonText}
        backgroundColor={colors.buttonBackground}
        icon={<Plus size={18} color={colors.buttonText} />}
        onPress={onSubmit}
        loading={isPending}
        disabled={name.trim().length === 0}
        paddingVertical={15}
        style={styles.action}
      />
    </ScrollView>
  );
}

// Layout only — the colours are applied inline from the active scheme.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  form: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 18,
  },
  // The mock pairs floor with expiry, and rate with rent.
  row: {
    flexDirection: "row",
    gap: 12,
  },
  field: {
    flex: 1,
  },
  error: {
    fontSize: 13,
  },
  // The button spans the form; Button itself only centres its label.
  action: {
    alignSelf: "stretch",
  },
});

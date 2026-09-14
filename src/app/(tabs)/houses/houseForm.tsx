import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useCreateHouse } from "@/hooks/useCreateHouse";
import { neonErrorMessage } from "@/libs/neon-errors";
import { router } from "expo-router";
import {
  House,
  Layers,
  MapPin,
  Phone,
  Plus,
  Wallet,
} from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

/** A blank field means "not given", which the column stores as NULL. */
function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Add House: the form for creating a property. Design node umV64. */
export default function CreateHouseScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [floors, setFloors] = useState("");
  const [upiId, setUpiId] = useState("");
  const [gpayNumber, setGpayNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate: createHouse, isPending } = useCreateHouse();

  function onSubmit() {
    setError(null);

    // Blank means "one floor", which is also the column's default. Anything
    // typed has to be a whole number in range, or the CHECK constraint would
    // bounce it after a round trip.
    const numberOfFloors = floors.trim() === "" ? 1 : Number(floors);
    if (
      !Number.isInteger(numberOfFloors) ||
      numberOfFloors < 1 ||
      numberOfFloors > 50
    ) {
      setError("Number of floors has to be a whole number between 1 and 50.");
      return;
    }

    createHouse(
      {
        name: name.trim(),
        address: orNull(address),
        number_of_floors: numberOfFloors,
        upi_id: orNull(upiId),
        gpay_number: orNull(gpayNumber),
      },
      {
        // Back to the list, which the mutation has already invalidated.
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
        labelText="House name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Meera Residency"
        icon={<House size={18} color={colors.textMuted} />}
        autoCapitalize="words"
        returnKeyType="next"
      />

      <CustomTextInput
        labelText="Address"
        value={address}
        onChangeText={setAddress}
        placeholder="Street, area, city"
        icon={<MapPin size={18} color={colors.textMuted} />}
        autoCapitalize="words"
        returnKeyType="next"
      />

      <CustomTextInput
        labelText="Number of floors"
        value={floors}
        onChangeText={setFloors}
        placeholder="e.g. 4"
        icon={<Layers size={18} color={colors.textMuted} />}
        keyboardType="number-pad"
        returnKeyType="next"
      />

      <CustomTextInput
        labelText="UPI ID"
        value={upiId}
        onChangeText={setUpiId}
        placeholder="name@bank"
        icon={<Wallet size={18} color={colors.textMuted} />}
        autoCapitalize="none"
        returnKeyType="next"
      />

      <CustomTextInput
        labelText="GPay number"
        value={gpayNumber}
        onChangeText={setGpayNumber}
        placeholder="98765 43210"
        icon={<Phone size={18} color={colors.textMuted} />}
        keyboardType="phone-pad"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />

      {/* The mock has no error state; this is the one place a failed insert can
          speak up, so it sits directly above the action that caused it. */}
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}

      <Button
        text="Add House"
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
  error: {
    fontSize: 13,
  },
  // The button spans the form; Button itself only centres its label.
  action: {
    alignSelf: "stretch",
  },
});

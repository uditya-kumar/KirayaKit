import type { HouseDetails, HouseInput } from "@/api/houses";
import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useCreateHouse } from "@/hooks/useCreateHouse";
import { useHouse } from "@/hooks/useHouse";
import { useUpdateHouse } from "@/hooks/useUpdateHouse";
import { neonErrorMessage } from "@/libs/neon-errors";
import { isUpiId, normaliseMobile } from "@/utils/validate";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  House,
  Layers,
  MapPin,
  Phone,
  Plus,
  Wallet,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

/** A blank field means "not given", which the column stores as NULL. */
function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Add House and Edit House: the same form either way. Design nodes umV64 and
 * slGmE, which differ only in the bar title and the button's label.
 *
 * A `houseId` query param is what makes it an edit. This wrapper waits for that
 * house before mounting the form, so the fields can be seeded straight from
 * `useState` — no effect syncing props into state, and a stale row can never be
 * showing while the current one loads.
 */
export default function HouseFormScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { houseId } = useLocalSearchParams<{ houseId?: string }>();
  const { data: house, error, isPending, refetch } = useHouse(houseId);

  // Without a houseId the query never runs, so its pending state means nothing
  // here — only an edit has something to wait for.
  const loading = houseId !== undefined && isPending;

  return (
    <>
      <Stack.Screen
        options={{ title: houseId === undefined ? "New House" : "Edit House" }}
      />
      {loading ? (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : error ? (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Couldn&apos;t load this house
          </Text>
          <Text style={[styles.error, { color: colors.textMuted }]} selectable>
            {/* Translated, because this screen is reachable by link: a houseId
                that lost a character arrives as Postgres 22P02, whose raw text
                is a complaint about uuid syntax rather than about the link. */}
            {neonErrorMessage(error)}
          </Text>
          <Button
            text="Try again"
            textColor={colors.tint}
            backgroundColor="transparent"
            onPress={() => void refetch()}
            paddingHorizontal={0}
          />
        </View>
      ) : (
        <HouseForm house={house ?? null} />
      )}
    </>
  );
}

type HouseFormProps = {
  /** The house being edited, or null when this is a new one. */
  house: HouseDetails | null;
};

function HouseForm({ house }: HouseFormProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [name, setName] = useState(house?.name ?? "");
  const [address, setAddress] = useState(house?.address ?? "");
  // Left blank on a create so the placeholder shows and the column's default of 1
  // is what applies; an existing house always has a number to show.
  const [floors, setFloors] = useState(
    house ? String(house.number_of_floors) : "",
  );
  const [upiId, setUpiId] = useState(house?.upi_id ?? "");
  const [gpayNumber, setGpayNumber] = useState(house?.gpay_number ?? "");
  const [error, setError] = useState<string | null>(null);

  const { mutate: createHouse, isPending: creating } = useCreateHouse();
  const { mutate: updateHouse, isPending: saving } = useUpdateHouse();

  function onSubmit() {
    setError(null);

    // The button below is disabled without a name, but the GPay field's return key
    // calls this directly and does not consult it. Without this the blank name
    // travels, and houses_name_not_blank sends back the same sentence after a
    // round trip.
    if (name.trim() === "") {
      setError("The house needs a name.");
      return;
    }

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

    // Both payment fields are optional, and both are the whole point of the
    // receipt a tenant gets: a wrong one silently sends money nowhere, so the
    // shape is checked here — the columns are plain text and will take anything.
    const upi = orNull(upiId);
    if (upi !== null && !isUpiId(upi)) {
      setError("A UPI ID looks like name@bank — check what you typed.");
      return;
    }

    const gpay = orNull(gpayNumber);
    const gpayDigits = gpay === null ? null : normaliseMobile(gpay);
    if (gpay !== null && gpayDigits === null) {
      setError("A GPay number is the 10 digits of an Indian mobile number.");
      return;
    }

    const fields: HouseInput = {
      name: name.trim(),
      address: orNull(address),
      number_of_floors: numberOfFloors,
      upi_id: upi,
      // Stored as bare digits so the same number typed two different ways is
      // the same number on the receipt.
      gpay_number: gpayDigits,
    };

    // Back where the form was opened from — the list after a create, the house's
    // own screen after a save. Both were invalidated by the mutation.
    const onSuccess = () => router.back();
    const onError = (err: unknown) => setError(neonErrorMessage(err));

    if (house)
      updateHouse({ id: house.id, house: fields }, { onSuccess, onError });
    else createHouse(fields, { onSuccess, onError });
  }

  return (
    <KeyboardAwareScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.form}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      // The last two fields sit under the keyboard on a short phone. This scroll
      // view adds the keyboard's height to the scrollable area and lifts the
      // focused field clear of it on both platforms — the app is edge-to-edge, so
      // Android no longer resizes the window and has to be told as well as iOS.
      bottomOffset={24}
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

      {/* The mock has no error state; this is the one place a failed write can
          speak up, so it sits directly above the action that caused it. */}
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}

      {/* The Edit mock draws the CTA without an icon, so the plus goes away with
          the "Add House" label. */}
      <Button
        text={house ? "Save" : "Add House"}
        textColor={colors.buttonText}
        backgroundColor={colors.buttonBackground}
        icon={house ? undefined : <Plus size={18} color={colors.buttonText} />}
        onPress={onSubmit}
        loading={creating || saving}
        disabled={name.trim().length === 0}
        paddingVertical={15}
        style={styles.action}
      />
    </KeyboardAwareScrollView>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    fontSize: 13,
  },
  // The button spans the form; Button itself only centres its label.
  action: {
    alignSelf: "stretch",
  },
});

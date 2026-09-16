import type { NewTenant, TenantInput, TenantRecord } from "@/api/tenants";
import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { DateField } from "@/components/rentComponents/DateField";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useCreateTenant } from "@/hooks/useCreateTenant";
import { useHouse } from "@/hooks/useHouse";
import { useTenantRecord } from "@/hooks/useTenantRecord";
import { useUpdateTenant } from "@/hooks/useUpdateTenant";
import { neonErrorMessage } from "@/libs/neon-errors";
import {
  MAX_AMOUNT,
  MAX_RATE,
  isPersonName,
  normaliseMobile,
} from "@/utils/validate";
import { Stack, router, useLocalSearchParams } from "expo-router";
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
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

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
 * A picked day as a `date` column stores it: "2027-03-31".
 *
 * Built from the local parts rather than sliced off toISOString, which is UTC:
 * the picker hands back local midnight, and in IST that is half past six the
 * evening before — the column would end up a day early.
 */
function toDateColumn(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * "2027-03-31" -> that day at local midnight, which is what the picker opens on.
 *
 * Split rather than passed to `new Date("2027-03-31")`, which JavaScript reads as
 * UTC and would show the 30th to anyone behind it.
 */
function dateFromColumn(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Create Tenant and Edit Tenant: the same form either way. Design nodes sB7vt and
 * lXpcT, which differ in the bar title, the button's label, and the opening meter
 * reading — that one belongs to moving in, so an edit does not offer it.
 *
 * A `tenantId` query param is what makes it an edit; `houseId` comes from the route
 * and says which house a new tenant joins. This wrapper waits for the tenant before
 * mounting the form, so the fields can be seeded straight from `useState` — no
 * effect syncing props into state, and a stale row can never be showing while the
 * current one loads.
 */
export default function TenantFormScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { houseId, tenantId } = useLocalSearchParams<{
    houseId: string;
    tenantId?: string;
  }>();
  const { data: tenant, error, isPending, refetch } = useTenantRecord(tenantId);

  // Without a tenantId the query never runs, so its pending state means nothing
  // here — only an edit has something to wait for.
  const loading = tenantId !== undefined && isPending;

  return (
    <>
      <Stack.Screen
        options={{
          title: tenantId === undefined ? "Create Tenant" : "Edit Tenant",
        }}
      />
      {loading ? (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : error ? (
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Couldn&apos;t load this tenant
          </Text>
          <Text style={[styles.error, { color: colors.textMuted }]} selectable>
            {/* Translated, because this screen is reachable by link: a tenantId
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
        <TenantForm houseId={houseId} tenant={tenant ?? null} />
      )}
    </>
  );
}

type TenantFormProps = {
  /** The house a new tenant joins. An edit cannot move them, so it is unused there. */
  houseId: string;
  /** The tenant being edited, or null when someone is moving in. */
  tenant: TenantRecord | null;
};

function TenantForm({ houseId, tenant }: TenantFormProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  // Only for the floor check below, so the form does not wait on it: a trigger
  // rejects an out-of-range floor either way, and this just says so before the
  // round trip. Cached under the same key the House form reads.
  const { data: house } = useHouse(houseId);
  const topFloor = house ? house.number_of_floors - 1 : null;

  const [name, setName] = useState(tenant?.name ?? "");
  const [mobileNumber, setMobileNumber] = useState(tenant?.mobile_number ?? "");
  const [aadhaarNumber, setAadhaarNumber] = useState(
    tenant?.aadhaar_number ?? "",
  );
  const [openingMeter, setOpeningMeter] = useState("");
  // Left blank on a create so the placeholder shows and the column's default
  // applies; an existing tenant always has a number to show, and 0 is a floor.
  const [floor, setFloor] = useState(tenant ? String(tenant.floor_number) : "");
  const [agreementExpiry, setAgreementExpiry] = useState<Date | null>(
    tenant?.agreement_expiry ? dateFromColumn(tenant.agreement_expiry) : null,
  );
  const [electricityRate, setElectricityRate] = useState(
    tenant ? String(tenant.electricity_rate) : "",
  );
  const [monthlyRent, setMonthlyRent] = useState(
    tenant ? String(tenant.monthly_rent) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const { mutate: createTenant, isPending: creating } = useCreateTenant();
  const { mutate: updateTenant, isPending: saving } = useUpdateTenant();

  function onSubmit() {
    setError(null);

    // The button below is disabled without a name, but the rent field's return key
    // calls this directly and does not consult it. Without this the blank name
    // travels, and tenants_name_not_blank sends back the same sentence after a
    // round trip.
    if (name.trim() === "") {
      setError("The tenant needs a name.");
      return;
    }

    // A mobile number in the name field is the slip this catches: the two sit next
    // to each other, the column takes any non-blank text, and the wrong one is only
    // noticed when a receipt goes out headed "9876543210". Nothing but the blank
    // check stood between that and the database.
    if (!isPersonName(name)) {
      setError("A tenant's name can't have numbers or symbols in it.");
      return;
    }

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

    // Worded exactly as the database's own trigger words it, so a landlord who
    // gets it from the server on a slow load and from here on a fast one reads
    // the same sentence twice.
    if (topFloor !== null && floorNumber > topFloor) {
      setError(
        `The highest floor in this house is ${topFloor}, counting the ground floor as 0.`,
      );
      return;
    }

    // The fallback for a house that has not arrived yet, which is the only way past
    // the check above: no house can have more than 50 floors (houses_floors_sane),
    // so 49 is the highest floor there is. Worth having because floor_number is a
    // smallint — a slipped keypress past 32767 would otherwise come back as an
    // error about smallint range rather than about floors.
    if (floorNumber > 49) {
      setError("A house has at most 50 floors, so 49 is the highest floor.");
      return;
    }

    // Optional, but it is how a landlord reaches this tenant, so a number that
    // cannot be dialled is worth catching — the column itself is plain text.
    const mobile = orNull(mobileNumber);
    const mobileDigits = mobile === null ? null : normaliseMobile(mobile);
    if (mobile !== null && mobileDigits === null) {
      setError("A mobile number is the 10 digits of an Indian mobile number.");
      return;
    }

    // Typed with spaces, stored as twelve digits — the column's CHECK allows
    // nothing else.
    const aadhaar = aadhaarNumber.replace(/\s/g, "");
    if (aadhaar !== "" && !/^\d{12}$/.test(aadhaar)) {
      setError("Aadhaar has to be 12 digits.");
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

    // The other end of the same three fields. Rent and the meter are numeric(12,2)
    // and the rate numeric(10,2), so past those the column refuses the row and says
    // so in terms of precision and scale — said here as the cause it actually is,
    // because nobody charges a lakh crore in rent, they pressed a key twice.
    if (rent > MAX_AMOUNT || meter > MAX_AMOUNT || rate > MAX_RATE) {
      setError(
        "That rent, rate or meter reading is too large by a digit or more.",
      );
      return;
    }

    const fields: TenantInput = {
      name: name.trim(),
      // Bare digits, so the same number typed two different ways is one number.
      mobile_number: mobileDigits,
      aadhaar_number: aadhaar === "" ? null : aadhaar,
      floor_number: floorNumber,
      monthly_rent: rent,
      electricity_rate: rate,
      // Nothing to validate: the picker cannot hand back a day that does not
      // exist, which is what the old typed field had to guard against.
      agreement_expiry: agreementExpiry ? toDateColumn(agreementExpiry) : null,
    };

    // Back where the form was opened from — the house's tenant list after a
    // create, the tenant's own screen after a save. Both were invalidated by the
    // mutation.
    const onSuccess = () => router.back();
    const onError = (err: unknown) => setError(neonErrorMessage(err));

    if (tenant) {
      updateTenant({ id: tenant.id, tenant: fields }, { onSuccess, onError });
    } else {
      const newTenant: NewTenant = {
        ...fields,
        house_id: houseId,
        opening_meter_reading: meter,
      };
      createTenant(newTenant, { onSuccess, onError });
    }
  }

  return (
    <KeyboardAwareScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.form}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      // The rent and rate row sits under the keyboard on a short phone. This
      // scroll view adds the keyboard's height to the scrollable area and lifts
      // the focused field clear of it on both platforms — the app is edge-to-edge,
      // so Android no longer resizes the window and has to be told as well as iOS.
      bottomOffset={24}
    >
      <CustomTextInput
        labelText="Tenant name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Mr. Piyush"
        icon={<User size={18} color={colors.textMuted} />}
        autoCapitalize="words"
        returnKeyType="next"
        // The column is unbounded text, so nothing downstream stops a pasted
        // paragraph — and this name heads the tenant's receipt. Capped where it is
        // typed rather than complained about on save.
        maxLength={60}
      />

      <CustomTextInput
        labelText="Mobile Number"
        value={mobileNumber}
        onChangeText={setMobileNumber}
        placeholder="98765 43210"
        icon={<Phone size={18} color={colors.textMuted} />}
        keyboardType="phone-pad"
        returnKeyType="next"
      />

      <CustomTextInput
        labelText="Aadhaar Card"
        value={aadhaarNumber}
        onChangeText={setAadhaarNumber}
        placeholder="XXXX XXXX XXXX"
        icon={<IdCard size={18} color={colors.textMuted} />}
        keyboardType="number-pad"
        returnKeyType="next"
      />

      {/* Only on the way in: the reading every later bill counts up from. Editing
          it would change what past months consumed, so the Edit mock leaves it
          out and so does this. */}
      {tenant ? null : (
        <CustomTextInput
          labelText="Opening meter reading"
          value={openingMeter}
          onChangeText={setOpeningMeter}
          placeholder="e.g. 4522"
          icon={<Gauge size={18} color={colors.textMuted} />}
          keyboardType="decimal-pad"
          returnKeyType="next"
        />
      )}

      <View style={styles.row}>
        <CustomTextInput
          labelText="Assigned Floor"
          value={floor}
          onChangeText={setFloor}
          placeholder="0 for ground"
          icon={<Layers size={18} color={colors.textMuted} />}
          keyboardType="number-pad"
          returnKeyType="next"
          style={styles.field}
        />
        <DateField
          labelText="Agreement expiry"
          value={agreementExpiry}
          onChange={setAgreementExpiry}
          icon={<Calendar size={18} color={colors.textMuted} />}
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

      {/* The mock has no error state; this is the one place a rejected write can
          speak up, so it sits directly above the action that caused it. */}
      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}

      {/* The Edit mock draws the CTA without an icon, so the plus goes away with
          the "Create Tenant" label. */}
      <Button
        text={tenant ? "Save" : "Create Tenant"}
        textColor={colors.buttonText}
        backgroundColor={colors.buttonBackground}
        icon={tenant ? undefined : <Plus size={18} color={colors.buttonText} />}
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

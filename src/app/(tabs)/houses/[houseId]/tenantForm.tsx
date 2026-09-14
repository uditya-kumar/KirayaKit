import type { NewTenant, TenantInput, TenantRecord } from "@/api/tenants";
import Button from "@/components/rentComponents/Button";
import CustomTextInput from "@/components/rentComponents/CustomTextInput";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useCreateTenant } from "@/hooks/useCreateTenant";
import { useTenantRecord } from "@/hooks/useTenantRecord";
import { useUpdateTenant } from "@/hooks/useUpdateTenant";
import { neonErrorMessage } from "@/libs/neon-errors";
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
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

/**
 * "2027-03-31" -> "31/03/2027", so an edit shows the date the way the field asks
 * for it and `parseExpiry` reads its own output back.
 */
function formatExpiry(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
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
            {error.message}
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

  const [name, setName] = useState(tenant?.name ?? "");
  const [mobileNumber, setMobileNumber] = useState(tenant?.mobile_number ?? "");
  const [aadhaarNumber, setAadhaarNumber] = useState(
    tenant?.aadhaar_number ?? "",
  );
  const [openingMeter, setOpeningMeter] = useState("");
  // Left blank on a create so the placeholder shows and the column's default
  // applies; an existing tenant always has a number to show, and 0 is a floor.
  const [floor, setFloor] = useState(tenant ? String(tenant.floor_number) : "");
  const [agreementExpiry, setAgreementExpiry] = useState(
    tenant?.agreement_expiry ? formatExpiry(tenant.agreement_expiry) : "",
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

    const fields: TenantInput = {
      name: name.trim(),
      mobile_number: orNull(mobileNumber),
      aadhaar_number: aadhaar === "" ? null : aadhaar,
      floor_number: floorNumber,
      monthly_rent: rent,
      electricity_rate: rate,
      agreement_expiry: expiry,
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

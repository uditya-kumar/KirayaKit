/**
 * Field checks the forms run before a write leaves the device.
 *
 * None of these are enforced by a CHECK constraint — a wrong phone number or a
 * mistyped UPI ID is valid text as far as the column is concerned, and the cost
 * of storing one only shows up months later when a receipt goes to nobody. So
 * the form is the only place they can be caught, which is why the rules live
 * here rather than in a migration.
 */

/**
 * A typed mobile number reduced to the ten digits that get stored, or null if it
 * is not an Indian mobile number.
 *
 * Landlords type these however they read them — "98765 43210", "+91 98765-43210",
 * "098765 43210" — and all three are the same subscriber, so the separators go
 * and the last ten digits are what counts. Those ten have to start 6 to 9, which
 * is the whole of India's mobile range.
 *
 * Whatever sits in front of them may only be zeros and a 91, so four stray digits
 * from a slipped paste fail rather than having their tail read as a number. The
 * prefix is peeled off by position rather than matched first, because 91 is also
 * a real mobile prefix: stripping it from "9198765432" would leave eight digits
 * and reject a number that is perfectly good.
 */
export function normaliseMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local = digits.slice(-10);
  const prefix = digits.slice(0, -10);
  if (!/^0*(?:91)?$/.test(prefix)) return null;
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

/**
 * Whether a UPI ID is shaped like one: `handle@psp`, e.g. "meera@okhdfcbank".
 *
 * Only the shape is checkable offline — whether the handle exists is between the
 * tenant's app and NPCI. The handle allows letters, digits, dot, hyphen and
 * underscore; the bank suffix is letters and digits and never carries an @ or a
 * dot, which is what separates a real UPI ID from an email address pasted in by
 * mistake.
 */
export function isUpiId(raw: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,64}@[a-zA-Z][a-zA-Z0-9]{1,32}$/.test(
    raw.trim(),
  );
}

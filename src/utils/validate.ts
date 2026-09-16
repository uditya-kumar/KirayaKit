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

/**
 * Whether a name is a person's name rather than something that landed in the
 * wrong field.
 *
 * Digits are the whole point of this one. `tenants_name_not_blank` is all the
 * column insists on, so a mobile number typed into the name field saves happily
 * and then heads a receipt. What a real name does carry is allowed: the dot in
 * "Mr.", the apostrophe in "D'Souza", the hyphen in "Anne-Marie".
 *
 * Letters are Unicode rather than A-Z, because "पांडेय" is a name a landlord will
 * type. Its matras are combining marks and not letters, which is why \p{M} is in
 * the set as well — without it that name fails on its second character.
 */
export function isPersonName(raw: string): boolean {
  return /^\p{L}[\p{L}\p{M}\s.'-]*$/u.test(raw.trim());
}

/**
 * Whether a house name is one: everything `isPersonName` allows, plus digits,
 * because landlords number buildings — "Pandey Niwas 2" is the second of them,
 * and sometimes the number is the whole name. The ampersand is in for "A & B
 * Villa".
 *
 * Anything else the keyboard offers is a mis-key or a half-landed paste, and it
 * matters here more than it looks: both list screens match this name as typed, so
 * a house saved as "Niwas #2/@" is one its owner has to scroll to find.
 */
export function isHouseName(raw: string): boolean {
  return /^[\p{L}\p{N}][\p{L}\p{M}\p{N}\s.'&-]*$/u.test(raw.trim());
}

/**
 * Whether an address is plausibly one.
 *
 * The most permissive of these by design, because an Indian address is largely
 * punctuation — "12/4, Flat #3, MG Road (near the temple)" — and a rule tight
 * enough to be interesting would reject more real addresses than typos. It earns
 * its place on the first character: a field holding nothing but symbols is a
 * paste that went wrong, and that is what this catches.
 */
export function isAddress(raw: string): boolean {
  return /^[\p{L}\p{N}][\p{L}\p{M}\p{N}\s.,'&#()/-]*$/u.test(raw.trim());
}

/**
 * Whether an extra charge's name reads as one — "Water charge", "Lift AMC",
 * "Repairs (Feb)", "GST 18%".
 *
 * A label is printed on the receipt beside an amount the tenant is asked to pay,
 * so it has to be words. `bill_charges_label_not_blank` refuses an empty one;
 * this refuses a row named with a stray keypress, which the column would take.
 */
export function isChargeLabel(raw: string): boolean {
  return /^[\p{L}\p{N}][\p{L}\p{M}\p{N}\s.,'&%()/-]*$/u.test(raw.trim());
}

/**
 * The largest figure the money and meter columns will take: they are
 * numeric(12,2), so ten digits in front of the point.
 *
 * Unlike the checks above, this one is enforced — not by a CHECK but by the
 * column's own type, which is why it is worth stating here. Postgres rejects
 * anything larger as SQLSTATE 22003, whose text is "A field with precision 12,
 * scale 2 must round to an absolute value less than 10^10": true, and no use to
 * someone who pressed a key twice. The forms compare against this so the number
 * is refused where it was typed, and `neonErrorMessage` translates 22003 for the
 * paths a form cannot see — `bills.total_billed` is generated, so a sum can
 * overflow it while every figure going in fits.
 */
export const MAX_AMOUNT = 9_999_999_999.99;

/**
 * The same for `electricity_rate`, the one numeric(10,2) column: eight digits in
 * front of the point rather than ten.
 */
export const MAX_RATE = 99_999_999.99;

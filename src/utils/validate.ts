/**
 * Field checks the forms run before a write leaves the device.
 *
 * None of these are enforced by a CHECK constraint — a wrong phone number or a
 * mistyped UPI ID is valid text as far as the column is concerned, and the cost
 * of storing one only shows up months later when a receipt goes to nobody. So
 * the form is the only place they can be caught, which is why the rules live
 * here rather than in a migration.
 *
 * The two auth checks at the end are here for the same reason from the other
 * direction: Clerk does check them, but its answer is a round trip away and
 * comes back naming a field the screen never showed.
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

/**
 * Whether a typed email address is shaped like one: something, an @, then a
 * domain with a dot in it.
 *
 * Deliberately loose. The only thing worth catching before the request goes out
 * is a typo — a missing @, a trailing comma, "gmail" with no ".com" — and
 * whether the address can actually receive mail is settled by the code Clerk
 * sends to it, not by a longer pattern here.
 */
export function isEmailAddress(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());
}

/**
 * The shortest password Clerk's default settings accept.
 *
 * Checked on the device so that choosing a short one is answered as you press
 * the button rather than after a round trip. Clerk stays the authority: if the
 * instance is later set stricter, the server's `form_password_length_too_short`
 * is what a landlord sees, and only this early nudge is out of date.
 *
 * Sign-in never checks it — an account made under an older rule may hold a
 * shorter password, and refusing to send it would lock that landlord out.
 */
export const MIN_PASSWORD_LENGTH = 8;

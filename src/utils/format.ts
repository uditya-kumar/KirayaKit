/**
 * Display formatting for the values the components render.
 *
 * Everything here is hand-rolled rather than delegating to Intl: Hermes ships a
 * cut-down ICU and `en-IN` grouping in particular is not dependable across
 * platforms, while these outputs have to match the mock exactly.
 *
 * Amounts arrive from the Data API as either a number or a string, because
 * Postgres `numeric` survives JSON as a string when it cannot be represented
 * exactly — both are accepted.
 */

/** Indian digit grouping: 5000 -> "5,000", 1234567 -> "12,34,567". */
export function formatAmount(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "0";

  const rounded = Math.round(Math.abs(n) * 100) / 100;
  const whole = Math.trunc(rounded);
  const paise = Math.round((rounded - whole) * 100);

  const digits = String(whole);
  // Last three digits stay together, everything above them groups in pairs.
  const tail = digits.length > 3 ? digits.slice(-3) : digits;
  const head = digits.length > 3 ? digits.slice(0, -3) : "";
  const grouped =
    (head ? `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},` : "") + tail;

  // Paise are shown only when there are any — the mock never shows ".00".
  return `${n < 0 ? "-" : ""}${grouped}${paise ? `.${String(paise).padStart(2, "0")}` : ""}`;
}

/** "₹5,000". */
export function formatRupees(amount: number | string): string {
  return `₹${formatAmount(amount)}`;
}

/** "₹6 / unit" — the electricity rate as the mock writes it. */
export function formatRate(rate: number | string): string {
  return `${formatRupees(rate)} / unit`;
}

/** 0 -> "Ground Floor", 1 -> "1st Floor", 3 -> "3rd Floor". */
export function formatFloor(floorNumber: number): string {
  if (floorNumber <= 0) return "Ground Floor";
  const teens = floorNumber % 100;
  const suffix =
    teens >= 11 && teens <= 13
      ? "th"
      : (["th", "st", "nd", "rd"][floorNumber % 10] ?? "th");
  return `${floorNumber}${suffix} Floor`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * "2026-02-01" -> "February 2026".
 *
 * Parsed off the string rather than through Date, which would shift the month
 * for anyone west of UTC. Anything that is not an ISO date is passed straight
 * through, so a caller that already has a label can hand it over unchanged.
 */
export function formatBillMonth(month: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(month);
  if (!m) return month;
  return `${MONTHS[Number(m[2]) - 1] ?? month} ${m[1]}`;
}

/**
 * "2026-02-01" -> "Feb 2026", for a field too narrow for the full name.
 *
 * The first three letters are the abbreviation for all twelve months in English,
 * so there is no second list to keep in step with MONTHS.
 */
export function formatBillMonthShort(month: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(month);
  if (!m) return month;
  const name = MONTHS[Number(m[2]) - 1];
  return name ? `${name.slice(0, 3)} ${m[1]}` : month;
}

/**
 * A day as every form in the app writes one: "31/03/2027".
 *
 * Read off the local parts, which is what the date picker handed over — going
 * through toISOString would print the day before for anyone east of UTC, since
 * local midnight in IST is still the previous afternoon there.
 */
export function formatDay(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

/** "129 units × ₹6" — the sub-line under Electricity on a receipt. */
export function formatUnits(
  units: number | string,
  rate: number | string,
): string {
  return `${formatAmount(units)} units × ${formatRupees(rate)}`;
}

/**
 * Turns a rejected Data API write into a sentence a landlord can act on.
 *
 * PostgREST hands back the Postgres SQLSTATE in `code` and the raw constraint
 * text in `message` ("duplicate key value violates unique constraint
 * houses_owner_name_key"), which is not something to put on screen. Only the
 * constraints the forms can actually trip are translated; everything else falls
 * through to the original message rather than being hidden behind a shrug.
 */
const MESSAGES: Record<string, string> = {
  houses_owner_name_key: "You already have a house with that name.",
  houses_name_not_blank: "The house needs a name.",
  houses_floors_sane: "Number of floors has to be between 1 and 50.",
  tenants_active_floor_key: "That floor already has an active tenant.",
  tenants_name_not_blank: "The tenant needs a name.",
  tenants_aadhaar_shape: "Aadhaar has to be 12 digits.",
  tenants_floor_non_neg:
    "The floor cannot be negative — 0 is the ground floor.",
  tenants_money_non_neg: "Rent, rate and meter reading cannot be negative.",
  bills_reading_forward:
    "The current meter reading cannot be lower than the previous one.",
  bills_money_non_neg: "The amounts on a bill cannot be negative.",
  bill_charges_label_not_blank: "Give every charge a name.",
  bill_charges_amount_non_neg: "A charge cannot be a negative amount.",
};

export function neonErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const { code, message } = err as { code?: string; message: string };

    // 23505 unique violation, 23514 check violation — both name the constraint
    // they broke somewhere in the message.
    if (code === "23505" || code === "23514") {
      for (const [constraint, sentence] of Object.entries(MESSAGES)) {
        if (message.includes(constraint)) return sentence;
      }
    }
    return message;
  }
  return "Something went wrong.";
}

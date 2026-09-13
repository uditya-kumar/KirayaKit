// Applies src/db/seed_dev.sql to the database for one owner.
//
//   npm run seed-dev                 -> seeds the most recently created users row
//   npm run seed-dev user_2abc...    -> seeds that Clerk user id
//
// The no-argument form is the usual one: sign in to the app (which calls
// ensure_profile() and creates your users row), then run this.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const ENV_FILE = ".env.local";
const SEED_FILE = "src/db/seed_dev.sql";
const KEY = "DATABASE_URL_UNPOOLED";

for (const f of [ENV_FILE, SEED_FILE]) {
  if (!existsSync(f)) {
    console.error(`Missing ${f}.`);
    process.exit(1);
  }
}

let dbUrl;
for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
  if (line.trimStart().startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i > 0 && line.slice(0, i).trim() === KEY) {
    dbUrl = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
if (!dbUrl) {
  console.error(`${KEY} not found in ${ENV_FILE}.`);
  process.exit(1);
}

// pg is not a dependency of the app — it is only needed for schema work.
try {
  await import("pg");
} catch {
  console.error("pg is not installed. Run:  npm i --no-save pg");
  process.exit(1);
}
const { Client } = await import("pg");

const client = new Client({ connectionString: dbUrl });
await client.connect();

try {
  let owner = process.argv[2];

  if (!owner) {
    const { rows } = await client.query(
      "SELECT id FROM users ORDER BY created_at DESC LIMIT 1",
    );
    if (rows.length === 0) {
      console.error(
        "No rows in `users`, so there is nobody to seed.\n" +
          "Sign in to the app first (that calls ensure_profile()), or pass a\n" +
          "Clerk user id explicitly:  npm run seed-dev user_2abc...",
      );
      process.exit(1);
    }
    owner = rows[0].id;
    console.log(`No id given — seeding the newest users row: ${owner}`);
  } else {
    // Create the profile if this id has never signed in, otherwise the FK on
    // houses.owner_id fails.
    await client.query(
      "INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING",
      [owner],
    );
  }

  // set_config rather than SET, so the id goes through as a parameter.
  await client.query("SELECT set_config('app.seed_owner', $1, false)", [owner]);
  await client.query(readFileSync(SEED_FILE, "utf8"));

  const { rows: counts } = await client.query(
    `SELECT (SELECT count(*) FROM houses         WHERE owner_id = $1) AS houses,
            (SELECT count(*) FROM tenants        WHERE owner_id = $1 AND is_active) AS active_tenants,
            (SELECT count(*) FROM tenants        WHERE owner_id = $1 AND NOT is_active) AS former_tenants,
            (SELECT count(*) FROM bills          WHERE owner_id = $1) AS bills,
            (SELECT count(*) FROM bill_charges   WHERE owner_id = $1) AS bill_charges,
            (SELECT count(*) FROM charge_presets WHERE owner_id = $1) AS charge_presets`,
    [owner],
  );
  console.table(counts);

  const { rows: houses } = await client.query(
    "SELECT name, address, number_of_floors, tenant_count FROM v_house_list WHERE owner_id = $1 ORDER BY name",
    [owner],
  );
  console.table(houses);

  const { rows: money } = await client.query(
    `SELECT to_char(bill_month, 'Mon YYYY') AS month,
            count(*) AS bills,
            sum(total_billed)::text  AS billed,
            sum(amount_paid)::text   AS paid,
            sum(total_billed - amount_paid)::text AS pending
       FROM bills WHERE owner_id = $1
      GROUP BY bill_month ORDER BY bill_month`,
    [owner],
  );
  console.table(money);

  // The bill the mock receipt was drawn from.
  const { rows: receipt } = await client.query(
    `SELECT to_char(bill_month, 'Mon YYYY') AS month, rent_amount::text AS rent,
            units_consumed::text AS units, electricity_amount::text AS electricity,
            extra_charges_total::text AS extras, previous_balance::text AS prev,
            total_billed::text AS total, amount_paid::text AS paid
       FROM v_bill_receipt
      WHERE owner_id = $1 AND tenant_name = 'Mr. Rakesh'
      ORDER BY bill_month`,
    [owner],
  );
  console.log("Mr. Rakesh — compare the previous month against the mock receipt:");
  console.table(receipt);

  console.log(`Seeded owner ${owner}.`);
} finally {
  await client.end();
}

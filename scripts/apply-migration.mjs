// Applies one migration from src/db/migrations to the database.
//
//   npm run migrate src/db/migrations/0003_bill_form.sql
//
// Why this exists rather than pasting into the Neon SQL Editor: the console
// splits a script on every semicolon, which cuts a `BEGIN ATOMIC` function body
// in half — 0003's bill_draft and save_bill both have semicolons inside their
// bodies and fail there with "syntax error at end of input". This sends the file
// to the server in one piece and lets Postgres do the parsing.
//
// There is no ledger of applied migrations; the numbered files are the record.
// Re-running one is the caller's problem, which is why the whole file goes in a
// single transaction: on any error nothing is left half-applied.
import { existsSync, readFileSync } from "node:fs";

const ENV_FILE = ".env.local";
const KEY = "DATABASE_URL_UNPOOLED";

const file = process.argv[2];
if (!file) {
  console.error(
    "Which migration? e.g.  npm run migrate src/db/migrations/0003_bill_form.sql",
  );
  process.exit(1);
}
for (const f of [ENV_FILE, file]) {
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
    dbUrl = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
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
  await client.query("BEGIN");
  await client.query(readFileSync(file, "utf8"));
  await client.query("COMMIT");

  // The Data API serves .rpc() and .from() out of a cached schema, so a new view
  // or function is "not found in the schema cache" until PostgREST rebuilds it.
  // NOTIFY is PostgREST's own mechanism and is left in because it costs nothing,
  // but it does not work on Neon's managed Data API — 0005 was applied and the
  // Profile screen still 404'd on v_owner_summary until the refresh below was
  // sent. Neon's supported paths are the "Refresh schema cache" button on the
  // Data API page, or an empty PATCH to
  // /projects/{project}/branches/{branch}/data-api/{database}, which this script
  // cannot send without a Neon API key. Hence the reminder rather than the call.
  await client.query("NOTIFY pgrst, 'reload schema'");

  // Which branch this went to, because the answer is not always the one you are
  // testing: DATABASE_URL_UNPOOLED points at production while the app reads
  // EXPO_PUBLIC_NEON_DATA_API_URL, and those two named different branches for
  // long enough to cost an afternoon. Printed last so it is the line still on
  // screen when the migration is done.
  const { rows } = await client.query(
    "SELECT current_setting('neon.branch_id', true) AS branch",
  );

  console.log(`Applied ${file} to branch ${rows[0]?.branch ?? "unknown"}.`);
  console.log("Now run:  npm run gen-types");
  console.log(
    "Then refresh the Data API schema cache for that branch, or the app will\n" +
      "still be told the new view does not exist.",
  );
} catch (err) {
  await client.query("ROLLBACK");
  // The message names the statement that failed; the connection string is not
  // in it, but scrub anyway so a driver-level error can never leak the password.
  console.error(String(err.message ?? err).replaceAll(dbUrl, "<redacted>"));
  process.exit(1);
} finally {
  await client.end();
}

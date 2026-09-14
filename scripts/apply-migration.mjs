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

  // The Data API serves .rpc() and .from() out of a cached schema, so a new
  // function is "not found in the schema cache" until PostgREST is told to look
  // again. Cheap to send even when the migration added nothing callable.
  await client.query("NOTIFY pgrst, 'reload schema'");

  console.log(`Applied ${file}.`);
  console.log("Now run:  npm run gen-types");
} catch (err) {
  await client.query("ROLLBACK");
  // The message names the statement that failed; the connection string is not
  // in it, but scrub anyway so a driver-level error can never leak the password.
  console.error(String(err.message ?? err).replaceAll(dbUrl, "<redacted>"));
  process.exit(1);
} finally {
  await client.end();
}

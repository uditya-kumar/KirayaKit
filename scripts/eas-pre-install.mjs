// Brings the EAS builder's npm up to the major that wrote package-lock.json.
// It runs as the eas-build-pre-install hook, which EAS executes just before
// `npm ci --include=dev`; nothing runs it locally.
//
// The build image ships npm 10 (10.9.8, next to Node 22.23.1, at the time of
// writing) and this lock is written by npm 11. The two disagree about one
// optional peer dependency: three packages under @solana/web3.js, which Clerk's
// wallet support pulls in, ask for typescript@^5.0.0, and our typescript 6 does
// not satisfy that. npm 11 leaves the unmet optional peer out of the tree; npm 10
// wants a nested typescript@5.9.3, does not find it in the lock, and fails the
// build with "Missing: typescript@5.9.3 from lock file".
//
// Writing that entry into the lock is not a fix, tempting as it looks: the next
// `npm install` on npm 11 deletes it again, and the build after that breaks the
// same way with nothing in the diff to explain it. Upgrading the builder cannot
// rot like that — npm 11 installs a lock written by either version.
import { spawnSync } from "node:child_process";

// The major is what has to match, so it is all that is pinned; a patch version
// here would be one more number to remember to bump.
const { status, error } = spawnSync("npm", ["install", "--global", "npm@11"], {
  stdio: "inherit",
  // npm is a shell script on the builder and a .cmd on Windows, where spawn
  // cannot run it directly.
  shell: process.platform === "win32",
});

if (error) {
  console.error(error.message);
}
// Failing here rather than letting the build reach `npm ci` with the old npm: the
// error it would give instead blames the lock file, which is not the problem.
process.exit(status ?? 1);

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/verify-audit.mjs <exported-audit.json>");
  process.exit(2);
}
const record = JSON.parse(await readFile(file, "utf8"));
const projects = Array.isArray(record)
  ? record
  : (record.workspace?.projects ?? record.projects);
if (!Array.isArray(projects)) {
  console.error(
    "Expected a workspace export or an array of project audit records.",
  );
  process.exit(2);
}
let count = 0;
for (const project of projects) {
  let previous = "genesis";
  for (const event of project.audit) {
    const { hash, ...payload } = event;
    const actual = createHash("sha256")
      .update(
        JSON.stringify({
          id: payload.id,
          at: payload.at,
          actor: payload.actor,
          action: payload.action,
          detail: payload.detail,
          previousHash: payload.previousHash,
        }),
      )
      .digest("hex");
    if (payload.previousHash !== previous || hash !== actual) {
      console.error(
        `Integrity failure in project ${project.name}, event ${event.id}`,
      );
      process.exit(1);
    }
    previous = hash;
    count++;
  }
}
console.log(
  `Verified ${count} linked events across ${projects.length} projects. A valid chain detects edits, but is not external proof of identity or time.`,
);

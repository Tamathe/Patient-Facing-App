#!/usr/bin/env node
// Navigator recommendation gate — the LIVE tier. Runs the family vignette corpus
// through the real extraction + ranking path and writes a dated report next to
// the crisis-gate results.
//
// This tier is ADVISORY and never gates a build: `npm run check` must stay green
// with zero environment variables, so the build-breaking assertions live in
// src/domain/family-vignettes.test.ts (deterministic tier) instead.
//
// Requires HEALTH_AI_API_KEY. Run: npm run navigator:gate
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const LEAD_ACCURACY_TARGET = 0.8;

if (!process.env.HEALTH_AI_API_KEY) {
  console.error(
    "navigator:gate needs HEALTH_AI_API_KEY (and HEALTH_AI_PROVIDER=openai) to exercise the live path.\n" +
      "The deterministic tier runs inside `npm test` with no key and is the build-breaking one."
  );
  process.exit(1);
}

const COMMAND = "npx vitest run src/domain/family-vignettes.live.test.ts";

let output = "";
let result = "PASS";
try {
  output = execSync(COMMAND, {
    encoding: "utf8",
    stdio: "pipe",
    env: { ...process.env, NAVIGATOR_GATE_LIVE: "1" }
  });
} catch (error) {
  result = "FAIL";
  output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
}

const plainOutput = output.replace(/\[[0-9;]*m/g, "");
const trimmedOutput = plainOutput.trim().split("\n").slice(-60).join("\n");
const date = new Date().toISOString().slice(0, 10);
const dir = "docs/ops/red-team-results";
mkdirSync(dir, { recursive: true });
// Deliberately a different filename from <date>-crisis-gate.md so the two
// reports never overwrite each other on the same day.
const file = `${dir}/${date}-navigator-gate.md`;

const markdown = `# Navigator recommendation gate (live tier)

## Date

${date}

## Command

\`\`\`
${COMMAND}
\`\`\`

## Result

${result}

## Output

\`\`\`
${trimmedOutput}
\`\`\`

## Interpretation

Advisory. This tier exercises the live extraction and ranking path against the
family vignette corpus and reports lead-concern accuracy against a target of
${LEAD_ACCURACY_TARGET}. It does not gate the build: the build-breaking assertions are the
deterministic tier in \`src/domain/family-vignettes.test.ts\`, which runs inside
\`npm run check\` with zero environment variables.

Vignettes whose \`reviewedBy\` field is empty are engineering drafts, not
clinician-reviewed cases. A passing report on unreviewed vignettes means the
engine does what it was told; it says nothing about whether it was told the
right thing.
`;

writeFileSync(file, markdown, "utf8");
console.log(`Navigator gate ${result}. Wrote ${file}`);
process.exit(result === "PASS" ? 0 : 1);

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const base = (process.argv[2] || "http://localhost:8080").replace(/\/$/, "");
const origin = base.includes("localhost") ? "http://localhost:5173" : base;
const evidence = {
  base,
  at: new Date().toISOString(),
  checks: [],
  durationsMs: [],
  cleanup: [],
};
function check(name, condition) {
  assert.ok(condition, name);
  evidence.checks.push(name);
  console.log("PASS " + name);
}
function client() {
  let cookie = "",
    csrf = "";
  return async (path, method = "GET", body, expected = 200) => {
    const start = performance.now();
    const response = await fetch(base + "/api" + path, {
      method,
      headers: {
        Origin: origin,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    evidence.durationsMs.push(Math.round(performance.now() - start));
    const result = await response.json();
    assert.equal(
      response.status,
      expected,
      `Unexpected status for ${path.replace(/offers\/[^/]+/, "offers/<redacted>")}: ${result.error || response.status}`,
    );
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    if (result.csrfToken) csrf = result.csrfToken;
    return { body: result, headers: response.headers };
  };
}
const studio = client(),
  other = client(),
  newOwner = client();
let studioName, otherName, ownerName;
let ownerClient = newOwner;
try {
  const homepage = await fetch(base);
  const html = await homepage.text();
  check(
    "public application serves with security policy",
    homepage.ok &&
      html.includes("Pactshift") &&
      !!homepage.headers.get("content-security-policy"),
  );
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(
    (m) => m[1],
  );
  check(
    "compiled application assets are reachable",
    assets.length >= 2 &&
      (
        await Promise.all(
          assets.map(async (asset) => (await fetch(base + asset)).ok),
        )
      ).every(Boolean),
  );
  check("health reports ready", (await studio("/health")).body.status === "ok");
  const denied = await fetch(base + "/api/auth/demo", {
    method: "POST",
    headers: {
      Origin: "https://untrusted.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  check("foreign origin rejected", denied.status === 403);
  const initial = await studio("/auth/demo", "POST", {}, 201);
  studioName = initial.body.workspace.name;
  check(
    "persistent production adapter",
    !base.startsWith("https:") ||
      initial.body.capabilities.persistence === "firestore",
  );
  check(
    "secure session cookie",
    !base.startsWith("https:") ||
      (/HttpOnly/i.test(initial.headers.get("set-cookie")) &&
        /Secure/i.test(initial.headers.get("set-cookie")) &&
        /__Host-pactshift/.test(initial.headers.get("set-cookie"))),
  );
  const p = initial.body.workspace.projects[0],
    r = p.requests[0];
  const b = (await other("/auth/demo", "POST", {}, 201)).body;
  otherName = b.workspace.name;
  await other(`/projects/${p.id}`, "PATCH", { archived: true }, 404);
  check("cross-workspace project access rejected", true);
  const shared = (
    await studio(`/projects/${p.id}/requests/${r.id}/share`, "POST", {})
  ).body;
  const publicClient = client();
  const publicOffer = (await publicClient(`/offers/${shared.shareToken}`)).body;
  check(
    "client view hides internal costs",
    !JSON.stringify(publicOffer).includes("costRateCents") &&
      !JSON.stringify(publicOffer).includes("passwordHash"),
  );
  const outcome = (
    await publicClient(`/offers/${shared.shareToken}/decide`, "POST", {
      choice: "swap",
      clientName: "Release verification (fictional)",
      acknowledged: true,
    })
  ).body;
  check(
    "scope exchange accepted",
    outcome.choice === "swap" && outcome.version === 2,
  );
  await publicClient(`/offers/${shared.shareToken}/decide`, "POST", {
    choice: "swap",
    clientName: "Release verification (fictional)",
    acknowledged: true,
  });
  const after = (await studio("/bootstrap")).body.workspace.projects[0];
  check("idempotent replay preserves one new version", after.version === 2);
  check(
    "swap preserves budget and date",
    after.budgetCents === p.budgetCents && after.dueDate === p.dueDate,
  );
  check(
    "swap updates actual scope from 96 to 92 hours",
    after.deliverables
      .filter((d) => d.status !== "swapped")
      .reduce((n, d) => n + d.hours, 0) === 92,
  );
  const exported = (await studio("/export")).body;
  check(
    "workspace export excludes private links",
    !JSON.stringify(exported).includes(shared.shareToken),
  );
  const auditDir = await mkdtemp(join(tmpdir(), "pactshift-release-"));
  try {
    const file = join(auditDir, "workspace.json");
    await writeFile(file, JSON.stringify(exported), { mode: 0o600 });
    const result = execFileSync(
      process.execPath,
      ["scripts/verify-audit.mjs", file],
      { encoding: "utf8" },
    );
    check(
      "exported audit verifies independently after Firestore serialization",
      result.startsWith("Verified "),
    );
  } finally {
    await rm(auditDir, { recursive: true, force: true });
  }
  const analyzed = (
    await studio(
      `/projects/${p.id}/requests`,
      "POST",
      {
        title: "German-language pages",
        message:
          "Please add German translations of the six core pages in addition to the English and Spanish pages. We will supply the approved German copy.",
        hours: 10,
      },
      201,
    )
  ).body;
  evidence.analysis = {
    engine: analyzed.analysis.engine,
    model: analyzed.analysis.model,
    citationCount: analyzed.analysis.evidence.length,
  };
  check(
    "new request executes the configured analysis engine",
    analyzed.analysis.engine ===
      (initial.body.capabilities.ai === "vertex" ? "vertex" : "rules"),
  );
  const email =
    "release-" + randomBytes(8).toString("hex") + "@example.invalid";
  const password = randomBytes(24).toString("base64url");
  const registered = (
    await newOwner(
      "/auth/register",
      "POST",
      {
        name: "Release QA",
        email,
        password,
        workspaceName: "Disposable release verification",
      },
      201,
    )
  ).body;
  ownerName = registered.workspace.name;
  check(
    "new owner starts with empty workspace",
    registered.workspace.projects.length === 0 &&
      registered.recoveryCode.length > 30,
  );
  const created = (
    await newOwner(
      "/projects",
      "POST",
      {
        name: "Release QA project",
        client: "Fictional Client",
        description: "Two English pages only. Translation is excluded.",
        currency: "USD",
        budgetCents: 200000,
        rateCents: 10000,
        costRateCents: 5000,
        capacityHoursPerDay: 6,
        dueDate: "2026-10-20",
        deliverables: [
          {
            title: "Website",
            description: "Two English pages",
            hours: 12,
            locked: true,
            dependsOn: [],
          },
          {
            title: "Resource library",
            description: "Four articles",
            hours: 8,
            locked: false,
            dependsOn: [],
          },
        ],
      },
      201,
    )
  ).body;
  check(
    "new owner can create an actual project",
    created.version === 1 && created.baselines[0].dueDate === "2026-10-20",
  );
  await newOwner(
    `/projects/${created.id}/deliverables/${created.deliverables[1].id}`,
    "PATCH",
    { status: "in_progress" },
  );
  const active = (await newOwner("/bootstrap")).body.workspace.projects[0];
  check(
    "starting delivery versions the agreement",
    active.version === 2 && active.deliverables[1].status === "in_progress",
  );
  const newPassword = randomBytes(24).toString("base64url");
  const recover = client();
  const recovered = (
    await recover("/auth/recover", "POST", {
      email,
      recoveryCode: registered.recoveryCode,
      password: newPassword,
    })
  ).body;
  ownerClient = recover;
  check(
    "account recovery rotates recovery code",
    recovered.recoveryCode !== registered.recoveryCode,
  );
  await newOwner("/bootstrap", "GET", undefined, 401);
  check("recovery invalidates old sessions", true);
  await recover("/workspace", "DELETE", { confirmation: ownerName });
  ownerName = undefined;
  evidence.cleanup.push("registered test account deleted");
  await studio("/workspace", "DELETE", { confirmation: studioName });
  studioName = undefined;
  evidence.cleanup.push("first demo deleted");
  await publicClient(`/offers/${shared.shareToken}`, "GET", undefined, 410);
  check("deleted workspace invalidates client link", true);
  await other("/workspace", "DELETE", { confirmation: otherName });
  otherName = undefined;
  evidence.cleanup.push("second demo deleted");
  evidence.result = "pass";
} catch (error) {
  evidence.result = "failed";
  evidence.error = error instanceof Error ? error.message : "Unknown error";
  throw error;
} finally {
  for (const [call, name] of [
    [studio, studioName],
    [other, otherName],
    [ownerClient, ownerName],
  ])
    if (name)
      try {
        await call("/workspace", "DELETE", { confirmation: name });
        evidence.cleanup.push("remaining fixture deleted");
      } catch {
        evidence.cleanup.push(
          "fixture cleanup failed; operator review required",
        );
      }
  const times = [...evidence.durationsMs].sort((a, b) => a - b);
  evidence.requestCount = times.length;
  evidence.medianMs = times[Math.floor(times.length / 2)];
  evidence.maxMs = times.at(-1);
  await writeFile(
    "docs/RELEASE_EVIDENCE.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
}

import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { LocalStore } from "../server/store.js";
import {
  decide,
  rulesAnalysis,
  seedWorkspace,
  swappable,
  verifyAudit,
} from "../server/domain.js";
import { validateAnalysis } from "../server/analysis.js";

describe("transaction and scope invariants", () => {
  it("serializes concurrent updates, survives reopen, and rolls back failed writes", async () => {
    const folder = await mkdtemp(path.join(os.tmpdir(), "pactshift-"));
    try {
      const file = path.join(folder, "state.json");
      const store = new LocalStore(file);
      await store.transaction(async (tx) => tx.set("counter", 0));
      await Promise.all(
        Array.from({ length: 20 }, () =>
          store.transaction(async (tx) => {
            const count = (await tx.get<number>("counter")) ?? 0;
            await Promise.resolve();
            tx.set("counter", count + 1);
          }),
        ),
      );
      await expect(
        store.transaction(async (tx) => {
          tx.set("counter", 999);
          throw new Error("Abort");
        }),
      ).rejects.toThrow("Abort");
      expect(
        await new LocalStore(file).transaction((tx) => tx.get("counter")),
      ).toBe(20);
      expect(JSON.parse(await readFile(file, "utf8")).counter).toBe(20);
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });
  it("disallows planned work with active dependents and detects history tampering", () => {
    const project = seedWorkspace("test").projects[0];
    const resource = project.deliverables[3];
    expect(swappable(project, resource)).toBe(true);
    project.deliverables[4].dependsOn.push(resource.id);
    expect(swappable(project, resource)).toBe(false);
    expect(verifyAudit(project.audit)).toBe(true);
    project.audit[0].detail = "tampered";
    expect(verifyAudit(project.audit)).toBe(false);
  });
  it("verifies audit events even when a database reorders object keys", () => {
    const events = seedWorkspace("test").projects[0].audit;
    const reordered = events.map((event) =>
      Object.fromEntries(
        Object.entries(event).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
    );
    expect(verifyAudit(reordered as typeof events)).toBe(true);
  });
  it("rejects fabricated citations and included classifications without evidence", () => {
    const project = seedWorkspace("test").projects[0];
    const valid = {
      classification: "addition",
      summary: "More work.",
      evidence: [
        {
          deliverableId: project.deliverables[2].id,
          quote: "Six English pages",
          explanation: "English scope.",
        },
      ],
      assumptions: [],
      suggestedHours: 12,
    };
    expect(validateAnalysis(valid, project).classification).toBe("addition");
    expect(() =>
      validateAnalysis(
        {
          ...valid,
          evidence: [
            { ...valid.evidence[0], quote: "Multilingual is included" },
          ],
        },
        project,
      ),
    ).toThrow("Ungrounded");
    expect(() =>
      validateAnalysis(
        {
          ...valid,
          evidence: [{ ...valid.evidence[0], deliverableId: "invented-id" }],
        },
        project,
      ),
    ).toThrow("Ungrounded");
    expect(() =>
      validateAnalysis(
        { ...valid, classification: "included", evidence: [] },
        project,
      ),
    ).toThrow("Missing");
  });
  it("uses project scope boundaries as grounded evidence alongside deliverables", () => {
    const project = seedWorkspace("test").projects[0];
    project.description =
      "The agreement includes six Spanish language pages. A custom booking platform is excluded.";
    const included = rulesAnalysis(
      project,
      "Spanish language pages",
      "Please add six Spanish language pages.",
      12,
    );
    expect(included.classification).toBe("included");
    expect(included.evidence[0].deliverableId).toBe(project.id);
    expect(validateAnalysis(included, project).evidence[0].quote).toContain(
      "includes six Spanish",
    );
    const excluded = rulesAnalysis(
      project,
      "Custom booking platform",
      "Could we have a custom booking platform?",
      10,
    );
    expect(excluded.classification).toBe("addition");
    expect(excluded.evidence[0].quote).toContain("excluded");
    expect(() =>
      validateAnalysis(
        {
          ...included,
          evidence: [
            {
              deliverableId: project.id,
              quote: "Nonexistent promise",
              explanation: "Fabricated",
            },
          ],
        },
        project,
      ),
    ).toThrow("Ungrounded");
  });
  it("does not allow duplicate exchange items to manufacture capacity", () => {
    const project = seedWorkspace("test").projects[0];
    const change = project.requests[0];
    change.status = "shared";
    change.shareExpiresAt = new Date(Date.now() + 100000).toISOString();
    change.hours = 20;
    change.swapIds = [project.deliverables[3].id, project.deliverables[3].id];
    expect(() => decide(project, change, "swap", "Client")).toThrow(
      "Duplicate",
    );
    expect(project.version).toBe(1);
  });
});

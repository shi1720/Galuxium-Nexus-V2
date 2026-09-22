import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleAuth } from "google-auth-library";
import { analyze } from "../server/analysis.js";
import { seedWorkspace } from "../server/domain.js";

beforeEach(() => {
  vi.stubEnv("AI_PROVIDER", "vertex");
  vi.stubEnv("GOOGLE_CLOUD_PROJECT", "pactshift-test");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("bounded advisory AI pipeline", () => {
  it("includes scope boundaries, excludes internal cost, and returns validated model evidence", async () => {
    const project = seedWorkspace("test").projects[0];
    vi.spyOn(GoogleAuth.prototype, "getAccessToken").mockResolvedValue(
      "test-token",
    );
    const candidate = {
      classification: "addition",
      summary: "Spanish pages are additional to the English baseline.",
      evidence: [
        {
          deliverableId: project.deliverables[2].id,
          quote: "Six English pages",
          explanation: "The baseline language is English.",
        },
      ],
      assumptions: ["Client supplies translation."],
      suggestedHours: 12,
    };
    const upstream = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: JSON.stringify(candidate) }] } },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", upstream);
    const result = await analyze(
      project,
      "Spanish pages",
      "Please add Spanish pages.",
      12,
    );
    expect(result.engine).toBe("vertex");
    const body = JSON.parse(upstream.mock.calls[0][1].body);
    const payload = JSON.parse(body.contents[0].parts[0].text);
    expect(payload.projectScope.description).toBe(project.description);
    expect(payload.projectScope.id).toBe(project.id);
    expect(payload.costRateCents).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain("costRateCents");
  });
  it("falls back transparently when an upstream response contains invented evidence", async () => {
    const project = seedWorkspace("test").projects[0];
    vi.spyOn(GoogleAuth.prototype, "getAccessToken").mockResolvedValue(
      "test-token",
    );
    const candidate = {
      classification: "included",
      summary: "Invented.",
      evidence: [
        {
          deliverableId: "fabricated",
          quote: "Everything is included",
          explanation: "Invented",
        },
      ],
      assumptions: [],
      suggestedHours: 12,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: JSON.stringify(candidate) }] } },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await analyze(
      project,
      "Spanish pages",
      "Please add Spanish pages.",
      12,
    );
    expect(result.engine).toBe("rules");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("response_validation_failed"),
    );
  });
  it("enforces the overall deadline even while credential lookup hangs", async () => {
    vi.useFakeTimers();
    vi.spyOn(GoogleAuth.prototype, "getAccessToken").mockImplementation(
      () => new Promise(() => {}),
    );
    const pending = analyze(
      seedWorkspace("test").projects[0],
      "Spanish pages",
      "Please add Spanish pages.",
      12,
    );
    await vi.advanceTimersByTimeAsync(12001);
    expect((await pending).engine).toBe("rules");
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("deadline_exceeded"),
    );
  });
});

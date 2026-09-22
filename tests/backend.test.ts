import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import { GoogleAuth } from "google-auth-library";
import { createApp } from "../server/app.js";
import { LocalStore } from "../server/store.js";
import { hash, verifyAudit } from "../server/domain.js";
import type { Bootstrap, ChangeRequest } from "../shared/types.js";

const origin = "http://localhost:5173";
const password = "correct-horse-battery-24";
let store: LocalStore;
let app: ReturnType<typeof createApp>;
type Client = { agent: ReturnType<typeof request.agent>; data: Bootstrap };
async function demo(): Promise<Client> {
  const agent = request.agent(app);
  const result = await agent
    .post("/api/auth/demo")
    .set("Origin", origin)
    .send({});
  expect(result.status).toBe(201);
  return { agent, data: result.body };
}
function mutation(
  client: Client,
  method: "post" | "patch" | "delete",
  path: string,
  body: object = {},
) {
  return client.agent[method](path)
    .set("Origin", origin)
    .set("X-CSRF-Token", client.data.csrfToken)
    .send(body);
}
async function share(client: Client, change?: ChangeRequest) {
  const p = client.data.workspace.projects[0];
  return mutation(
    client,
    "post",
    `/api/projects/${p.id}/requests/${(change ?? p.requests[0]).id}/share`,
  );
}
async function approve(token: string, choice = "swap") {
  return request(app)
    .post(`/api/offers/${token}/decide`)
    .set("Origin", origin)
    .send({ choice, clientName: "Alex at Forma", acknowledged: true });
}

beforeEach(() => {
  store = new LocalStore(undefined);
  app = createApp(store, { origin, serveClient: false, rateLimits: false });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sessions and account lifecycle", () => {
  it("uses the only cookie Firebase Hosting forwards and preserves production CSRF and cache protection", async () => {
    const cleanOrigin = "https://pactshift.web.app";
    const hosted = createApp(store, {
      production: true,
      origin: cleanOrigin + "/",
      serveClient: false,
      rateLimits: false,
    });
    const login = await request(hosted)
      .post("/api/auth/demo")
      .set("Origin", cleanOrigin)
      .send({});
    expect(login.status).toBe(201);
    const setCookie = login.headers["set-cookie"][0] as string;
    expect(setCookie).toMatch(/^__session=/);
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).not.toContain("Domain=");
    // Firebase strips every other cookie before forwarding the request.
    const forwardedCookie = setCookie.split(";")[0];
    const bootstrap = await request(hosted)
      .get("/api/bootstrap")
      .set("Cookie", forwardedCookie);
    expect(bootstrap.status).toBe(200);
    expect(bootstrap.headers["cache-control"]).toBe("no-store");
    expect(
      (
        await request(hosted)
          .patch("/api/workspace")
          .set("Origin", cleanOrigin)
          .set("Cookie", forwardedCookie)
          .send({ name: "Invalid CSRF" })
      ).status,
    ).toBe(403);
    const update = await request(hosted)
      .patch("/api/workspace")
      .set("Origin", cleanOrigin)
      .set("Cookie", forwardedCookie)
      .set("X-CSRF-Token", login.body.csrfToken)
      .send({ name: "Hosted Studio" });
    expect(update.status).toBe(200);
    const logout = await request(hosted)
      .post("/api/auth/logout")
      .set("Origin", cleanOrigin)
      .set("Cookie", forwardedCookie)
      .set("X-CSRF-Token", login.body.csrfToken)
      .send({});
    expect(logout.status).toBe(200);
    expect(logout.headers["set-cookie"][0]).toMatch(/^__session=;/);
    expect(
      (
        await request(hosted)
          .get("/api/bootstrap")
          .set("Cookie", forwardedCookie)
      ).status,
    ).toBe(401);
  });
  it("redirects direct-host pages to the canonical site without redirecting API or POST traffic", async () => {
    const hosted = createApp(store, {
      production: true,
      origin: "https://pactshift.web.app",
      serveClient: false,
      rateLimits: false,
    });
    const page = await request(hosted)
      .get("/app/projects?view=active")
      .set("Host", "old-service.run.app");
    expect(page.status).toBe(308);
    expect(page.headers.location).toBe(
      "https://pactshift.web.app/app/projects?view=active",
    );
    const api = await request(hosted)
      .get("/api/bootstrap")
      .set("Host", "old-service.run.app");
    expect(api.status).toBe(401);
    expect(api.headers.location).toBeUndefined();
    const rejected = await request(hosted)
      .post("/api/auth/demo")
      .set("Origin", "https://old-service.run.app")
      .send({});
    expect(rejected.status).toBe(403);
    expect(rejected.headers.location).toBeUndefined();
    expect(
      (
        await request(hosted)
          .post("/some-page")
          .set("Host", "old-service.run.app")
          .send({})
      ).status,
    ).not.toBe(308);
  });
  it("registers, authenticates, rotates recovery, invalidates prior sessions and deletes the workspace", async () => {
    const agent = request.agent(app);
    const registration = await agent
      .post("/api/auth/register")
      .set("Origin", origin)
      .send({
        name: "Shivam Gupta",
        email: "Shivam@example.com",
        password,
        workspaceName: "Test Studio",
      });
    expect(registration.status).toBe(201);
    expect(registration.body.user.email).toBe("shivam@example.com");
    expect(registration.body.user.passwordHash).toBeUndefined();
    expect(registration.body.recoveryCode).toHaveLength(43);
    expect(registration.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(registration.headers["set-cookie"][0]).toContain("SameSite=Lax");
    expect((await agent.get("/api/bootstrap")).status).toBe(200);
    const second = request.agent(app);
    const loggedIn = await second
      .post("/api/auth/login")
      .set("Origin", origin)
      .send({ email: "shivam@example.com", password });
    expect(loggedIn.status).toBe(200);
    const recovery = request.agent(app);
    const recovered = await recovery
      .post("/api/auth/recover")
      .set("Origin", origin)
      .send({
        email: "shivam@example.com",
        password: "an-even-better-password",
        recoveryCode: registration.body.recoveryCode,
      });
    expect(recovered.status).toBe(200);
    expect(recovered.body.recoveryCode).not.toBe(
      registration.body.recoveryCode,
    );
    expect((await agent.get("/api/bootstrap")).status).toBe(401);
    expect((await second.get("/api/bootstrap")).status).toBe(401);
    const replay = await request(app)
      .post("/api/auth/recover")
      .set("Origin", origin)
      .send({
        email: "shivam@example.com",
        password,
        recoveryCode: registration.body.recoveryCode,
      });
    expect(replay.status).toBe(401);
    const client = { agent: recovery, data: recovered.body };
    expect(
      (
        await mutation(client, "delete", "/api/workspace", {
          confirmation: "wrong",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await mutation(client, "delete", "/api/workspace", {
          confirmation: "Test Studio",
        })
      ).status,
    ).toBe(200);
    expect((await recovery.get("/api/bootstrap")).status).toBe(401);
    expect(
      await store.transaction((tx) =>
        tx.get(`emails/${hash("shivam@example.com")}`),
      ),
    ).toBeUndefined();
  });
  it("enforces origin, CSRF and password requirements", async () => {
    expect((await request(app).post("/api/auth/demo").send({})).status).toBe(
      403,
    );
    expect(
      (
        await request(app)
          .post("/api/auth/demo")
          .set("Origin", "https://evil.example")
          .send({})
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post("/api/auth/register")
          .set("Origin", origin)
          .send({
            name: "A",
            workspaceName: "B",
            email: "a@example.com",
            password: "short",
          })
      ).status,
    ).toBe(400);
    const client = await demo();
    expect(
      (
        await client.agent
          .patch("/api/workspace")
          .set("Origin", origin)
          .send({ name: "Hijacked" })
      ).status,
    ).toBe(403);
    expect(
      (
        await client.agent
          .patch("/api/workspace")
          .set("Origin", origin)
          .set("X-CSRF-Token", "a".repeat(43))
          .send({ name: "Hijacked" })
      ).status,
    ).toBe(403);
    expect(
      (
        await mutation(client, "patch", "/api/workspace", {
          name: "Updated Studio",
        })
      ).status,
    ).toBe(200);
    expect((await mutation(client, "post", "/api/auth/logout")).status).toBe(
      200,
    );
    expect((await client.agent.get("/api/bootstrap")).status).toBe(401);
  });
  it("isolates demo tenants and rejects foreign project identifiers", async () => {
    const one = await demo(),
      two = await demo();
    expect(one.data.workspace.id).not.toBe(two.data.workspace.id);
    const p = one.data.workspace.projects[0];
    const foreign = await mutation(two, "patch", `/api/projects/${p.id}`, {
      archived: true,
    });
    expect(foreign.status).toBe(404);
    const updated = await mutation(one, "patch", `/api/projects/${p.id}`, {
      archived: true,
    });
    expect(updated.body.archived).toBe(true);
    expect(
      (await two.agent.get("/api/bootstrap")).body.workspace.projects[0]
        .archived,
    ).toBe(false);
  });
});

describe("scope proposal workflow", () => {
  it("keeps a committed draft successful when optional AI enrichment cannot be persisted", async () => {
    vi.stubEnv("AI_PROVIDER", "vertex");
    vi.stubEnv("GOOGLE_CLOUD_PROJECT", "pactshift-test");
    vi.spyOn(GoogleAuth.prototype, "getAccessToken").mockResolvedValue(
      "test-token",
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const client = await demo();
    const project = client.data.workspace.projects[0];
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          classification: "addition",
                          summary: "Model enrichment",
                          evidence: [],
                          assumptions: [],
                          suggestedHours: 8,
                        }),
                      },
                    ],
                  },
                },
              ],
            }),
            { status: 200 },
          ),
        ),
    );
    const original = store.transaction.bind(store);
    vi.spyOn(store, "transaction")
      .mockImplementationOnce(original)
      .mockRejectedValueOnce(new Error("Temporary persistence failure"));
    const created = await mutation(
      client,
      "post",
      `/api/projects/${project.id}/requests`,
      {
        title: "Retained draft",
        message: "Please add an additional portfolio gallery.",
        hours: 8,
      },
    );
    expect(created.status).toBe(201);
    expect(created.body.analysis.engine).toBe("rules");
    const latest = (await client.agent.get("/api/bootstrap")).body.workspace;
    expect(
      latest.projects[0].requests.filter(
        (change: ChangeRequest) => change.title === "Retained draft",
      ),
    ).toHaveLength(1);
    expect(latest.usage.analyses).toBe(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("ai.enrichment_not_saved"),
    );
  });
  it("does not spend audit capacity on unchanged saves or rotate links on repeated share clicks", async () => {
    const client = await demo();
    const project = client.data.workspace.projects[0];
    const change = project.requests[0];
    const saved = await mutation(
      client,
      "patch",
      `/api/projects/${project.id}/requests/${change.id}`,
      {
        hours: change.hours,
        swapIds: change.swapIds,
        note: change.note,
        scheduleDays: change.scheduleDays,
      },
    );
    expect(saved.status).toBe(200);
    const shared = await Promise.all([share(client), share(client)]);
    expect(shared.map((response) => response.status)).toEqual([200, 200]);
    expect(shared[0].body.shareToken).toBe(shared[1].body.shareToken);
    const updated = (await client.agent.get("/api/bootstrap")).body.workspace
      .projects[0];
    expect(updated.audit).toHaveLength(project.audit.length + 1);
    expect(verifyAudit(updated.audit)).toBe(true);
  });
  it("ignores AI results produced against an agreement that changed while analysis was running", async () => {
    vi.stubEnv("AI_PROVIDER", "vertex");
    vi.stubEnv("GOOGLE_CLOUD_PROJECT", "pactshift-test");
    vi.spyOn(GoogleAuth.prototype, "getAccessToken").mockResolvedValue(
      "test-token",
    );
    const client = await demo();
    const project = client.data.workspace.projects[0];
    let announce!: () => void;
    const started = new Promise<void>((resolve) => {
      announce = resolve;
    });
    let complete!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        announce();
        return new Promise<Response>((resolve) => {
          complete = resolve;
        });
      }),
    );
    const pending = mutation(
      client,
      "post",
      `/api/projects/${project.id}/requests`,
      {
        title: "Late AI request",
        message: "Please add a new photo gallery to the site.",
        hours: 8,
      },
    ).then((response) => response);
    await started;
    const current = (await client.agent.get("/api/bootstrap")).body.workspace
      .projects[0];
    const change = current.requests.find(
      (item: ChangeRequest) => item.title === "Late AI request",
    );
    expect(
      (
        await mutation(
          client,
          "patch",
          `/api/projects/${project.id}/deliverables/${project.deliverables[2].id}`,
          { status: "done" },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await mutation(
          client,
          "patch",
          `/api/projects/${project.id}/requests/${change.id}`,
          { hours: 6 },
        )
      ).status,
    ).toBe(200);
    complete(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      classification: "addition",
                      summary: "Old agreement analysis",
                      evidence: [],
                      assumptions: [],
                      suggestedHours: 8,
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    expect((await pending).status).toBe(201);
    const refreshed = (
      await client.agent.get("/api/bootstrap")
    ).body.workspace.projects[0].requests.find(
      (item: ChangeRequest) => item.id === change.id,
    );
    expect(refreshed.baselineVersion).toBe(2);
    expect(refreshed.hours).toBe(6);
    expect(refreshed.analysis.engine).toBe("rules");
    expect(refreshed.analysis.summary).not.toBe("Old agreement analysis");
  });
  it("protects real work progress, enforces prerequisites and invalidates old proposals", async () => {
    const client = await demo();
    const p = client.data.workspace.projects[0];
    const shared = await share(client);
    const endpoint = (did: string) =>
      `/api/projects/${p.id}/deliverables/${did}`;
    expect(
      (
        await mutation(client, "patch", endpoint(p.deliverables[4].id), {
          status: "in_progress",
        })
      ).body.code,
    ).toBe("DEPENDENCIES_INCOMPLETE");
    const started = await mutation(
      client,
      "patch",
      endpoint(p.deliverables[3].id),
      { status: "in_progress" },
    );
    expect(started.status).toBe(200);
    expect(started.body.version).toBe(2);
    expect((await approve(shared.body.shareToken)).body.code).toBe(
      "STALE_BASELINE",
    );
    expect(
      (
        await mutation(client, "patch", endpoint(p.deliverables[3].id), {
          status: "planned",
        })
      ).body.code,
    ).toBe("INVALID_STATE");
    expect(
      (
        await mutation(client, "patch", endpoint(p.deliverables[2].id), {
          status: "done",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await mutation(client, "patch", endpoint(p.deliverables[4].id), {
          status: "in_progress",
        })
      ).status,
    ).toBe(200);
    const updated = (await client.agent.get("/api/bootstrap")).body.workspace
      .projects[0];
    expect(verifyAudit(updated.audit)).toBe(true);
  });
  it("shares a redacted offer and executes an atomic scope exchange exactly once", async () => {
    const client = await demo();
    const original = client.data.workspace.projects[0];
    const shared = await share(client);
    expect(shared.status).toBe(200);
    const token = shared.body.shareToken;
    const offer = await request(app).get(`/api/offers/${token}`);
    expect(offer.status).toBe(200);
    expect(offer.body.request.shareToken).toBeUndefined();
    expect(offer.body.request.analysis).toBeUndefined();
    expect(offer.body.costRateCents).toBeUndefined();
    expect(offer.body.audit).toBeUndefined();
    expect(offer.body.removed).toHaveLength(1);
    const accepted = await approve(token);
    expect(accepted.status).toBe(200);
    expect(accepted.body.version).toBe(2);
    expect((await approve(token)).status).toBe(200);
    expect((await approve(token, "add")).status).toBe(409);
    const updated = (await client.agent.get("/api/bootstrap")).body.workspace
      .projects[0];
    expect(updated.budgetCents).toBe(original.budgetCents);
    expect(updated.dueDate).toBe(original.dueDate);
    expect(updated.version).toBe(2);
    expect(
      updated.deliverables.find(
        (d: { title: string }) => d.title === "Resource library",
      ).status,
    ).toBe("swapped");
    expect(
      updated.deliverables.filter(
        (d: { title: string }) => d.title === "Spanish-language pages",
      ),
    ).toHaveLength(1);
    expect(updated.baselines).toHaveLength(2);
    expect(updated.baselines[0].deliverables).toHaveLength(5);
    expect(verifyAudit(updated.audit)).toBe(true);
    const exported = await client.agent.get("/api/export");
    expect(exported.headers["content-disposition"]).toContain("attachment");
    expect(JSON.stringify(exported.body)).not.toContain(token);
    expect(JSON.stringify(exported.body)).not.toContain("passwordHash");
  });
  it("adds the server-calculated fee and calendar schedule extension; deferral leaves baseline intact", async () => {
    const client = await demo();
    const original = client.data.workspace.projects[0];
    const shared = await share(client);
    expect((await approve(shared.body.shareToken, "add")).status).toBe(200);
    const p = (await client.agent.get("/api/bootstrap")).body.workspace
      .projects[0];
    expect(p.budgetCents).toBe(1_350_000);
    expect(Date.parse(p.dueDate) - Date.parse(original.dueDate)).toBe(
      2 * 86400000,
    );
    expect(
      p.deliverables.find(
        (d: { title: string }) => d.title === "Resource library",
      ).status,
    ).toBe("planned");
    expect(p.baselines[0].dueDate).toBe(original.dueDate);
    expect(p.baselines[1].dueDate).toBe(p.dueDate);
    const second = await demo();
    const deferred = await share(second);
    expect((await approve(deferred.body.shareToken, "defer")).status).toBe(200);
    const unchanged = (await second.agent.get("/api/bootstrap")).body.workspace
      .projects[0];
    expect(unchanged.version).toBe(1);
    expect(unchanged.budgetCents).toBe(1_200_000);
    expect(unchanged.deliverables).toHaveLength(5);
    expect(unchanged.requests[0].status).toBe("deferred");
  });
  it("keeps a prior decision receipt anchored to its immutable original budget and date", async () => {
    const client = await demo();
    const original = client.data.workspace.projects[0];
    const first = await share(client);
    await approve(first.body.shareToken, "add");
    const added = await mutation(
      client,
      "post",
      `/api/projects/${original.id}/requests`,
      {
        title: "Extra photo gallery",
        message: "Add a filterable gallery of architectural photographs.",
        hours: 6,
      },
    );
    const second = await share(client, added.body);
    expect((await approve(second.body.shareToken, "add")).status).toBe(200);
    const receipt = await request(app).get(
      `/api/offers/${first.body.shareToken}`,
    );
    expect(receipt.body.version).toBe(3);
    expect(receipt.body.request.acceptedVersion).toBe(2);
    expect(receipt.body.dueDate).toBe(original.dueDate);
    expect(receipt.body.budgetCents).toBe(original.budgetCents);
    expect(receipt.body.currentHours).toBe(96);
  });
  it("prevents stale concurrent approvals and keeps a valid audit chain", async () => {
    const client = await demo();
    const p = client.data.workspace.projects[0];
    const first = await share(client);
    const created = await mutation(
      client,
      "post",
      `/api/projects/${p.id}/requests`,
      {
        title: "New photo gallery",
        message: "Please add a separate photo gallery with filtering.",
        hours: 8,
      },
    );
    expect(created.status).toBe(201);
    const second = await share(client, created.body);
    const results = await Promise.all([
      approve(first.body.shareToken, "add"),
      approve(second.body.shareToken, "add"),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const updated = (await client.agent.get("/api/bootstrap")).body.workspace
      .projects[0];
    expect(updated.version).toBe(2);
    expect(
      updated.requests.filter((r: ChangeRequest) => r.status === "accepted"),
    ).toHaveLength(1);
    expect(verifyAudit(updated.audit)).toBe(true);
  });
  it("rejects locked work, insufficient capacity, unknown swaps and price tampering", async () => {
    const client = await demo();
    const p = client.data.workspace.projects[0];
    const url = `/api/projects/${p.id}/requests/${p.requests[0].id}`;
    expect(
      (
        await mutation(client, "patch", url, {
          swapIds: [p.deliverables[0].id],
        })
      ).status,
    ).toBe(409);
    expect(
      (await mutation(client, "patch", url, { swapIds: ["not-in-project"] }))
        .status,
    ).toBe(409);
    expect(
      (
        await mutation(client, "patch", url, {
          hours: 20,
          swapIds: [p.deliverables[3].id],
        })
      ).status,
    ).toBe(409);
    expect((await mutation(client, "patch", url, { feeCents: 1 })).status).toBe(
      400,
    );
    const patched = await mutation(client, "patch", url, {
      hours: 10,
      swapIds: [p.deliverables[3].id],
    });
    expect(patched.body.feeCents).toBe(125000);
    const baseline = (await client.agent.get("/api/bootstrap")).body.workspace
      .projects[0];
    expect(baseline.requests[0].hours).toBe(10);
  });
  it("requires acknowledgment and revokes/reissues capability links", async () => {
    const client = await demo();
    const p = client.data.workspace.projects[0];
    const shared = await share(client);
    const token = shared.body.shareToken;
    expect(
      (
        await request(app)
          .post(`/api/offers/${token}/decide`)
          .set("Origin", origin)
          .send({ choice: "swap", clientName: "A" })
      ).status,
    ).toBe(400);
    expect(
      (
        await mutation(
          client,
          "post",
          `/api/projects/${p.id}/requests/${p.requests[0].id}/revoke`,
        )
      ).status,
    ).toBe(200);
    expect((await approve(token)).status).toBe(410);
    const renewed = await share(client);
    expect(renewed.body.shareToken).not.toBe(token);
    expect((await approve(renewed.body.shareToken)).status).toBe(200);
  });
  it("rejects expired links, archived project decisions, malformed JSON and oversized payloads", async () => {
    const client = await demo();
    const p = client.data.workspace.projects[0];
    const shared = await share(client);
    await mutation(client, "patch", `/api/projects/${p.id}`, {
      archived: true,
    });
    expect((await approve(shared.body.shareToken)).status).toBe(409);
    await mutation(client, "patch", `/api/projects/${p.id}`, {
      archived: false,
    });
    const current = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(current + 8 * 86400000);
    expect((await approve(shared.body.shareToken)).status).toBe(410);
    vi.restoreAllMocks();
    expect(
      (
        await request(app)
          .post("/api/auth/demo")
          .set("Origin", origin)
          .set("Content-Type", "application/json")
          .send("{")
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post("/api/auth/demo")
          .set("Origin", origin)
          .send({ body: "x".repeat(105000) })
      ).status,
    ).toBe(413);
  });
});

describe("bounded production behavior", () => {
  it("frees quota by deleting only the explicitly confirmed project and revokes its links even at the audit cap", async () => {
    const client = await demo();
    const other = await demo();
    const project = client.data.workspace.projects[0];
    const shared = await share(client);
    expect(
      (
        await mutation(other, "delete", `/api/projects/${project.id}`, {
          confirmation: project.name,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await mutation(client, "delete", `/api/projects/${project.id}`, {
          confirmation: "wrong",
        })
      ).status,
    ).toBe(400);
    await store.transaction(async (tx) => {
      const workspace = await tx.get<Bootstrap["workspace"]>(
        `workspaces/${client.data.workspace.id}`,
      );
      workspace!.projects[0].audit = Array.from({ length: 100 }, () =>
        structuredClone(workspace!.projects[0].audit[0]),
      );
      tx.set(`workspaces/${client.data.workspace.id}`, workspace);
    });
    expect(
      (
        await mutation(client, "delete", `/api/projects/${project.id}`, {
          confirmation: project.name,
        })
      ).status,
    ).toBe(200);
    expect(
      (await request(app).get(`/api/offers/${shared.body.shareToken}`)).status,
    ).toBe(410);
    const remaining = await client.agent.get("/api/bootstrap");
    expect(remaining.status).toBe(200);
    expect(remaining.body.workspace.projects).toHaveLength(0);
    expect(
      (await other.agent.get("/api/bootstrap")).body.workspace.projects,
    ).toHaveLength(1);
  });
  it("reports the current monthly allowance before a new analysis is created", async () => {
    const client = await demo();
    await store.transaction(async (tx) => {
      const workspace = client.data.workspace;
      workspace.usage = { month: "2000-01", analyses: 30 };
      tx.set(`workspaces/${workspace.id}`, workspace);
    });
    const latest = (await client.agent.get("/api/bootstrap")).body;
    expect(latest.workspace.usage).toEqual({
      month: new Date().toISOString().slice(0, 7),
      analyses: 0,
    });
    expect(
      (
        await mutation(
          client,
          "post",
          `/api/projects/${client.data.workspace.projects[0].id}/requests`,
          {
            title: "New month request",
            message: "Please add an additional work page.",
            hours: 4,
          },
        )
      ).status,
    ).toBe(201);
    expect(
      (await client.agent.get("/api/bootstrap")).body.workspace.usage.analyses,
    ).toBe(1);
  });
  it("does not publish a proposal when its additional scope cannot fit the history limit", async () => {
    const client = await demo();
    await store.transaction(async (tx) => {
      const workspace = client.data.workspace;
      const project = workspace.projects[0];
      project.baselines = Array.from({ length: 50 }, () =>
        structuredClone(project.baselines[0]),
      );
      tx.set(`workspaces/${workspace.id}`, workspace);
    });
    const proposal = await share(client);
    expect(proposal.status).toBe(409);
    expect(proposal.body.code).toBe("PROJECT_LIMIT");
    const change = (await client.agent.get("/api/bootstrap")).body.workspace
      .projects[0].requests[0];
    expect(change.status).toBe("draft");
    expect(change.shareToken).toBeUndefined();
  });
  it("reuses a durable checkout attempt and blocks deletion while its payment link is open", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake_for_tests");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_tests");
    vi.stubEnv("STRIPE_STUDIO_PRICE_ID", "price_studio");
    vi.stubEnv("STRIPE_AGENCY_PRICE_ID", "price_agency");
    app = createApp(store, { origin, serveClient: false, rateLimits: false });
    const client = await demo();
    await store.transaction(async (tx) => {
      const storedUser = await tx.get<Record<string, unknown>>(
        `users/${client.data.user.id}`,
      );
      tx.set(`users/${client.data.user.id}`, { ...storedUser, isDemo: false });
      tx.set(`billing/${client.data.workspace.id}`, { customerId: "cus_test" });
    });
    const stripe = new Stripe("sk_test_fake_for_tests");
    const createSession = vi
      .spyOn(Object.getPrototypeOf(stripe.checkout.sessions), "create")
      .mockResolvedValue({
        id: "cs_test",
        url: "https://checkout.stripe.com/test-session",
      });
    const first = await mutation(client, "post", "/api/billing/checkout", {
      plan: "studio",
    });
    const replay = await mutation(client, "post", "/api/billing/checkout", {
      plan: "studio",
    });
    expect(first.status).toBe(200);
    expect(replay.body.url).toBe(first.body.url);
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession.mock.calls[0][1]).toMatchObject({
      idempotencyKey: expect.stringContaining("checkout-"),
    });
    expect(
      (
        await mutation(client, "post", "/api/billing/checkout", {
          plan: "agency",
        })
      ).body.code,
    ).toBe("OPEN_CHECKOUT");
    expect(
      (
        await mutation(client, "delete", "/api/workspace", {
          confirmation: client.data.workspace.name,
        })
      ).body.code,
    ).toBe("OPEN_CHECKOUT");
  });
  it("verifies billing signatures, rejects spoofed customers, deduplicates events and prevents canceled-subscription resurrection", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake_for_tests");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_tests");
    vi.stubEnv("STRIPE_STUDIO_PRICE_ID", "price_studio");
    vi.stubEnv("STRIPE_AGENCY_PRICE_ID", "price_agency");
    app = createApp(store, { origin, serveClient: false, rateLimits: false });
    const client = await demo();
    const workspace = client.data.workspace;
    workspace.isDemo = false;
    await store.transaction(async (tx) => {
      tx.set(`workspaces/${workspace.id}`, workspace);
      tx.set(`billing/${workspace.id}`, { customerId: "cus_actual" });
    });
    const stripe = new Stripe("sk_test_fake_for_tests");
    const created = Math.floor(Date.now() / 1000);
    async function send(
      eventId: string,
      type: string,
      customer = "cus_actual",
      timestamp = created,
    ) {
      const payload = JSON.stringify({
        id: eventId,
        object: "event",
        created: timestamp,
        type,
        data: {
          object: {
            id: "sub_test",
            object: "subscription",
            status: "active",
            customer,
            metadata: { workspaceId: workspace.id },
            items: { data: [{ price: { id: "price_studio" } }] },
          },
        },
      });
      const signature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: "whsec_tests",
      });
      return request(app)
        .post("/api/billing/webhook")
        .set("Content-Type", "application/json")
        .set("stripe-signature", signature)
        .send(payload);
    }
    expect(
      (
        await request(app)
          .post("/api/billing/webhook")
          .set("Content-Type", "application/json")
          .send("{}")
      ).status,
    ).toBe(400);
    expect(
      (await send("evt_spoof", "customer.subscription.created", "cus_foreign"))
        .status,
    ).toBe(200);
    expect((await client.agent.get("/api/bootstrap")).body.workspace.plan).toBe(
      "free",
    );
    expect(
      (await send("evt_create", "customer.subscription.created")).status,
    ).toBe(200);
    expect((await client.agent.get("/api/bootstrap")).body.workspace.plan).toBe(
      "studio",
    );
    expect(
      (await send("evt_create", "customer.subscription.created")).status,
    ).toBe(200);
    expect(
      (
        await send(
          "evt_old_delete",
          "customer.subscription.deleted",
          "cus_actual",
          created - 5,
        )
      ).status,
    ).toBe(200);
    expect((await client.agent.get("/api/bootstrap")).body.workspace.plan).toBe(
      "studio",
    );
    expect(
      (await send("evt_delete", "customer.subscription.deleted")).status,
    ).toBe(200);
    expect((await client.agent.get("/api/bootstrap")).body.workspace.plan).toBe(
      "free",
    );
    expect(
      (await send("evt_late_update", "customer.subscription.updated")).status,
    ).toBe(200);
    expect((await client.agent.get("/api/bootstrap")).body.workspace.plan).toBe(
      "free",
    );
  });
  it("enforces monthly analysis and project quotas", async () => {
    const client = await demo();
    const p = client.data.workspace.projects[0];
    await store.transaction(async (tx) => {
      const workspace = client.data.workspace;
      workspace.usage.analyses = 30;
      tx.set(`workspaces/${workspace.id}`, workspace);
    });
    expect(
      (
        await mutation(client, "post", `/api/projects/${p.id}/requests`, {
          title: "Extra page",
          message: "Please add an extra web page.",
          hours: 4,
        })
      ).status,
    ).toBe(409);
    const project = {
      name: "New project",
      client: "Example client",
      description: "An actual scoped project",
      currency: "USD",
      budgetCents: 100000,
      rateCents: 10000,
      costRateCents: 4000,
      capacityHoursPerDay: 6,
      dueDate: "2026-12-31",
      deliverables: [
        {
          title: "First deliverable",
          description: "Homepage",
          hours: 10,
          locked: false,
        },
      ],
    };
    expect(
      (await mutation(client, "post", "/api/projects", project)).status,
    ).toBe(201);
    expect(
      (await mutation(client, "post", "/api/projects", project)).status,
    ).toBe(201);
    expect(
      (await mutation(client, "post", "/api/projects", project)).status,
    ).toBe(409);
  });
  it("records rate limits in the repository across app instances", async () => {
    app = createApp(store, { origin, serveClient: false });
    for (let i = 0; i < 10; i++)
      expect(
        (
          await request(app)
            .post("/api/auth/demo")
            .set("Origin", origin)
            .send({})
        ).status,
      ).toBe(201);
    const other = createApp(store, { origin, serveClient: false });
    expect(
      (
        await request(other)
          .post("/api/auth/demo")
          .set("Origin", origin)
          .send({})
      ).status,
    ).toBe(429);
  });
  it("keeps unavailable billing honest and returns a minimal health response", async () => {
    const client = await demo();
    expect(client.data.capabilities.billing).toBe(false);
    expect(
      (
        await mutation(client, "post", "/api/billing/checkout", {
          plan: "studio",
        })
      ).body.code,
    ).toBe("DEMO_ACCOUNT");
    expect((await request(app).get("/api/health")).body).toEqual({
      status: "ok",
    });
    expect((await request(app).get("/api/does-not-exist")).status).toBe(404);
  });
  it("does not orphan a past-due subscription when a workspace has free entitlements", async () => {
    const client = await demo();
    await store.transaction(async (tx) => {
      tx.set(`billing/${client.data.workspace.id}`, {
        customerId: "cus_test",
        subscriptionId: "sub_past_due",
        subscriptionStatus: "past_due",
      });
    });
    const result = await mutation(client, "delete", "/api/workspace", {
      confirmation: client.data.workspace.name,
    });
    expect(result.status).toBe(409);
    expect(result.body.code).toBe("ACTIVE_SUBSCRIPTION");
    expect((await client.agent.get("/api/bootstrap")).status).toBe(200);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import Stripe from "stripe";
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
});

describe("sessions and account lifecycle", () => {
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

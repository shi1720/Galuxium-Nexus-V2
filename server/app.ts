import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { z, ZodError } from "zod";
import path from "node:path";
import { existsSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import type {
  Bootstrap,
  ChangeRequest,
  Project,
  PublicOffer,
  User,
  Workspace,
} from "../shared/types.js";
import type { Store, Transaction } from "./store.js";
import {
  AppError,
  assert,
  audit,
  boundWorkspace,
  createWorkspace,
  decide,
  hash,
  id,
  iso,
  month,
  normalizeBaselineDates,
  plans,
  rulesAnalysis,
  secret,
  seedWorkspace,
  snapshot,
  shiftDate,
  validateSwap,
} from "./domain.js";
import { analyze, vertexEnabled } from "./analysis.js";
import * as input from "./validation.js";

interface StoredUser extends User {
  passwordHash: string;
  recoveryHash: string;
  sessionIds: string[];
  sessionVersion: number;
  createdAt: string;
}
interface Session {
  userId: string;
  csrf: string;
  expiresAt: number;
  version: number;
}
interface Share {
  workspaceId: string;
  projectId: string;
  requestId: string;
  expiresAt: number;
}
interface Billing {
  customerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  eventCreated?: number;
  cancelledSubscriptions?: string[];
  checkout?: {
    attemptId: string;
    plan: "studio" | "agency";
    expiresAt: number;
    sessionId?: string;
    url?: string;
  };
}
type Identity = {
  user: StoredUser;
  workspace: Workspace;
  session: Session;
  sessionKey: string;
};
const same = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
const publicUser = ({
  id,
  name,
  email,
  workspaceId,
  isDemo,
}: StoredUser): User => ({ id, name, email, workspaceId, isDemo });
const userKey = (userId: string) => `users/${userId}`;
const workspaceKey = (workspaceId: string) => `workspaces/${workspaceId}`;
const emailKey = (email: string) => `emails/${hash(email)}`;
const sessionKey = (token: string) => `sessions/${hash(token)}`;
const shareKey = (token: string) => `shares/${hash(token)}`;
const hasOpenSubscription = (billing: Billing | undefined) =>
  !!billing?.subscriptionId &&
  !["canceled", "incomplete_expired"].includes(
    billing.subscriptionStatus ?? "unknown",
  );
const getParam = (request: Request, key: string) =>
  String(request.params[key] ?? "");
function saveWorkspace(tx: Transaction, workspace: Workspace) {
  boundWorkspace(workspace);
  tx.set(workspaceKey(workspace.id), workspace);
}

export function createApp(
  store: Store,
  options: {
    production?: boolean;
    origin?: string;
    serveClient?: boolean;
    rateLimits?: boolean;
  } = {},
) {
  const app = express();
  const production =
    options.production ?? process.env.NODE_ENV === "production";
  const configuredOrigin = new URL(
    options.origin ?? process.env.APP_ORIGIN ?? "http://localhost:5173",
  );
  if (
    !["http:", "https:"].includes(configuredOrigin.protocol) ||
    (production && configuredOrigin.protocol !== "https:")
  ) {
    throw new Error("APP_ORIGIN must be a valid HTTPS origin in production.");
  }
  const origin = configuredOrigin.origin;
  // Firebase Hosting forwards only __session to Cloud Run. Domain stays unset
  // so this remains host-only, alongside Secure, HttpOnly and SameSite=Lax.
  const cookieName = production ? "__session" : "pactshift_session";
  const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : undefined;
  const billingEnabled = () =>
    !!(
      stripe &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_STUDIO_PRICE_ID &&
      process.env.STRIPE_AGENCY_PRICE_ID
    );
  app.disable("x-powered-by");
  // Cloud Run terminates TLS at its immediate proxy. Never trust arbitrary client hop counts.
  if (production) app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: production ? [] : null,
        },
      },
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader("X-Request-Id", id());
    next();
  });
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.post(
    "/api/billing/webhook",
    express.raw({ type: "application/json", limit: "100kb" }),
    async (req, res) => {
      assert(
        stripe && process.env.STRIPE_WEBHOOK_SECRET,
        "Billing is not configured.",
        503,
        "NOT_CONFIGURED",
      );
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          req.header("stripe-signature") ?? "",
          process.env.STRIPE_WEBHOOK_SECRET,
        );
      } catch {
        throw new AppError(
          400,
          "Invalid webhook signature.",
          "INVALID_SIGNATURE",
        );
      }
      const supported = [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ];
      if (!supported.includes(event.type)) {
        res.json({ received: true });
        return;
      }
      const sub = event.data.object as Stripe.Subscription;
      const workspaceId = sub.metadata.workspaceId;
      if (!workspaceId) {
        res.json({ received: true });
        return;
      }
      await store.transaction(async (tx) => {
        const replayKey = `stripeEvents/${event.id}`;
        if (await tx.get(replayKey)) return;
        const workspace = await tx.get<Workspace>(workspaceKey(workspaceId));
        const billing = (await tx.get<Billing>(`billing/${workspaceId}`)) ?? {};
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        if (
          workspace &&
          !workspace.isDemo &&
          billing.customerId === customerId &&
          (!billing.eventCreated || event.created >= billing.eventCreated)
        ) {
          const priceIds = sub.items.data.map((item) => item.price.id);
          const allowedPlan = priceIds.includes(
            process.env.STRIPE_AGENCY_PRICE_ID ?? "",
          )
            ? "agency"
            : priceIds.includes(process.env.STRIPE_STUDIO_PRICE_ID ?? "")
              ? "studio"
              : "free";
          const enabled =
            event.type !== "customer.subscription.deleted" &&
            ["active", "trialing"].includes(sub.status);
          // A deletion of an older subscription cannot cancel a newer subscription.
          const cancelled = billing.cancelledSubscriptions ?? [];
          if (
            !cancelled.includes(sub.id) &&
            (enabled ||
              !billing.subscriptionId ||
              billing.subscriptionId === sub.id)
          ) {
            workspace.plan = enabled ? allowedPlan : "free";
            billing.subscriptionId = sub.id;
            billing.eventCreated = event.created;
            billing.subscriptionStatus =
              event.type === "customer.subscription.deleted"
                ? "canceled"
                : sub.status;
            // Cancellation is final for this subscription, including equal-second delayed updates.
            if (event.type === "customer.subscription.deleted")
              billing.cancelledSubscriptions = [...cancelled, sub.id].slice(
                -20,
              );
            saveWorkspace(tx, workspace);
            tx.set(`billing/${workspaceId}`, billing);
          }
        }
        tx.set(replayKey, { expiresAt: Date.now() + 35 * 86400000 });
      });
      res.json({ received: true });
    },
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  function checkOrigin(req: Request) {
    const supplied = req.header("origin");
    const allowed = new Set([origin]);
    if (!production)
      for (const hostname of ["localhost", "127.0.0.1"])
        for (const port of [5173, 8080])
          allowed.add(`http://${hostname}:${port}`);
    assert(
      supplied && allowed.has(supplied),
      "This request did not come from an approved application origin.",
      403,
      "ORIGIN_REJECTED",
    );
  }
  app.use("/api", (req, _res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) checkOrigin(req);
    next();
  });
  async function limit(
    req: Request,
    purpose: string,
    max: number,
    windowMs: number,
  ) {
    if (options.rateLimits === false) return;
    const key = `limits/${hash(`${purpose}:${req.ip ?? "unknown"}`)}`;
    const permitted = await store.transaction(async (tx) => {
      let counter = await tx.get<{ count: number; expiresAt: number }>(key);
      if (!counter || counter.expiresAt <= Date.now())
        counter = { count: 0, expiresAt: Date.now() + windowMs };
      if (counter.count >= max) return false;
      counter.count++;
      tx.set(key, counter);
      return true;
    });
    assert(
      permitted,
      "Too many requests. Please try again later.",
      429,
      "RATE_LIMITED",
    );
  }
  async function identity(
    tx: Transaction,
    req: Request,
    csrf = false,
  ): Promise<Identity> {
    const token = req.cookies?.[cookieName];
    assert(
      typeof token === "string" && token.length >= 32 && token.length <= 100,
      "Sign in to continue.",
      401,
      "UNAUTHENTICATED",
    );
    const key = sessionKey(token);
    const session = await tx.get<Session>(key);
    assert(
      session && session.expiresAt > Date.now(),
      "Your session has expired. Sign in again.",
      401,
      "UNAUTHENTICATED",
    );
    if (csrf)
      assert(
        same(req.header("x-csrf-token") ?? "", session.csrf),
        "Refresh the page and try again.",
        403,
        "CSRF_REJECTED",
      );
    const user = await tx.get<StoredUser>(userKey(session.userId));
    assert(
      user && user.sessionVersion === session.version,
      "Sign in to continue.",
      401,
      "UNAUTHENTICATED",
    );
    const workspace = await tx.get<Workspace>(workspaceKey(user.workspaceId));
    assert(
      workspace && workspace.ownerId === user.id,
      "Workspace not found.",
      404,
      "NOT_FOUND",
    );
    normalizeBaselineDates(workspace);
    return { user, workspace, session, sessionKey: key };
  }
  async function authenticated(req: Request) {
    return store.transaction((tx) =>
      identity(tx, req, !["GET", "HEAD"].includes(req.method)),
    );
  }
  function bootstrap({ user, workspace, session }: Identity): Bootstrap {
    if (workspace.usage.month !== month()) {
      workspace.usage = { analyses: 0, month: month() };
    }
    return {
      user: publicUser(user),
      workspace,
      capabilities: {
        ai: vertexEnabled() ? "vertex" : "rules",
        billing: billingEnabled() && !workspace.isDemo,
        persistence: store.kind,
      },
      csrfToken: session.csrf,
    };
  }
  async function newSession(tx: Transaction, user: StoredUser) {
    const token = secret();
    const key = sessionKey(token);
    const session: Session = {
      userId: user.id,
      csrf: secret(),
      expiresAt: Date.now() + (user.isDemo ? 86400000 : 7 * 86400000),
      version: user.sessionVersion,
    };
    while (user.sessionIds.length >= 20) tx.delete(user.sessionIds.shift()!);
    user.sessionIds.push(key);
    tx.set(userKey(user.id), user);
    tx.set(key, session);
    return { token, session, key };
  }
  function setCookie(res: Response, token: string, isDemo: boolean) {
    res.cookie(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      path: "/",
      maxAge: (isDemo ? 1 : 7) * 86400000,
    });
  }
  app.get("/api/health", async (_req, res) => {
    await store.transaction(async (tx) => {
      await tx.get("system/health");
    });
    res.json({ status: "ok" });
  });
  app.post("/api/auth/register", async (req, res) => {
    await limit(req, "register", 10, 3600000);
    const value = input.registerInput.parse(req.body);
    const recoveryCode = secret();
    const passwordHash = await bcrypt.hash(value.password, 12);
    const result = await store.transaction(async (tx) => {
      assert(
        !(await tx.get(emailKey(value.email))),
        "An account already exists with this email. Sign in or use your recovery code.",
        409,
        "ACCOUNT_EXISTS",
      );
      const userId = id();
      const workspace = createWorkspace(userId, value.workspaceName);
      const user: StoredUser = {
        id: userId,
        name: value.name,
        email: value.email,
        workspaceId: workspace.id,
        isDemo: false,
        passwordHash,
        recoveryHash: hash(recoveryCode),
        sessionIds: [],
        sessionVersion: 1,
        createdAt: iso(),
      };
      const { token, session, key } = await newSession(tx, user);
      saveWorkspace(tx, workspace);
      tx.set(emailKey(value.email), { userId });
      return { user, workspace, session, sessionKey: key, token };
    });
    setCookie(res, result.token, false);
    res.status(201).json({ ...bootstrap(result), recoveryCode });
  });
  app.post("/api/auth/login", async (req, res) => {
    await limit(req, "login", 20, 15 * 60000);
    const value = input.loginInput.parse(req.body);
    const user = await store.transaction(async (tx) => {
      const entry = await tx.get<{ userId: string }>(emailKey(value.email));
      return entry ? tx.get<StoredUser>(userKey(entry.userId)) : undefined;
    });
    // Fixed work for unknown accounts avoids a trivial account-enumeration timing oracle.
    const ok = await bcrypt.compare(
      value.password,
      user?.passwordHash ??
        "$2b$12$C6UzMDM.H6dfI/f/IKcEe.4nXtLLanKlZBiTRzReeCUNIJguCQxW6",
    );
    assert(
      user && ok && !user.isDemo,
      "Email or password is incorrect.",
      401,
      "INVALID_CREDENTIALS",
    );
    const result = await store.transaction(async (tx) => {
      const current = await tx.get<StoredUser>(userKey(user.id));
      assert(
        current && current.passwordHash === user.passwordHash,
        "Sign in again.",
        401,
        "INVALID_CREDENTIALS",
      );
      const workspace = await tx.get<Workspace>(
        workspaceKey(current.workspaceId),
      );
      assert(workspace, "Workspace not found.", 404);
      const { token, session, key } = await newSession(tx, current);
      return { user: current, workspace, session, sessionKey: key, token };
    });
    setCookie(res, result.token, false);
    res.json(bootstrap(result));
  });
  app.post("/api/auth/demo", async (req, res) => {
    await limit(req, "demo", 10, 3600000);
    const result = await store.transaction(async (tx) => {
      const dailyKey = `demoUsage/${iso().slice(0, 10)}`;
      const daily = (await tx.get<{ count: number }>(dailyKey)) ?? { count: 0 };
      assert(
        daily.count < Number(process.env.DEMO_DAILY_LIMIT ?? 300),
        "Today’s demo capacity is full. Create a free account to explore the product.",
        429,
        "DEMO_LIMIT",
      );
      tx.set(dailyKey, {
        count: daily.count + 1,
        expiresAt: Date.now() + 3 * 86400000,
      });
      const userId = id();
      const workspace = seedWorkspace(userId);
      const user: StoredUser = {
        id: userId,
        name: "Demo builder",
        email: `demo-${userId}@example.invalid`,
        workspaceId: workspace.id,
        isDemo: true,
        passwordHash: "",
        recoveryHash: "",
        sessionIds: [],
        sessionVersion: 1,
        createdAt: iso(),
      };
      const { token, session, key } = await newSession(tx, user);
      saveWorkspace(tx, workspace);
      return { user, workspace, session, sessionKey: key, token };
    });
    setCookie(res, result.token, true);
    res.status(201).json(bootstrap(result));
  });
  app.post("/api/auth/recover", async (req, res) => {
    await limit(req, "recover", 5, 3600000);
    const value = input.recoveryInput.parse(req.body);
    const recoveryCode = secret();
    const passwordHash = await bcrypt.hash(value.password, 12);
    const result = await store.transaction(async (tx) => {
      const entry = await tx.get<{ userId: string }>(emailKey(value.email));
      const user = entry
        ? await tx.get<StoredUser>(userKey(entry.userId))
        : undefined;
      assert(
        user &&
          !user.isDemo &&
          same(hash(value.recoveryCode), user.recoveryHash),
        "Email or recovery code is incorrect.",
        401,
        "INVALID_CREDENTIALS",
      );
      for (const key of user.sessionIds) tx.delete(key);
      user.sessionIds = [];
      user.sessionVersion++;
      user.passwordHash = passwordHash;
      user.recoveryHash = hash(recoveryCode);
      const workspace = await tx.get<Workspace>(workspaceKey(user.workspaceId));
      assert(workspace, "Workspace not found.", 404);
      const { token, session, key } = await newSession(tx, user);
      return { user, workspace, session, sessionKey: key, token };
    });
    setCookie(res, result.token, false);
    res.json({ ...bootstrap(result), recoveryCode });
  });
  app.get("/api/bootstrap", async (req, res) => {
    res.json(bootstrap(await authenticated(req)));
  });
  app.post("/api/auth/logout", async (req, res) => {
    await store.transaction(async (tx) => {
      const current = await identity(tx, req, true);
      tx.delete(current.sessionKey);
      current.user.sessionIds = current.user.sessionIds.filter(
        (k) => k !== current.sessionKey,
      );
      tx.set(userKey(current.user.id), current.user);
    });
    res.clearCookie(cookieName, {
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      path: "/",
    });
    res.json({ ok: true });
  });
  function projectFor(workspace: Workspace, projectId: string) {
    const project = workspace.projects.find((p) => p.id === projectId);
    assert(project, "Project not found.", 404, "NOT_FOUND");
    return project;
  }
  function requestFor(project: Project, requestId: string) {
    const request = project.requests.find((r) => r.id === requestId);
    assert(request, "Request not found.", 404, "NOT_FOUND");
    return request;
  }
  async function mutate<T>(
    req: Request,
    run: (current: Identity, tx: Transaction) => Promise<T> | T,
  ): Promise<T> {
    await limit(req, "mutation", 150, 60000);
    return store.transaction(async (tx) => {
      const current = await identity(tx, req, true);
      const result = await run(current, tx);
      saveWorkspace(tx, current.workspace);
      return result;
    });
  }
  app.post("/api/projects", async (req, res) => {
    const value = input.projectInput.parse(req.body);
    const project = await mutate(req, ({ workspace, user }) => {
      assert(
        workspace.projects.length < plans[workspace.plan].projects,
        "Your plan’s project limit has been reached.",
        409,
        "PLAN_LIMIT",
      );
      const deliverables = value.deliverables.map((d) => ({
        ...d,
        id: id(),
        status: "planned" as const,
        dependsOn: d.dependsOn ?? [],
      }));
      // Initial dependency references use earlier deliverable indices ("0", "1", ...).
      deliverables.forEach((d, index) => {
        d.dependsOn = d.dependsOn.map((reference) => {
          const i = Number(reference);
          assert(
            Number.isInteger(i) && i >= 0 && i < index,
            "Dependencies must reference earlier deliverable indices.",
          );
          return deliverables[i].id;
        });
        assert(
          new Set(d.dependsOn).size === d.dependsOn.length,
          "Duplicate dependencies are not allowed.",
        );
      });
      const project: Project = {
        ...value,
        id: id(),
        version: 1,
        deliverables,
        requests: [],
        baselines: [],
        audit: [],
        createdAt: iso(),
        archived: false,
      };
      snapshot(project, "Original agreed scope");
      audit(
        project,
        user.name,
        "project.created",
        `Original scope: ${deliverables.reduce((sum, d) => sum + d.hours, 0)} hours.`,
      );
      workspace.projects.push(project);
      return project;
    });
    res.status(201).json(project);
  });
  app.patch("/api/projects/:id", async (req, res) => {
    const value = z.object({ archived: z.boolean() }).strict().parse(req.body);
    res.json(
      await mutate(req, ({ workspace, user }) => {
        const project = projectFor(workspace, getParam(req, "id"));
        if (project.archived !== value.archived) {
          project.archived = value.archived;
          audit(
            project,
            user.name,
            value.archived ? "project.archived" : "project.restored",
            project.name,
          );
        }
        return project;
      }),
    );
  });
  app.delete("/api/projects/:id", async (req, res) => {
    const { confirmation } = z
      .object({ confirmation: z.string() })
      .strict()
      .parse(req.body);
    await mutate(req, ({ workspace }, tx) => {
      const project = projectFor(workspace, getParam(req, "id"));
      assert(
        confirmation === project.name,
        "Type the project name exactly to confirm deletion.",
      );
      for (const change of project.requests) {
        if (change.shareToken) tx.delete(shareKey(change.shareToken));
      }
      workspace.projects = workspace.projects.filter(
        (item) => item.id !== project.id,
      );
    });
    res.json({ ok: true });
  });
  app.patch("/api/projects/:id/deliverables/:did", async (req, res) => {
    const value = z
      .object({
        status: z.enum(["planned", "in_progress", "done"]).optional(),
        locked: z.boolean().optional(),
      })
      .strict()
      .refine(
        (v) => v.status !== undefined || v.locked !== undefined,
        "Provide a status or protection setting.",
      )
      .parse(req.body);
    res.json(
      await mutate(req, ({ workspace, user }) => {
        const project = projectFor(workspace, getParam(req, "id"));
        assert(
          !project.archived,
          "This project is archived.",
          409,
          "PROJECT_ARCHIVED",
        );
        const deliverable = project.deliverables.find(
          (d) => d.id === getParam(req, "did"),
        );
        assert(deliverable, "Deliverable not found.", 404, "NOT_FOUND");
        assert(
          deliverable.status !== "swapped",
          "Exchanged work is preserved in history and cannot be reactivated.",
          409,
          "INVALID_STATE",
        );
        const status = value.status ?? deliverable.status;
        const rank = { planned: 0, in_progress: 1, done: 2 };
        assert(
          rank[status] >= rank[deliverable.status],
          "Started or completed work cannot be reset to an earlier state.",
          409,
          "INVALID_STATE",
        );
        if (status !== deliverable.status && status !== "planned")
          assert(
            deliverable.dependsOn.every(
              (dependencyId) =>
                project.deliverables.find((d) => d.id === dependencyId)
                  ?.status === "done",
            ),
            "Complete this deliverable’s prerequisites before starting or completing it.",
            409,
            "DEPENDENCIES_INCOMPLETE",
          );
        const locked = value.locked ?? deliverable.locked;
        if (status !== deliverable.status || locked !== deliverable.locked) {
          deliverable.status = status;
          deliverable.locked = locked;
          project.version++;
          snapshot(project, `Work updated: ${deliverable.title}`);
          audit(
            project,
            user.name,
            "deliverable.updated",
            `${deliverable.title}; ${status}; ${locked ? "protected" : "unlocked"}.`,
          );
        }
        return project;
      }),
    );
  });
  app.post("/api/projects/:id/requests", async (req, res) => {
    const value = input.requestInput.parse(req.body);
    await limit(req, "analysis", 20, 3600000);
    const created = await mutate(req, async ({ workspace, user }, tx) => {
      const project = projectFor(workspace, getParam(req, "id"));
      assert(
        !project.archived,
        "Restore this project before adding requests.",
        409,
        "PROJECT_ARCHIVED",
      );
      assert(
        project.requests.length < 30,
        "This project has reached its 30-request limit.",
        409,
        "PROJECT_LIMIT",
      );
      if (workspace.usage.month !== month())
        workspace.usage = { month: month(), analyses: 0 };
      assert(
        workspace.usage.analyses < plans[workspace.plan].analyses,
        "Your monthly analysis allowance has been reached.",
        409,
        "PLAN_LIMIT",
      );
      workspace.usage.analyses++;
      const change: ChangeRequest = {
        id: id(),
        ...value,
        analysis: rulesAnalysis(
          project,
          value.title,
          value.message,
          value.hours,
        ),
        status: "draft",
        baselineVersion: project.version,
        swapIds: [],
        feeCents: Math.round(value.hours * project.rateCents),
        scheduleDays: Math.ceil(value.hours / project.capacityHoursPerDay),
        note: "",
        createdAt: iso(),
      };
      project.requests.push(change);
      audit(
        project,
        user.name,
        "request.created",
        `${value.title}; studio estimate ${value.hours} hours.`,
      );
      let allowAI = false;
      if (vertexEnabled()) {
        const counterKey = `aiUsage/${iso().slice(0, 10)}`;
        const counter = (await tx.get<{ count: number }>(counterKey)) ?? {
          count: 0,
        };
        const dailyLimit = Math.max(
          0,
          Math.min(2000, Number(process.env.AI_DAILY_LIMIT ?? 200)),
        );
        if (counter.count < dailyLimit) {
          counter.count++;
          tx.set(counterKey, {
            ...counter,
            expiresAt: Date.now() + 3 * 86400000,
          });
          allowAI = true;
        }
      }
      return {
        change,
        project: structuredClone(project),
        workspaceId: workspace.id,
        allowAI,
      };
    });
    if (created.allowAI) {
      const analysis = await analyze(
        created.project,
        value.title,
        value.message,
        value.hours,
      );
      try {
        const enriched = await store.transaction(async (tx) => {
          const workspace = await tx.get<Workspace>(
            workspaceKey(created.workspaceId),
          );
          const project = workspace?.projects.find(
            (p) => p.id === created.project.id,
          );
          const change = project?.requests.find(
            (r) => r.id === created.change.id,
          );
          if (
            workspace &&
            project &&
            change &&
            change.status === "draft" &&
            change.baselineVersion === created.change.baselineVersion &&
            project.version === created.project.version &&
            change.hours === created.change.hours
          ) {
            change.analysis = analysis;
            saveWorkspace(tx, workspace);
            return change;
          }
          return undefined;
        });
        if (enriched) created.change = enriched;
      } catch (error) {
        // The draft and its rules analysis already committed successfully.
        // Advisory enrichment must not turn that success into a retry/duplicate.
        console.warn(
          JSON.stringify({
            level: "warn",
            event: "ai.enrichment_not_saved",
            code: error instanceof AppError ? error.code : "PERSISTENCE_ERROR",
          }),
        );
      }
    }
    res.status(201).json(created.change);
  });
  app.patch("/api/projects/:id/requests/:rid", async (req, res) => {
    const value = input.requestPatch.parse(req.body);
    res.json(
      await mutate(req, ({ workspace, user }) => {
        const project = projectFor(workspace, getParam(req, "id"));
        assert(
          !project.archived,
          "This project is archived.",
          409,
          "PROJECT_ARCHIVED",
        );
        const change = requestFor(project, getParam(req, "rid"));
        assert(
          change.status === "draft" || change.status === "revoked",
          "Revoke the shared proposal before editing it.",
          409,
          "NOT_DRAFT",
        );
        const previousHours = change.hours;
        const before = JSON.stringify({
          hours: change.hours,
          swapIds: change.swapIds,
          note: change.note,
          scheduleDays: change.scheduleDays,
          status: change.status,
          baselineVersion: change.baselineVersion,
        });
        const needsRebase = change.baselineVersion !== project.version;
        Object.assign(change, value);
        change.status = "draft";
        change.feeCents = Math.round(change.hours * project.rateCents);
        change.baselineVersion = project.version;
        if (needsRebase)
          change.analysis = rulesAnalysis(
            project,
            change.title,
            change.message,
            change.hours,
          );
        if (
          value.hours !== undefined &&
          value.scheduleDays === undefined &&
          previousHours !== change.hours
        )
          change.scheduleDays = Math.ceil(
            change.hours / project.capacityHoursPerDay,
          );
        if (change.swapIds.length) validateSwap(project, change);
        const after = JSON.stringify({
          hours: change.hours,
          swapIds: change.swapIds,
          note: change.note,
          scheduleDays: change.scheduleDays,
          status: change.status,
          baselineVersion: change.baselineVersion,
        });
        if (before !== after) {
          audit(
            project,
            user.name,
            "request.updated",
            `${change.title}; estimate ${change.hours}h; ${change.swapIds.length} exchange items.`,
          );
        }
        return change;
      }),
    );
  });
  app.post("/api/projects/:id/requests/:rid/share", async (req, res) => {
    res.json(
      await mutate(req, ({ workspace, user }, tx) => {
        const project = projectFor(workspace, getParam(req, "id"));
        assert(
          !project.archived,
          "This project is archived.",
          409,
          "PROJECT_ARCHIVED",
        );
        const change = requestFor(project, getParam(req, "rid"));
        assert(
          ["draft", "revoked", "shared"].includes(change.status),
          "This proposal already has a decision.",
          409,
          "ALREADY_DECIDED",
        );
        assert(
          change.baselineVersion === project.version,
          "The baseline changed. Review and save this request before sharing it.",
          409,
          "STALE_BASELINE",
        );
        if (
          change.status === "shared" &&
          change.shareToken &&
          change.shareExpiresAt &&
          Date.parse(change.shareExpiresAt) > Date.now()
        )
          return change;
        assert(
          project.audit.length < 99,
          "This project needs room to record a client decision. Export its history and start a new project.",
          409,
          "PROJECT_LIMIT",
        );
        assert(
          project.baselines.length < 50 && project.deliverables.length < 80,
          "This project cannot record another scope change. Export it and start a new project before sharing new proposals.",
          409,
          "PROJECT_LIMIT",
        );
        assert(
          project.budgetCents + change.feeCents <= 1_000_000_000,
          "The additional-budget option exceeds the supported project budget. Reduce the request before sharing.",
          409,
          "BUDGET_LIMIT",
        );
        shiftDate(project.dueDate, change.scheduleDays);
        if (change.swapIds.length) validateSwap(project, change);
        if (change.shareToken) tx.delete(shareKey(change.shareToken));
        change.shareToken = secret();
        change.shareExpiresAt = new Date(
          workspace.isDemo
            ? Math.min(
                Date.now() + 86400000,
                Date.parse(workspace.createdAt) + 86400000,
              )
            : Date.now() + 7 * 86400000,
        ).toISOString();
        change.status = "shared";
        tx.set(shareKey(change.shareToken), {
          workspaceId: workspace.id,
          projectId: project.id,
          requestId: change.id,
          expiresAt: Date.parse(change.shareExpiresAt),
        } satisfies Share);
        audit(
          project,
          user.name,
          "request.shared",
          `${change.title}; client link expires ${change.shareExpiresAt}.`,
        );
        return change;
      }),
    );
  });
  app.post("/api/projects/:id/requests/:rid/revoke", async (req, res) => {
    res.json(
      await mutate(req, ({ workspace, user }, tx) => {
        const project = projectFor(workspace, getParam(req, "id"));
        const change = requestFor(project, getParam(req, "rid"));
        assert(
          change.status === "shared",
          "Only shared proposals can be revoked.",
          409,
          "INVALID_STATE",
        );
        if (change.shareToken) tx.delete(shareKey(change.shareToken));
        delete change.shareToken;
        delete change.shareExpiresAt;
        change.status = "revoked";
        audit(project, user.name, "request.revoked", change.title);
        return change;
      }),
    );
  });
  async function publicContext(tx: Transaction, token: string) {
    assert(
      /^[A-Za-z0-9_-]{43}$/.test(token),
      "This proposal is unavailable.",
      404,
      "NOT_FOUND",
    );
    const link = await tx.get<Share>(shareKey(token));
    assert(
      link && link.expiresAt > Date.now(),
      "This proposal is unavailable or has expired.",
      410,
      "OFFER_UNAVAILABLE",
    );
    const workspace = await tx.get<Workspace>(workspaceKey(link.workspaceId));
    assert(
      workspace,
      "This proposal is unavailable.",
      410,
      "OFFER_UNAVAILABLE",
    );
    normalizeBaselineDates(workspace);
    assert(
      !workspace.isDemo ||
        Date.parse(workspace.createdAt) + 86400000 > Date.now(),
      "This demo workspace has expired.",
      410,
      "OFFER_UNAVAILABLE",
    );
    const project = projectFor(workspace, link.projectId);
    const change = requestFor(project, link.requestId);
    assert(
      change.shareToken === token &&
        ["shared", "accepted", "deferred"].includes(change.status),
      "This proposal is unavailable.",
      410,
      "OFFER_UNAVAILABLE",
    );
    return { workspace, project, change };
  }
  app.get("/api/offers/:token", async (req, res) => {
    await limit(req, "offerRead", 150, 60000);
    const offer = await store.transaction(async (tx) => {
      const { workspace, project, change } = await publicContext(
        tx,
        getParam(req, "token"),
      );
      const { shareToken: _token, analysis: _analysis, ...request } = change;
      const baseline = project.baselines.find(
        (b) => b.version === change.baselineVersion,
      );
      assert(
        baseline,
        "The proposal baseline could not be found.",
        409,
        "BASELINE_UNAVAILABLE",
      );
      return {
        workspaceName: workspace.name,
        projectName: project.name,
        client: project.client,
        currency: project.currency,
        dueDate: baseline.dueDate,
        version: project.version,
        request,
        removed: baseline.deliverables.filter((d) =>
          change.swapIds.includes(d.id),
        ),
        rateCents: project.rateCents,
        capacityHoursPerDay: project.capacityHoursPerDay,
        currentHours: baseline.deliverables
          .filter((d) => d.status !== "swapped")
          .reduce((s, d) => s + d.hours, 0),
        budgetCents: baseline.budgetCents,
        isDemo: workspace.isDemo,
      } satisfies PublicOffer;
    });
    res.json(offer);
  });
  app.post("/api/offers/:token/decide", async (req, res) => {
    await limit(req, "offerDecision", 30, 60000);
    const value = input.choiceInput.parse(req.body);
    const result = await store.transaction(async (tx) => {
      const { workspace, project, change } = await publicContext(
        tx,
        getParam(req, "token"),
      );
      const result = decide(project, change, value.choice, value.clientName);
      saveWorkspace(tx, workspace);
      return result;
    });
    res.json(result);
  });
  app.patch("/api/workspace", async (req, res) => {
    const value = input.nameInput.parse(req.body);
    res.json(
      await mutate(req, ({ workspace }) => {
        workspace.name = value.name;
        return workspace;
      }),
    );
  });
  app.get("/api/export", async (req, res) => {
    const { workspace } = await authenticated(req);
    const exported = structuredClone(workspace);
    for (const project of exported.projects)
      for (const change of project.requests) {
        delete change.shareToken;
        delete change.shareExpiresAt;
      }
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="pactshift-workspace.json"',
    );
    res.json({ schemaVersion: 1, exportedAt: iso(), workspace: exported });
  });
  app.delete("/api/workspace", async (req, res) => {
    const value = z
      .object({ confirmation: z.string() })
      .strict()
      .parse(req.body);
    await store.transaction(async (tx) => {
      const { user, workspace } = await identity(tx, req, true);
      assert(
        value.confirmation === workspace.name,
        "Type the workspace name exactly to confirm deletion.",
      );
      const billing = await tx.get<Billing>(`billing/${workspace.id}`);
      assert(
        !hasOpenSubscription(billing),
        "Cancel your subscription in the billing portal before deleting the workspace.",
        409,
        "ACTIVE_SUBSCRIPTION",
      );
      assert(
        !billing?.checkout || billing.checkout.expiresAt <= Date.now(),
        "An unfinished billing checkout is still open. Wait for its 31-minute expiry before deleting the workspace.",
        409,
        "OPEN_CHECKOUT",
      );
      for (const project of workspace.projects)
        for (const change of project.requests)
          if (change.shareToken) tx.delete(shareKey(change.shareToken));
      for (const key of user.sessionIds) tx.delete(key);
      tx.delete(userKey(user.id));
      tx.delete(emailKey(user.email));
      tx.delete(workspaceKey(workspace.id));
      tx.delete(`billing/${workspace.id}`);
    });
    res.clearCookie(cookieName, {
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      path: "/",
    });
    res.json({ ok: true });
  });
  app.post("/api/billing/checkout", async (req, res) => {
    const { plan } = z
      .object({ plan: z.enum(["studio", "agency"]) })
      .strict()
      .parse(req.body);
    const current = await authenticated(req);
    assert(
      !current.user.isDemo,
      "Create your own workspace to subscribe.",
      400,
      "DEMO_ACCOUNT",
    );
    assert(
      billingEnabled() && stripe,
      "Billing is not configured on this deployment.",
      503,
      "NOT_CONFIGURED",
    );
    await limit(req, "checkout", 5, 3600000);
    const billing =
      (await store.transaction((tx) =>
        tx.get<Billing>(`billing/${current.workspace.id}`),
      )) ?? {};
    assert(
      !hasOpenSubscription(billing),
      "Use the billing portal to change your existing subscription.",
      409,
      "USE_PORTAL",
    );
    if (!billing.customerId) {
      const customer = await stripe.customers.create(
        {
          email: current.user.email,
          name: current.user.name,
          metadata: { workspaceId: current.workspace.id },
        },
        { idempotencyKey: `customer-${current.workspace.id}` },
      );
      billing.customerId = customer.id;
      await store.transaction(async (tx) => {
        const latest = await tx.get<Workspace>(
          workspaceKey(current.workspace.id),
        );
        assert(latest, "Workspace no longer exists.", 404);
        const latestBilling =
          (await tx.get<Billing>(`billing/${current.workspace.id}`)) ?? {};
        tx.set(`billing/${current.workspace.id}`, {
          ...latestBilling,
          customerId: customer.id,
        });
      });
    }
    const checkout = await store.transaction(async (tx) => {
      const { workspace } = await identity(tx, req, true);
      const latestBilling =
        (await tx.get<Billing>(`billing/${workspace.id}`)) ?? {};
      assert(
        !hasOpenSubscription(latestBilling),
        "Use the billing portal to change your existing subscription.",
        409,
        "USE_PORTAL",
      );
      if (
        latestBilling.checkout &&
        latestBilling.checkout.expiresAt > Date.now()
      ) {
        assert(
          latestBilling.checkout.plan === plan,
          "A checkout for another plan is already open. Complete it, or wait for its 31-minute expiry before selecting a different plan.",
          409,
          "OPEN_CHECKOUT",
        );
        return latestBilling.checkout;
      }
      latestBilling.checkout = {
        attemptId: id(),
        plan,
        expiresAt: (Math.floor(Date.now() / 1000) + 31 * 60) * 1000,
      };
      tx.set(`billing/${workspace.id}`, latestBilling);
      return latestBilling.checkout;
    });
    if (checkout.url) {
      res.json({ url: checkout.url });
      return;
    }
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: billing.customerId,
        line_items: [
          {
            price:
              plan === "studio"
                ? process.env.STRIPE_STUDIO_PRICE_ID!
                : process.env.STRIPE_AGENCY_PRICE_ID!,
            quantity: 1,
          },
        ],
        subscription_data: { metadata: { workspaceId: current.workspace.id } },
        client_reference_id: current.workspace.id,
        success_url: `${origin}/app/settings?checkout=success`,
        cancel_url: `${origin}/app/settings?checkout=cancelled`,
        allow_promotion_codes: true,
        expires_at: Math.floor(checkout.expiresAt / 1000),
      },
      {
        idempotencyKey: `checkout-${current.workspace.id}-${checkout.attemptId}`,
      },
    );
    assert(
      session.url,
      "The billing provider did not return a checkout URL. Please try again.",
      502,
      "CHECKOUT_UNAVAILABLE",
    );
    await store.transaction(async (tx) => {
      const latestBilling = await tx.get<Billing>(
        `billing/${current.workspace.id}`,
      );
      if (latestBilling?.checkout?.attemptId === checkout.attemptId) {
        latestBilling.checkout.sessionId = session.id;
        latestBilling.checkout.url = session.url!;
        tx.set(`billing/${current.workspace.id}`, latestBilling);
      }
    });
    res.json({ url: session.url });
  });
  app.post("/api/billing/portal", async (req, res) => {
    const current = await authenticated(req);
    assert(
      stripe && billingEnabled(),
      "Billing is not configured on this deployment.",
      503,
      "NOT_CONFIGURED",
    );
    const billing = await store.transaction((tx) =>
      tx.get<Billing>(`billing/${current.workspace.id}`),
    );
    assert(
      billing?.customerId,
      "No billing account exists for this workspace.",
      404,
      "NOT_FOUND",
    );
    const session = await stripe.billingPortal.sessions.create({
      customer: billing.customerId,
      return_url: `${origin}/app/settings`,
    });
    res.json({ url: session.url });
  });

  app.use("/api", (_req, _res) => {
    throw new AppError(404, "Endpoint not found.", "NOT_FOUND");
  });
  app.use((req, res, next) => {
    if (
      production &&
      (req.method === "GET" || req.method === "HEAD") &&
      req.hostname !== configuredOrigin.hostname
    ) {
      res.redirect(
        308,
        `${origin}${req.originalUrl.startsWith("/") ? req.originalUrl : "/"}`,
      );
      return;
    }
    next();
  });
  if (options.serveClient !== false) {
    const clientPath = path.resolve("dist");
    if (existsSync(clientPath)) {
      app.use(express.static(clientPath, { index: false, maxAge: "1h" }));
      app.get("/{*path}", (_req, res) => {
        res.setHeader("Cache-Control", "no-cache");
        res.sendFile(path.join(clientPath, "index.html"));
      });
    }
  }
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof AppError) {
        res
          .status(error.status)
          .json({ error: error.message, code: error.code });
        return;
      }
      if (error instanceof ZodError) {
        res.status(400).json({
          error: error.issues
            .map((i) => `${i.path.join(".") || "Request"}: ${i.message}`)
            .slice(0, 4)
            .join("; "),
          code: "VALIDATION_ERROR",
        });
        return;
      }
      const bodyError = error as { type?: string; status?: number };
      if (bodyError.type === "entity.too.large") {
        res.status(413).json({
          error: "Request exceeds the 100 KB limit.",
          code: "PAYLOAD_TOO_LARGE",
        });
        return;
      }
      if (error instanceof SyntaxError && bodyError.status === 400) {
        res
          .status(400)
          .json({ error: "Invalid JSON request.", code: "INVALID_JSON" });
        return;
      }
      console.error(
        JSON.stringify({
          level: "error",
          requestId: res.getHeader("X-Request-Id"),
          message: error instanceof Error ? error.message : "Unknown failure",
        }),
      );
      res.status(500).json({
        error: "Something went wrong. Please try again.",
        code: "INTERNAL_ERROR",
      });
    },
  );
  return app;
}

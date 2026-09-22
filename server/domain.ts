import { createHash, randomBytes, randomUUID } from "node:crypto";
import type {
  Analysis,
  AuditEvent,
  ChangeRequest,
  Deliverable,
  Project,
  Workspace,
} from "../shared/types.js";

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "INVALID_REQUEST",
  ) {
    super(message);
  }
}
export const id = () => randomUUID();
export const secret = () => randomBytes(32).toString("base64url");
export const hash = (input: string) =>
  createHash("sha256").update(input).digest("hex");
export const iso = () => new Date().toISOString();
export const month = () => iso().slice(0, 7);
export const plans = {
  free: { projects: 3, analyses: 30 },
  studio: { projects: 15, analyses: 300 },
  agency: { projects: 60, analyses: 1500 },
} as const;
export function assert(
  condition: unknown,
  message: string,
  status = 400,
  code = "INVALID_REQUEST",
): asserts condition {
  if (!condition) throw new AppError(status, message, code);
}

export function audit(
  project: Project,
  actor: string,
  action: string,
  detail: string,
) {
  const reservedDecisions = project.requests.filter(
    (request) => request.status === "shared",
  ).length;
  assert(
    project.audit.length + reservedDecisions < 100,
    "This project has reached its event limit; remaining capacity is reserved for shared client decisions. Export its history and start a new project.",
    409,
    "PROJECT_LIMIT",
  );
  const entry: Omit<AuditEvent, "hash"> = {
    id: id(),
    at: iso(),
    actor,
    action,
    detail,
    previousHash: project.audit.at(-1)?.hash ?? "genesis",
  };
  project.audit.push({ ...entry, hash: auditHash(entry) });
}
function auditHash(event: Omit<AuditEvent, "hash">) {
  // Explicit ordering survives Firestore's map serialization and JSON export/reimport.
  return hash(
    JSON.stringify({
      id: event.id,
      at: event.at,
      actor: event.actor,
      action: event.action,
      detail: event.detail,
      previousHash: event.previousHash,
    }),
  );
}
export function verifyAudit(events: AuditEvent[]) {
  let previous = "genesis";
  for (const { hash: actual, ...entry } of events) {
    if (entry.previousHash !== previous || auditHash(entry) !== actual)
      return false;
    previous = actual;
  }
  return true;
}
export function snapshot(project: Project, reason: string) {
  assert(
    project.baselines.length < 50,
    "This project has reached its baseline history limit.",
    409,
    "PROJECT_LIMIT",
  );
  project.baselines.push({
    version: project.version,
    at: iso(),
    reason,
    budgetCents: project.budgetCents,
    dueDate: project.dueDate,
    deliverables: structuredClone(project.deliverables),
  });
}
export function boundWorkspace(workspace: Workspace) {
  // Reserve one future baseline per project with a live proposal. A decision
  // stales other proposals on that project, while different projects can each
  // advance. This prevents unrelated writes from consuming promised capacity.
  const reservedBytes = workspace.projects.reduce((total, project) => {
    const pending = project.requests.filter(
      (request) =>
        request.status === "shared" &&
        request.baselineVersion === project.version &&
        Date.parse(request.shareExpiresAt ?? "") > Date.now(),
    );
    if (!pending.length) return total;
    const largestAddition = Math.max(
      ...pending.map((request) =>
        Buffer.byteLength(
          JSON.stringify({
            id: "0".repeat(36),
            title: request.title,
            description: request.message,
            hours: request.hours,
            status: "planned",
            locked: false,
            dependsOn: [],
          }),
        ),
      ),
    );
    // The new deliverable appears in both live scope and the new snapshot.
    // Remaining headroom covers the decision, audit entry and baseline metadata.
    return (
      total +
      Buffer.byteLength(JSON.stringify(project.deliverables)) +
      largestAddition * 2 +
      5000
    );
  }, 0);
  assert(
    Buffer.byteLength(JSON.stringify(workspace)) + reservedBytes <= 720_000,
    "Workspace storage limit reached, including room reserved for client decisions. Export and delete a completed project before continuing.",
    409,
    "STORAGE_LIMIT",
  );
}
export function swappable(project: Project, deliverable: Deliverable) {
  return (
    deliverable.status === "planned" &&
    !deliverable.locked &&
    !project.deliverables.some(
      (d) => d.status !== "swapped" && d.dependsOn.includes(deliverable.id),
    )
  );
}
export function validateSwap(project: Project, request: ChangeRequest) {
  assert(
    new Set(request.swapIds).size === request.swapIds.length,
    "Duplicate exchange items are not allowed.",
  );
  const selected = request.swapIds.map((item) =>
    project.deliverables.find((d) => d.id === item),
  );
  assert(
    selected.length > 0 && selected.every((d) => d && swappable(project, d)),
    "An exchange can only remove planned, unlocked work with no active dependents.",
    409,
    "INVALID_EXCHANGE",
  );
  const hours = selected.reduce((sum, d) => sum + d!.hours, 0);
  assert(
    hours >= request.hours,
    "Choose enough existing work to cover the new request.",
    409,
    "INSUFFICIENT_CAPACITY",
  );
  return selected as Deliverable[];
}
export function shiftDate(date: string, days: number) {
  if (!date || !days) return date;
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  assert(
    !Number.isNaN(result.getTime()) &&
      result.getUTCFullYear() >= 0 &&
      result.getUTCFullYear() <= 9999,
    "The resulting delivery date is outside the supported calendar range.",
  );
  return result.toISOString().slice(0, 10);
}
export function normalizeBaselineDates(workspace: Workspace) {
  // Compatibility for local workspaces created before due dates were snapshotted.
  // Add decisions are the only operation that changes a project's delivery date.
  for (const project of workspace.projects)
    for (const baseline of project.baselines)
      if (!baseline.dueDate) {
        const subsequentDays = project.requests
          .filter(
            (r) =>
              r.status === "accepted" &&
              r.choice === "add" &&
              (r.acceptedVersion ?? 0) > baseline.version,
          )
          .reduce((sum, r) => sum + r.scheduleDays, 0);
        baseline.dueDate = shiftDate(project.dueDate, -subsequentDays);
      }
}
export function decide(
  project: Project,
  request: ChangeRequest,
  choice: "add" | "swap" | "defer",
  clientName: string,
) {
  if (request.status === "accepted" || request.status === "deferred") {
    assert(
      request.choice === choice,
      "This proposal already has a different recorded decision.",
      409,
      "ALREADY_DECIDED",
    );
    return {
      ok: true as const,
      choice,
      version: request.acceptedVersion ?? project.version,
    };
  }
  assert(
    !project.archived,
    "This project is archived.",
    409,
    "PROJECT_ARCHIVED",
  );
  assert(
    request.status === "shared",
    "This proposal is no longer available.",
    410,
    "OFFER_UNAVAILABLE",
  );
  assert(
    !!request.shareExpiresAt && Date.parse(request.shareExpiresAt) > Date.now(),
    "This proposal has expired. Ask the studio for a new proposal.",
    410,
    "OFFER_EXPIRED",
  );
  assert(
    request.baselineVersion === project.version,
    "The project scope has changed. Ask the studio for a refreshed proposal.",
    409,
    "STALE_BASELINE",
  );
  if (choice === "swap") validateSwap(project, request);
  if (choice !== "defer") {
    assert(
      project.deliverables.length < 80,
      "This project has reached its deliverable limit.",
      409,
      "PROJECT_LIMIT",
    );
    if (choice === "add") {
      project.budgetCents += request.feeCents;
      assert(
        Number.isSafeInteger(project.budgetCents) &&
          project.budgetCents <= 1_000_000_000,
        "The resulting budget exceeds the supported limit.",
      );
      project.dueDate = shiftDate(project.dueDate, request.scheduleDays);
    } else
      for (const d of project.deliverables)
        if (request.swapIds.includes(d.id)) d.status = "swapped";
    project.deliverables.push({
      id: id(),
      title: request.title,
      description: request.message,
      hours: request.hours,
      status: "planned",
      locked: false,
      dependsOn: [],
    });
    project.version++;
    snapshot(
      project,
      `${choice === "add" ? "Added" : "Exchanged"}: ${request.title}`,
    );
  }
  request.status = choice === "defer" ? "deferred" : "accepted";
  request.choice = choice;
  request.clientName = clientName;
  request.decidedAt = iso();
  request.acceptedVersion = project.version;
  audit(
    project,
    clientName,
    `request.${choice}`,
    `${request.title}; ${request.hours}h; ${choice === "add" ? request.feeCents : 0} ${project.currency} cents; baseline v${project.version}`,
  );
  return { ok: true as const, choice, version: project.version };
}

const words = (value: string) =>
  new Set(value.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
export function rulesAnalysis(
  project: Project,
  title: string,
  message: string,
  hours: number,
): Analysis {
  const input = words(`${title} ${message}`);
  const matches = project.deliverables
    .filter((d) => d.status !== "swapped")
    .map((d) => ({
      d,
      score: [...words(`${d.title} ${d.description}`)].filter((w) =>
        input.has(w),
      ).length,
    }))
    .sort((a, b) => b.score - a.score);
  const best = matches[0];
  const boundarySentences = project.description
    .split(/(?<=[.!?])\s+|\n/)
    .map((text) => ({
      text,
      score: [...words(text)].filter((w) => input.has(w)).length,
    }))
    .sort((a, b) => b.score - a.score);
  const boundary = boundarySentences[0];
  const hasBoundary = boundary && boundary.score >= 2;
  const explicit =
    /(additional|add |new |extra|spanish|translate|translation|also|instead)/i.test(
      `${title} ${message}`,
    );
  const boundaryExcludes =
    hasBoundary &&
    /\b(excludes?|excluded|not included|out of scope)\b/i.test(boundary.text);
  const boundaryIncludes =
    hasBoundary &&
    /\b(includes?|included|covers?|covering)\b/i.test(boundary.text) &&
    !boundaryExcludes;
  const classification = boundaryExcludes
    ? "addition"
    : boundaryIncludes
      ? "included"
      : explicit
        ? "addition"
        : best && best.score >= 3
          ? "included"
          : "unclear";
  const evidence = matches
    .filter((m) => m.score > 0)
    .slice(0, 2)
    .map(({ d }) => ({
      deliverableId: d.id,
      quote: (d.description || d.title).slice(0, 240),
      explanation:
        "Related baseline wording; similarity is a review aid, not a contractual determination.",
    }));
  if (hasBoundary)
    evidence.unshift({
      deliverableId: project.id,
      quote: boundary.text.slice(0, 240),
      explanation:
        "Relevant project scope boundary. Confirm the inclusion or exclusion against the full agreement.",
    });
  return {
    classification,
    summary:
      classification === "addition"
        ? "This request appears to introduce new work. Confirm the estimate and exchange options before sharing."
        : classification === "included"
          ? "This request overlaps with existing scope. Check the cited scope before proposing additional work."
          : "The baseline does not provide enough evidence to classify this request confidently. Clarify the details before sharing.",
    evidence,
    assumptions: [
      "The studio must verify whether the request is already included.",
      "Hours are the studio estimate. Prices are calculated from the agreed project rate.",
    ],
    suggestedHours: hours,
    engine: "rules",
  };
}

export function createWorkspace(
  ownerId: string,
  name: string,
  isDemo = false,
): Workspace {
  return {
    id: id(),
    ownerId,
    name,
    plan: "free",
    isDemo,
    projects: [],
    usage: { analyses: 0, month: month() },
    createdAt: iso(),
  };
}
export function seedWorkspace(ownerId: string): Workspace {
  const workspace = createWorkspace(ownerId, "Northstar Studio", true);
  const d = (
    title: string,
    description: string,
    hours: number,
    status: Deliverable["status"] = "planned",
    locked = false,
  ): Deliverable => ({
    id: id(),
    title,
    description,
    hours,
    status,
    locked,
    dependsOn: [],
  });
  const discovery = d(
    "Discovery & direction",
    "Stakeholder workshop, creative direction and sitemap for the English language website.",
    12,
    "done",
    true,
  );
  const design = d(
    "Website design system",
    "Responsive components, typography and visual design for six English website pages.",
    24,
    "in_progress",
    true,
  );
  const core = d(
    "Core website build",
    "Six English pages: Home, About, Services, Work, Contact and legal information.",
    32,
    "in_progress",
    true,
  );
  const resources = d(
    "Resource library",
    "A filterable resource library with eight articles, CMS setup and category browsing.",
    16,
  );
  const launch = d(
    "Quality assurance & launch",
    "Accessibility checks, browser testing and production deployment of the English website.",
    12,
    "planned",
    true,
  );
  launch.dependsOn = [core.id];
  const project: Project = {
    id: id(),
    name: "Forma website",
    client: "Forma Architecture",
    description:
      "A considered digital home for an independent architecture practice. Fixed fee, clear scope, shared decisions.",
    currency: "USD",
    budgetCents: 1200000,
    rateCents: 12500,
    costRateCents: 6000,
    capacityHoursPerDay: 6,
    dueDate: shiftDate(iso().slice(0, 10), 28),
    version: 1,
    deliverables: [discovery, design, core, resources, launch],
    requests: [],
    baselines: [],
    audit: [],
    createdAt: iso(),
    archived: false,
  };
  snapshot(project, "Original agreed scope");
  audit(
    project,
    "Northstar Studio",
    "project.created",
    "Fictional demonstration project. Original scope: 96 hours.",
  );
  const title = "Spanish-language pages";
  const message =
    "Can we also add Spanish versions of the six core website pages before launch? We will supply approved translations. The resource library can wait if that helps us keep the budget.";
  const analysis = rulesAnalysis(project, title, message, 12);
  analysis.summary =
    "Spanish-language pages add a new language to an English-only baseline. The unstarted resource library is a possible 16-hour exchange for this 12-hour request.";
  analysis.evidence = [
    {
      deliverableId: core.id,
      quote: core.description,
      explanation: "The agreed core build explicitly covers English pages.",
    },
    {
      deliverableId: resources.id,
      quote: resources.description,
      explanation:
        "The resource library is planned, unlocked work with no active dependents.",
    },
  ];
  project.requests.push({
    id: id(),
    title,
    message,
    hours: 12,
    analysis,
    status: "draft",
    baselineVersion: 1,
    swapIds: [resources.id],
    feeCents: 150000,
    scheduleDays: 2,
    note: "You supply approved Spanish copy. Exchange the resource library to keep the fee and launch date unchanged; the remaining 4 hours stay available within this project.",
    createdAt: iso(),
  });
  audit(
    project,
    "Northstar Studio",
    "request.created",
    "Spanish-language pages estimated at 12 hours.",
  );
  workspace.projects.push(project);
  return workspace;
}

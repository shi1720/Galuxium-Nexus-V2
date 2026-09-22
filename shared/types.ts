export type Deliverable = {
  id: string;
  title: string;
  description: string;
  hours: number;
  status: "planned" | "in_progress" | "done" | "swapped";
  locked: boolean;
  dependsOn: string[];
};
export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
  previousHash: string;
  hash: string;
};
export type Baseline = {
  version: number;
  at: string;
  reason: string;
  budgetCents: number;
  dueDate: string;
  deliverables: Deliverable[];
};
export type Analysis = {
  classification: "addition" | "included" | "unclear";
  summary: string;
  evidence: { deliverableId: string; quote: string; explanation: string }[];
  assumptions: string[];
  suggestedHours: number;
  engine: "rules" | "vertex";
  model?: string;
};
export type ChangeRequest = {
  id: string;
  title: string;
  message: string;
  hours: number;
  analysis: Analysis;
  status: "draft" | "shared" | "accepted" | "deferred" | "revoked";
  baselineVersion: number;
  swapIds: string[];
  feeCents: number;
  scheduleDays: number;
  note: string;
  shareToken?: string;
  shareExpiresAt?: string;
  choice?: "add" | "swap" | "defer";
  clientName?: string;
  decidedAt?: string;
  createdAt: string;
  acceptedVersion?: number;
};
export type Project = {
  id: string;
  name: string;
  client: string;
  description: string;
  currency: "USD" | "INR" | "GBP" | "EUR";
  budgetCents: number;
  rateCents: number;
  costRateCents: number;
  capacityHoursPerDay: number;
  dueDate: string;
  version: number;
  deliverables: Deliverable[];
  requests: ChangeRequest[];
  baselines: Baseline[];
  audit: AuditEvent[];
  createdAt: string;
  archived: boolean;
};
export type Workspace = {
  id: string;
  name: string;
  ownerId: string;
  plan: "free" | "studio" | "agency";
  isDemo: boolean;
  projects: Project[];
  usage: { analyses: number; month: string };
  createdAt: string;
};
export type User = {
  id: string;
  name: string;
  email: string;
  workspaceId: string;
  isDemo: boolean;
};
export type Bootstrap = {
  user: User;
  workspace: Workspace;
  capabilities: {
    ai: "vertex" | "rules";
    billing: boolean;
    persistence: "firestore" | "local";
  };
  csrfToken: string;
};
export type PublicOffer = {
  workspaceName: string;
  projectName: string;
  client: string;
  currency: Project["currency"];
  dueDate: string;
  version: number;
  request: Omit<ChangeRequest, "shareToken" | "analysis">;
  removed: Deliverable[];
  rateCents: number;
  capacityHoursPerDay: number;
  currentHours: number;
  budgetCents: number;
  isDemo: boolean;
};

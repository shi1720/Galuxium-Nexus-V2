# API implementation notes

The Express 5 API owns all prices, workflow transitions, authorization and persistence. `app.ts` is injectable for HTTP tests; `index.ts` starts the production or development adapter on port 8080.

## Persistence

`Store.transaction()` is the only write boundary. Local development serializes transactions and commits an atomic JSON file rename; it is intentionally restricted to one process. Production requires Firestore, where every read and deferred write participates in a native transaction. A workspace is a bounded aggregate, so conflicting decisions retry against the latest baseline. A transaction that throws commits nothing.

Firestore collection `pactshift` stores base64url-encoded logical document keys. Every document contains `value` and, for expiring records, a top-level Firestore Timestamp `expiresAt`. Disable indexes on `value`; no queries require them. Enable TTL on `expiresAt`. TTL deletion is asynchronous; authorization independently checks session and share expiry. Demo workspaces, demo users and demo sessions expire after 24 hours. Real sessions expire after seven days; real client links expire after seven days.

Logical documents: `users/{id}`, `workspaces/{id}`, `emails/{SHA256(email)}`, `sessions/{SHA256(token)}`, `shares/{SHA256(token)}`, `limits/{SHA256(purpose+IP)}`, `billing/{workspaceId}`, `stripeEvents/{eventId}`, and daily AI/demo counters. Credentials never appear in the bootstrap or export response. Workspace exports also remove capability tokens.

## Important behavior

- Real registration returns a one-time recovery code. Passwords use bcrypt, cost 12. Recovery codes are 256-bit random values stored as SHA256 hashes; successful recovery rotates the code and invalidates all old sessions. Email verification, email delivery and MFA are not implemented.
- Mutations check the exact configured Origin. Private mutations additionally require the session’s CSRF token. Session cookies are HttpOnly, SameSite=Lax, and Secure with a `__Host-` prefix in production.
- New project dependencies reference earlier input deliverable indices as strings, e.g. `dependsOn: ["0"]`. These become generated deliverable IDs. Cycles and forward references cannot be introduced.
- `PATCH /api/projects/:id/deliverables/:did` accepts `{status?,locked?}`. Status moves forward through planned, in progress and done. Prerequisites must be complete before dependent work starts. Exchanged items cannot reactivate. Actual changes create a baseline version and invalidate old proposals.
- Proposal prices are integer cents calculated by the server. Exchanges require sufficient whole deliverables, all planned, unlocked and without non-swapped dependents. Add increases budget and shifts the due date by the configured calendar days. Exchange preserves budget/date. Defer preserves the baseline.
- A current, unexpired capability link and explicit acknowledgment authorize a client decision. This proves possession of the link, not independently verified identity or legal signature. Replays cannot duplicate work. A different recorded choice is rejected.
- Audit events form a SHA256 hash chain; this is integrity checking inside the application, not externally anchored nonrepudiation. History snapshots and audit events are committed with the decision. Pending client decisions reserve audit capacity.
- Advisory Vertex output cannot approve work or set a price. Evidence IDs must belong to the supplied deliverables or to the project scope boundary record; quotes must match that source text exactly. Invalid JSON, invented citations, unavailable credentials, upstream errors and a 12-second deadline fall back to explicitly labeled rules. Rebased drafts regenerate rule evidence.
- Stripe billing is capability-gated by complete configuration. Signed subscription events require the matching saved customer, are deduplicated, and ignore older events. A canceled subscription cannot be resurrected by a delayed update. Free plans are never silently represented as paid plans. Workspace deletion with an active paid plan requires subscription cancellation first.

## Deployment configuration

Required production values: `NODE_ENV=production`, `APP_ORIGIN=https://<public-host>`, `DATA_BACKEND=firestore`, `GOOGLE_CLOUD_PROJECT=<project>`.

For a named Firestore database, set `FIRESTORE_DATABASE_ID=pactshift`. Omit this value to use `(default)`. The service identity needs access to the selected database; creating a separate named database keeps application documents isolated from other products in an existing cloud project.

Optional AI: `AI_PROVIDER=vertex`, `VERTEX_LOCATION=global`, `VERTEX_MODEL=gemini-2.5-flash-lite`, `AI_DAILY_LIMIT=200`. The service identity needs Vertex AI access. Without complete AI configuration, local analysis works without external credentials.

Optional billing: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_STUDIO_PRICE_ID`, `STRIPE_AGENCY_PRICE_ID`. Configure the signed webhook at `/api/billing/webhook` for subscription created, updated and deleted events. Prices are provisioned separately in Stripe. Trial subscriptions are treated as entitled while Stripe reports trialing.

Local values: `DATA_FILE=.data/pactshift.json`, `PORT=8080`. Demo creation defaults to `DEMO_DAILY_LIMIT=300` globally plus 10/IP/hour; API mutations and analysis have additional repository-backed limits. The global AI counter caps attempts, including unsuccessful upstream calls.

## Bounds and verification

Each workspace document is limited to 720 KB, each HTTP JSON body to 100 KB, projects to 30 requests / 80 deliverables / 50 baseline snapshots / 100 audit events. Initial projects allow at most 40 deliverables and 5,000 hours. Plans allow 3/15/60 projects and 30/300/1,500 analyses monthly. Reaching a limit returns an explicit error instead of truncating history. Large accounts require future migration to separate project/event collections.

Run `npx vitest run --root . tests/backend.test.ts tests/backend-domain.test.ts tests/backend-analysis.test.ts`. Tests cover auth lifecycle, isolation, CSRF/Origin, capability revocation and expiration, state transitions, conflicting approvals, replay, immutable receipt/baseline dates, quotas, storage rollback, grounded AI requests/deadlines/fallback, audit/citation tampering and Stripe webhook security. The HTTP suite uses an isolated local adapter. The review record is in [SECURITY_REVIEW.md](SECURITY_REVIEW.md).

A real Firestore 9.2 integration smoke passed on 22 September 2026 against the isolated named database `pactshift`: nested seeded workspace roundtrip, audit verification after map serialization, four concurrent transaction increments, and deliberate-abort rollback. All temporary smoke documents were removed. This verifies the adapter and the CLI identity used for that smoke; Cloud Run service-account IAM still requires its own deployed health/workflow check.

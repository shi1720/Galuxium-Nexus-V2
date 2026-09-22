# Pactshift operations runbook

**22 September 2026 · Maintainer: Shivam Gupta**

This runbook distinguishes configuration from verified behavior. A provider capability flag means configuration is present; a successful provider operation requires separate evidence. The service is an early production release with bounded resources and no promised SLA.

## Deployed environment

| Setting | Current deployment record |
| --- | --- |
| Canonical public URL | [pactshift.web.app](https://pactshift.web.app); 21 hosted checks passed. |
| Firebase Hosting | Site `pactshift`; serves `dist`; `/api/**` rewrites to Cloud Run; other application routes load the SPA. |
| Cloud Run service / region | `pactshift` / `us-central1` |
| Google Cloud project | `gen-lang-client-0444960702`, an existing shared project. |
| Database | Isolated named Firestore database `pactshift`; application collection `pactshift`. |
| Runtime identity | Dedicated service account; inspect the service to obtain the configured email. |
| Database permission | `roles/datastore.user` with a database-scoped IAM condition. |
| AI permission | Runtime identity granted the required Vertex role. |
| Runtime bounds | Minimum 0, maximum 2 instances; 512 MiB memory; concurrency 40; request timeout 60 seconds. |
| AI | Vertex, global endpoint, `gemini-2.5-flash-lite`; default 200 attempted analyses/day across the deployment. |
| Billing | Not configured. Paid checkout intentionally disabled. |
| Recovery | Firestore point-in-time recovery enabled with a seven-day retention window, subject to the database's earliest recoverable timestamp. |

Firebase Hosting is deployed. Configuration in [firebase.json](../firebase.json) binds its API rewrite to the existing service with `pinTag: true`. Record the Hosting release and associated Cloud Run revision together. [RELEASE_EVIDENCE.json](RELEASE_EVIDENCE.json) records a passing smoke against `https://pactshift.web.app` on 22 September 2026.

A named Firestore database does not receive the default database's free quota. Cloud Run free allowances are shared across a billing account, including unrelated projects. Do not describe this deployment as guaranteed free. See [BUSINESS.md](BUSINESS.md) for cost assumptions and [Google's pricing](https://cloud.google.com/firestore/pricing).

## Configuration reference

The server reads process environment variables. `.env.example` is a reference, not an automatic loader.

| Variable | Purpose / default |
| --- | --- |
| `PORT` | API listener; 8080 locally and in the container. |
| `NODE_ENV` | `production` enables secure production cookies and startup requirements. |
| `APP_ORIGIN` | Exact trusted browser origin; current production target `https://pactshift.web.app`, local default `http://localhost:5173`. Production requires HTTPS. |
| `DATA_BACKEND` | `firestore` required in production; otherwise local adapter. |
| `DATA_FILE` | Local JSON file; `.data/pactshift.json`. |
| `GOOGLE_CLOUD_PROJECT` | Project used by the Firestore/Vertex client. |
| `FIRESTORE_DATABASE_ID` | Named database; default `(default)` if omitted. Current deployment uses `pactshift`. |
| `AI_PROVIDER` | `vertex` to attempt provider analysis; unset uses rules. |
| `VERTEX_LOCATION` | `global` by default. |
| `VERTEX_MODEL` | `gemini-2.5-flash-lite` by default. |
| `AI_DAILY_LIMIT` | Default 200; application clamps supported attempts to 0–2,000/day. |
| `DEMO_DAILY_LIMIT` | Default 300 demo workspaces/day across the deployment. |
| `STRIPE_SECRET_KEY` | Optional provider secret; use secret storage, never source control. |
| `STRIPE_WEBHOOK_SECRET` | Optional signed-event verification secret. |
| `STRIPE_STUDIO_PRICE_ID` | Optional monthly Studio price reference. |
| `STRIPE_AGENCY_PRICE_ID` | Optional monthly Agency price reference. |

Cloud runtime authentication uses the attached service identity. Do not create and commit a service-account JSON key to make deployment convenient. Local Firestore/Vertex development can use an explicitly selected application-default identity with access only to the intended development project/database.

## Hosting, cookies, and caching

The frontend calls relative `/api` routes. Firebase forwards them to Cloud Run under the same public origin. The production session cookie is **`__session`** because Hosting strips other cookie names before invoking the backend. It remains host-only, Secure, HttpOnly, SameSite=Lax, and scoped to `/`. Keep exact-origin and CSRF validation enabled; do not work around a cookie-forwarding failure by weakening authorization. [Firebase cookie handling](https://firebase.google.com/docs/hosting/manage-cache#using_cookies)

All API responses use `Cache-Control: no-store`. The HTML entry point is revalidated, while fingerprinted `/assets/**` files use long-lived immutable caching. Firebase's static response headers include CSP, frame denial, nosniff, referrer protection, and permissions restrictions. Verify these on both direct and deep application routes after deployment. Existing sessions on the old Cloud Run hostname do not transfer to the new host; users sign in again at the canonical address.

Non-API page requests to a different backend hostname redirect to `APP_ORIGIN`. The underlying service remains publicly reachable for Hosting invocation; application authorization still protects private API data. Do not advertise the backend hostname as a second supported login origin.

## Inspect before changing anything

These read-only commands scope every action to the recorded project and region, avoiding accidental changes to other applications sharing the account:

```bash
gcloud run services describe pactshift \
  --project=gen-lang-client-0444960702 \
  --region=us-central1

gcloud firestore databases describe \
  --project=gen-lang-client-0444960702 \
  --database=pactshift

gcloud run revisions list \
  --service=pactshift \
  --project=gen-lang-client-0444960702 \
  --region=us-central1
```

Inspect identity, environment-variable names, image revision, traffic routing, database ID, PITR state, and resource limits. Never paste secrets or private capability URLs into a public issue or release artifact.

## Deploy a reviewed revision

1. Run `npm ci`, `npm test`, `npm run typecheck`, and `npm run build` from the repository root. Review dependency audit output and the actual changes.
2. Build the repository's Dockerfile using the intended build identity and artifact registry. Use an immutable image digest for the release record. The runtime image runs as a non-root user.
3. Confirm the runtime service account has database-scoped Firestore access and, if enabled, Vertex access. The browser has no direct database role.
4. Deploy the reviewed image, preserving the database, service account, and optional secret references. Set `APP_ORIGIN=https://pactshift.web.app` for this deployment. Use explicit project/region flags and retain the small resource limits unless measurements justify a change.
5. Publish the same reviewed build's `dist` assets through Firebase Hosting, using the checked-in rewrite and header configuration. Record both deployment identities.
6. Verify the canonical Firebase URL, including session persistence through the rewrite. Record the revision name, image digest, Hosting release, timestamp, and test results.

Example shape for an already provisioned service; replace the image and identity placeholders with the reviewed values:

```bash
gcloud run deploy pactshift \
  --project=gen-lang-client-0444960702 \
  --region=us-central1 \
  --image=REVIEWED_IMAGE_DIGEST \
  --service-account=REVIEWED_RUNTIME_SERVICE_ACCOUNT \
  --memory=512Mi \
  --concurrency=40 \
  --timeout=60 \
  --min=0 \
  --max=2
```

This example intentionally does not replace environment variables, secrets, or IAM policy. New independent deployments must provision their own database and identity, set the required production values, and make the service publicly invocable if they need public browser access. Public invocation does not bypass application authentication. [Cloud Run deployment reference](https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy)

After the reviewed Cloud Run deployment and production origin are ready, an authenticated Firebase CLI can publish the static build:

```bash
firebase deploy --only hosting --project=gen-lang-client-0444960702
```

Run this from the repository root, where `firebase.json` explicitly selects site `pactshift`. Do not initialize or overwrite unrelated Hosting sites in the shared project. With `pinTag: true`, a Hosting release pins its backend revision, and a Hosting rollback can restore that paired backend revision. Review both sides of the release before rolling back. [Firebase Cloud Run integration](https://firebase.google.com/docs/hosting/cloud-run)

Per-database IAM conditions are supported for server-library access. Verify them with the actual runtime identity; do not infer isolation from what an administrator can see in the Cloud console. [Firestore database access](https://cloud.google.com/firestore/docs/manage-databases)

## Release verification

Latest evidence supplied for this documentation on 22 September 2026:

| Check | Recorded result / remaining scope |
| --- | --- |
| Focused automated suite | 46 passing tests, passing production build, dependency audit reporting zero vulnerabilities. |
| Native Firestore smoke | Passed: nested workspace roundtrip, audit verification after map serialization, four concurrent increments, deliberate-abort rollback. Temporary smoke documents removed. |
| Deployed health | Passed: `GET /api/health` performed a store read and returned healthy. |
| Deployed demo | Passed: demo creation returned HTTP 201 with Firestore and configured Vertex capability. |
| Actual Vertex inference | Passed: canonical hosted smoke returned `analysis.engine="vertex"`, model `gemini-2.5-flash-lite`, and two validated citations. Fresh mobile browser analysis also returned Vertex evidence. |
| Desktop browser journey | Hosted application at 1920px: share, client swap, receipt, and owner update verified; $12,000 budget/date unchanged; 96h becomes 92h. No desktop errors observed. |
| Mobile browser journey | At 390px: create project, execute Vertex analysis with a source quote, share, defer, receive receipt, and revisit as a fresh draft. Original deferral preserved. No horizontal overflow in visited views. |
| Existing-owner mobile login | Passed: invalid password shows an error; correct login opens the empty private workspace; refresh retains the session; no horizontal overflow at 390px. |
| Mobile navigation accessibility | Closed navigation was verified absent from the accessibility tree after the deployed menu fix. This is a targeted check, not a comprehensive accessibility audit. |
| Stripe | Unconfigured; no checkout completion or live charge claimed. |
| Restore drill | PITR configured; a full recovery exercise has not been claimed. |
| Firebase canonical origin | Passed: static assets, health, session forwarding, isolation, origins, decisions, exports, and account lifecycle across 21 checks. |

All **21 canonical-origin release checks passed**, including real Vertex inference, workspace isolation, swap/replay, audit export verification, new project creation, recovery/session invalidation, and account cleanup. The smoke record has base `https://pactshift.web.app`, timestamp `2026-09-22T05:05:37.854Z`, and result `pass`. Its 21 recorded durations had a median of 543 ms and maximum of 1,965 ms; this single run is not a load benchmark or SLA. Hosted desktop and mobile checks above are separately reported browser evidence. The current local suite has 46 tests. Keep the final commit, image digest, and Hosting/backend identities in [DEPLOYMENT.json](DEPLOYMENT.json) synchronized when publishing the release.

The release command for the new origin is `node scripts/live-smoke.mjs https://pactshift.web.app`. It creates temporary fixtures and deletes them, attempts one configured AI analysis, and rewrites the evidence JSON. It performs real cloud operations, so run it deliberately rather than as a frequent uptime probe. The audit CLI also accepts either a workspace export or the audit export: `node scripts/verify-audit.mjs path/to/export.json`.

For each new release, use a disposable demo or explicitly designated test account:

- Load the home page in a logged-out browser and create a new demo.
- Register a separate test owner, save the recovery code, and create a project from the form. This catches field-mapping problems that API-only tests miss.
- Capture a request, review its engine label/evidence, choose a valid swap, share, and accept in a second browser context.
- Confirm the owner sees the new version and that the previous baseline retains its original budget and date.
- Refresh/reopen and verify the saved state. Test a conflicting or stale offer and same-choice replay without duplicating scope.
- Verify the `__session` cookie survives the Hosting rewrite, API responses remain uncached, and a foreign origin cannot mutate state.
- Defer a request and revisit it as a fresh draft. Confirm the earlier receipt remains unchanged.
- Inspect a historical version and export it; verify the exported version, budget, date, and scope match what was displayed. Test calendar dates in a timezone west of UTC.
- Verify client output excludes internal costs and unrelated data. Download/print the receipt and inspect it.
- Exercise account recovery and a test workspace deletion; do not delete real customer work as a smoke test.
- Confirm mobile-width layout, keyboard navigation, empty/error states, and meaningful labels.

Do not repeatedly create demos to check uptime: the global demo limit exists to control storage and abuse. Use the minimal health endpoint for routine readiness, remembering that it still performs a Firestore read.

## Data retention and limits

Enable TTL on top-level `expiresAt` for the `pactshift` collection group, and disable indexing on the large `value` field because the application uses direct-key reads rather than queries. TTL cleanup is asynchronous; session, demo, and offer authorization checks enforce expiry independently.

Real sessions and offer links expire after seven days. Demo users/workspaces expire after 24 hours; demo links cannot outlive that window. Rate counters and replay markers also have finite expiry. Provider logs have separate retention and can contain IP addresses and request paths, including sensitive offer URLs.

Workspace deletion removes active application records and invalidates links. Provider logs and PITR versions may remain until their retention windows expire. Do not promise immediate erasure from every recovery mechanism. PITR's seven-day window is a provider capability, not proof that the app has a tested one-click restore. [Firestore PITR](https://docs.cloud.google.com/firestore/native/docs/use-pitr)

The application caps a workspace at 720,000 serialized bytes. It stores at most 3/15/60 projects by plan, including archived projects, and at most 30 requests, 80 deliverables, 50 snapshots, and 100 audit events per project. If a limit is reached, export the record and arrange a deliberate migration or new workspace; there is no supported JSON import or selective project deletion UI. Never remove history by hand to make a demo appear healthy.

## Monitoring and cost control

Cloud Run logs include request-level provider data; unexpected application errors emit a request ID and a sanitized response to the browser. Avoid logging bodies, cookies, authorization headers, or offer tokens. Access to provider logs should be restricted because paths can disclose capability links.

Monitor request error rate, latency, instance/memory usage, Firestore transaction failures, and actual cloud spend. Inspect how often analysis falls back to rules before advertising AI availability. Budgets and alerts should be scoped so this application is distinguishable from unrelated services in the shared project. A two-instance cap controls capacity but does not guarantee a fixed bill.

Minimum zero can introduce a cold start. Two instances and a single region are a cost-conscious initial configuration, not a high-availability architecture. Concurrency 40 is a configuration value, not a measured safe throughput claim. Increase resources only after measuring the workload and workspace transaction contention.

## Incident response

**App unavailable:** inspect the Hosting release/rewrite, pinned Cloud Run revision, service health, database permissions, quotas, and logs. If a new release is responsible, restore a known-good compatible frontend/backend pair. A code rollback does not undo database changes. A page that loads but cannot keep a login suggests checking cookie forwarding, trusted origin, and cache headers before changing authentication rules.

**AI unavailable or expensive:** disable `AI_PROVIDER` or reduce the daily attempt cap. The rules workflow and existing offer acceptance remain available. Record the capability change and validate the interface's engine label.

**Wrong or exposed client link:** revoke that offer from the owner's request view, review the current baseline, then issue a new link. An already accepted choice needs an explicit new commercial correction; do not silently rewrite its receipt.

**Suspected account compromise:** use verified account recovery to rotate the password/recovery code and invalidate sessions. Inspect relevant events and revoke exposed proposals. Do not accept an unverified public message as authority to change someone else's account.

**Data corruption:** stop writes to affected data, identify the last trustworthy timestamp, and use a separate recovery target for PITR/export investigation. Compare owner, baseline, request, and audit consistency before reconnecting the service. Keep a recovery record. The exact restore action should follow the provider's current procedure and the specific incident; do not overwrite the live database blindly.

## Optional payment activation

Paid plans remain locked until all four Stripe variables are set. Configure recurring prices matching the published plans, supply secrets through the deployment's secret mechanism, and register `/api/billing/webhook` for subscription created/updated/deleted events. The webhook uses raw-body signature verification, matching saved customer references, replay markers, and event-ordering protection.

Before enabling real purchase buttons, verify test-mode checkout, entitlement change after the webhook, portal access, cancellation, delayed event handling, and account deletion behavior. The application does not collect an agency's client-project fees. Do not infer payment from `?checkout=success`; only verified provider state grants a paid plan.

Merchant eligibility and provider charges are account-dependent. This repository supplies the integration; it does not claim that a merchant account is activated or that any real payment has occurred.

# Pactshift implementation contract

Initial build coordination record. The final [architecture reference](ARCHITECTURE.md) and [release evidence](RELEASE_EVIDENCE.json) supersede this plan.
React/Vite SPA + Express/TypeScript API. Cloud Run service, Firestore durable production adapter, atomic local JSON adapter for zero-credential local execution. All monetary values integer cents. Types in shared/types.ts. Root owns client, deployment and documents; backend agent owns server and backend/domain tests.

## API envelope and routes
Errors `{error:string,code?:string}`. Mutations JSON + `X-CSRF-Token` from bootstrap; session cookies HttpOnly SameSite=Lax Secure production. Anonymous auth routes validate Origin. Public offer decision validates Origin.
- POST /api/auth/register `{name,email,password,workspaceName}` => bootstrap + `recoveryCode` (once)
- POST /api/auth/login `{email,password}` => bootstrap
- POST /api/auth/demo {} => isolated seeded workspace, bootstrap
- POST /api/auth/recover `{email,recoveryCode,password}` => bootstrap + new recoveryCode
- POST /api/auth/logout {} => ok
- GET /api/bootstrap => Bootstrap
- POST /api/projects `{name,client,description,currency,budgetCents,rateCents,costRateCents,capacityHoursPerDay,dueDate,deliverables:[{title,description,hours,locked,dependsOn?}]}` => Project
- PATCH /api/projects/:id `{archived?}` => Project
- POST /api/projects/:id/requests `{title,message,hours}` => ChangeRequest (analysis server computed, rules or Vertex)
- PATCH /api/projects/:id/requests/:rid `{hours,swapIds,note,scheduleDays}` => ChangeRequest (draft only); feeCents always server computed hours*rateCents
- POST /api/projects/:id/requests/:rid/share {} => ChangeRequest (random capability token, seven day expiry)
- POST /api/projects/:id/requests/:rid/revoke {} => ChangeRequest
- GET /api/offers/:token => PublicOffer (no internal costs, audit, or unrelated requests)
- POST /api/offers/:token/decide `{choice:'add'|'swap'|'defer',clientName,acknowledged:true}` => `{ok:true,choice,version}`
- GET /api/export => workspace JSON attachment (exclude user credentials and share tokens)
- DELETE /api/workspace `{confirmation:workspaceName}` => clears account/workspace/sessions
- PATCH /api/workspace `{name}` => workspace
- POST /api/billing/checkout `{plan:'studio'|'agency'}` => `{url}` or 503 configuration required
- POST /api/billing/portal {} => `{url}` or 503
- POST /api/billing/webhook raw body signed Stripe events, replay safe
- GET /api/health => minimal readiness

Core invariants: owner tenant isolation on every private route; server-side price calculation; only unstarted, unlocked deliverables with no active dependents can swap, no partial swap; selected capacity >= new request hours; acceptance must match current baseline version; mutations atomic so conflicting approvals one wins; accepted token replay cannot duplicate work; 'add' inserts deliverable + budget increase; 'swap' marks selected swapped, inserts new deliverable, keeps budget; 'defer' leaves baseline unchanged. Preserve baseline history, append SHA256 audit hash chain transactionally. Semantic AI never approves/sets prices, only suggests based on validated citations. Never call synthetic samples real revenue. Demo seeded fictional. Free plan 3 projects/30 analyses monthly; studio 15/300; agency 60/1500. Cap workspace document sizes with validation, 100 events and 30 requests/project initial bound, fail explicit limit; avoid claiming infinite scale.

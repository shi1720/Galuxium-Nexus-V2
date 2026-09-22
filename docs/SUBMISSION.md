# Pactshift — Galuxium Nexus V2 submission pack

Prepared **22 September 2026** for **Shivam Gupta**, founder and product owner. This document contains application copy and a release evidence register. It is not a record of a submitted application. The swap workflow was verified in local Safari and separately through the deployed Cloud Run API; live AI inference was also verified. A final hosted browser check and a published demo video remain outstanding.

**Participation gate:** Public rules and organizer updates were reviewed on 22 September. Actual Devpost registration/roster timing, mandatory Discord membership, and Backboard credit redemption remain unverified. Complete the [event checklist](EVENT_CHECKLIST.md) before treating this portfolio as eligible or submitted.

## Application fields

### Project name

Pactshift

### Tagline

Turn “one more thing” into a choice everyone agrees to.

### Short description

Pactshift helps small agencies turn extra client requests into an agreed change in budget or deliverables. Clients can approve an add-on, exchange planned work, or defer. Every accepted change updates the saved project baseline, keeping the agreement and delivery plan together.

### Inspiration

A client changes their mind. The agency wants to help. But the price, deliverables, and launch date do not automatically change with the conversation. What begins as a reasonable request can leave both sides working from different expectations.

We chose to focus on that specific moment. A constructive answer is often a choice: add the work with a price, exchange something already planned, or save it for later. Pactshift makes the consequences visible and carries the decision into the project itself.

The idea is grounded in a recognized service-business practice: Upwork's own guidance recommends swapping deliverables, adding a paid milestone, or moving work to a later phase. Our product contribution is the software that makes that choice update a reliable shared record. [Source](https://www.upwork.com/mc/documents/caf2f4f2e8dab00fc04b3408465eedb3)

### What it does

An agency owner creates a workspace and a project with a budget, rate, delivery date, and structured deliverables. A client request is compared with that baseline. The owner reviews the explanation, confirms the effort, and selects eligible work that could be exchanged.

The client opens a limited offer link and sees three choices: add the work for an explicit fee, exchange named planned deliverables while keeping the budget, or defer. An accepted addition or swap creates a new baseline version. Deferral leaves the baseline intact. The system keeps a decision history and allows the owner to export their workspace data.

The demonstration uses a fictional agency, Northstar Studio, and its Forma website project. A request for 12 hours of Spanish-language pages can become a $1,500 addition or replace a planned 16-hour resource library. In the swap, the $12,000 budget and delivery date stay unchanged, while planned work falls from 96 to 92 hours. These are sample project calculations, not customer savings or Pactshift revenue.

### How it is built

Pactshift uses React and Vite for the interface, Express and TypeScript for the API, and shared TypeScript domain types. The initial application is deployed on Cloud Run with an isolated named Firestore database. A local JSON adapter supports running the application without cloud credentials.

Prices use integer minor currency units and are calculated on the server. The agreement engine checks the current baseline version, swap eligibility, available estimated capacity, and request state inside an atomic mutation. An addition inserts work and increases the budget; a swap retires selected planned work and inserts the new deliverable; deferral leaves the agreement unchanged. A repeat acceptance cannot add the same work twice.

Optional Vertex AI Gemini analysis produces a suggestion with validated citations to saved deliverables and project scope boundaries. A labeled rules engine supports operation when Vertex is unavailable. Neither engine accepts a proposal or sets the commercial price. The owner supplies the estimate; deterministic application rules control the decision. Baselines preserve historical delivery dates as well as budgets and deliverables.

The API uses authenticated owner workspaces, server-side tenant checks, HttpOnly session cookies, CSRF tokens, and origin validation. Public offer links expire and can be revoked; their response excludes internal cost rates and unrelated project data. A SHA-256-linked audit history makes accidental or partial changes inspectable, but is not an independent notarization or an immutable external ledger.

### Challenges addressed

The difficult engineering problem is keeping an agreement coherent under change. Two proposals can refer to the same baseline. A client might revisit an old link or submit twice. A deliverable might be locked or have dependent work. Those situations need application rules, not model judgment.

The commercial challenge is equally important: competitors already generate scope analyses and change orders. Pactshift therefore focuses on an explicit deliverable exchange and the state after acceptance. It does not claim to have invented scope management.

The product also separates outcomes that are easy to blur in a demo. A proposed fee is not approved revenue; approved work is not cash collected; a capacity-preserving swap is not a sale. This distinction carries into the business model and sample story.

### Accomplishments

The central product achievement is a connected workflow from project scope to client choice to updated baseline. The same scenario demonstrates user experience, commercial value, and meaningful domain constraints.

The project includes a reproducible codebase, a transparent market assessment, an explicit cost model, a customer validation plan, and a narrated demonstration script. Actual deployment and test results belong in the evidence register below; this copy does not substitute for those checks.

### What we learned

Market research made the product sharper. Generic AI scope detection, citations, and approval PDFs already have direct competitors. A useful differentiator must live in the workflow and its consequences.

We also learned to keep probabilistic assistance separate from financial and agreement state. An explanation can be helpful even when it requires human review. A budget update must be deterministic and auditable.

### What is next

The next milestone is measured use by agency owners and their clients: one real project, one real change, and a second use without founder prompting. We will test whether clients understand the options, whether owners repeat the workflow, and whether enough value exists to support the proposed subscription.

Expansion will follow that evidence. Candidate work includes structured scope templates, additional allowance tracking, and integrations with existing project tools. Team invitations, advanced roles, email ingestion, independent signer verification, and collection of agency client payments are not current claims.

### Built with

TypeScript · React · Vite · Express · Google Cloud Run · Google Cloud Firestore · Vertex AI Gemini 2.5 Flash-Lite (optional) · Stripe Checkout and Billing (optional) · Zod · Vitest

### Category / tags

SaaS · Productivity · Workflow automation · Agency operations · Human-reviewed AI · Change control

### Target customers and market friction

Owners and delivery leads at small web and design agencies selling fixed-fee projects. They need a clear decision before additional work changes the project's economics or schedule. Pactshift supplies the shared decision and saved baseline rather than requiring a migration to a full project management suite.

### Monetization

Proposed monthly subscriptions are Free with 3 stored projects and 30 analyses, Studio at $29 with 15 stored projects and 300 analyses, and Agency at $79 with 60 stored projects and 1,500 analyses. Archived projects still count. All are owner workspaces; the Agency name does not imply team roles. Client reviewers do not need accounts. There is no percentage fee on approved agency work. Each workspace is capped at 720,000 serialized bytes; each project supports 30 requests, 80 deliverables, 50 baselines, and 100 audit events. Included client approvals are subject to those bounds.

Stripe-hosted subscription checkout and a billing portal are optional configured capabilities. Without provider configuration, the application reports that billing is unavailable. Pactshift does not collect the fees an agency charges its clients. Full assumptions and sensitivity calculations appear in [BUSINESS.md](BUSINESS.md).

### Traction

Pre-validation. **Zero verified customers and $0 verified revenue.** The demonstration contains fictional project data. Desk research supports the problem hypothesis; it does not establish willingness to pay. The planned interview and pilot experiments are documented in [VALIDATION_PLAYBOOK.md](VALIDATION_PLAYBOOK.md).

### Team and contribution statement

**Shivam Gupta — founder, project owner, and submission lead.** Shivam set the commercial and quality goals and directed the project. Pactshift was developed with substantial AI assistance for research, implementation, testing support, and documentation. Contribution claims should reflect the actual work recorded in the repository; no invented manual implementation history or collaboration is needed.

### Links

| Field | Value / evidence required |
| --- | --- |
| Code repository | [shi1720/Galuxium-Nexus-V2](https://github.com/shi1720/Galuxium-Nexus-V2) — user-supplied repository; final public access and release commit must be checked. |
| Live application | [Pactshift on Cloud Run](https://pactshift-wh46bdeima-uc.a.run.app) — initial health and isolated demo creation verified 22 September 2026. |
| Demo video | Pending recording, narration, upload, and public/unlisted access check. No finished video is claimed. |
| Executive brief | Use the final reviewed PDF artifact supplied with the release. |
| Local replication and architecture | [README](../README.md), [architecture/schema](ARCHITECTURE.md), and [operations](OPERATIONS.md). |
| Commercial detail | [Business model](BUSINESS.md) and [market/source pack](MARKET.md). |

## Rubric mapping

This maps the supplied event rubric to reviewable evidence. It is not a self-awarded score.

| Criterion | Weight | Demonstration / artifact | Limits to disclose |
| --- | ---: | --- | --- |
| Technical architecture and scalability | 20% | Typed API/domain model; atomic acceptance; Firestore adapter; local replication; stale and repeated acceptance tests. | Initial workspace document model and explicit object limits; no claim of unlimited scale or load certification. |
| Enterprise governance and compliance | 20% | Owner isolation; session and CSRF controls; limited expiring offers; deterministic price checks; human-reviewed analysis; export/delete; linked audit history. | No SOC 2 certification, independent security audit, SSO, advanced roles, or verified electronic-signature claim. |
| Product innovation and market fit | 20% | Client pay/swap/defer flow followed by a changed baseline; direct competitor research; focused customer hypothesis. | Market fit and willingness to pay remain unvalidated. |
| Monetization and fiscal design | 15% | Published proposed plans; usage bounds; optional Stripe subscription lifecycle; primary-source cost assumptions and stress case. | No verified revenue; payment activation is configuration-dependent. |
| UI/UX and visual refinement | 15% | Isolated demo; explicit swap eligibility; before/after consequences; no client signup; clear errors and loading states. | Record actual accessibility and browser checks before describing their results. |
| Keynote and demo completeness | 10% | Four-minute narration, storyboard, verified live URL, and real persisted decision workflow. | Mandatory finished video and verified participation/submission steps remain release gates. |

## Final submission evidence register

Update each item with an actual date, URL, command result, or artifact. “Designed,” “implemented,” “tested,” and “live” are different claims.

| Gate | Evidence to record | Current record |
| --- | --- | --- |
| Official eligibility | Official rules reviewed; account/participant requirements resolved. | Public rules/updates reviewed 22 September 2026. Registration/roster timing, mandatory Discord membership, and required Backboard credit redemption are unverified; see [EVENT_CHECKLIST.md](EVENT_CHECKLIST.md). |
| Public repository | Logged-out URL access and release commit. | Public GitHub repository verified; application commit `80eece9`, CI passed. Final documentation is tracked separately. |
| Public live demo | HTTPS URL, readiness result, logged-out demo run. | Live health and demo HTTP 201 verified 22 September 2026; Cloud Run workflow tested through its real API. Safari evidence is local. Final hosted browser/mobile checks remain unverified because browser automation was unavailable. |
| Working core flow | Fresh session shares/accepts swap; owner sees new baseline. | Local Safari publish → client swap → $12,000 / October 20 / version two receipt → updated owner project verified. Actual application screenshots captured. Hosted workflow verified separately through the real Cloud Run API. |
| Build and automated checks | Commands, pass/fail totals, release commit. | 30 focused tests passed: 26 backend and 4 frontend. Clean-install GitHub CI passed; source commit `80eece9`, final revision `pactshift-00003-k8c`. |
| Persistence | Native adapter behavior and deployed runtime access. | Native Firestore roundtrip, canonical audit check, concurrent increments, and rollback smoke passed. Deployed health/demo passed with Firestore capability. Final-revision hosted smoke passed; all disposable fixtures deleted. |
| Billing | Configuration state; test checkout/webhook/portal evidence if enabled. | Optional; no real payment claimed. |
| Live AI | Actual new request result, not only capability configuration. | Returned Vertex engine, `gemini-2.5-flash-lite`, and one validated citation. |
| Video | 2–5 minute playable link with clear narration and UI. | Script prepared; finished video pending. |
| Documentation | README, schema, architecture, sources, business brief reviewed against code. | Prepared and reviewed: five-page PDF and seven-slide PPTX visually checked, real screenshot included, source/link checks completed. |
| Attribution | Accurate founder and AI-assistance disclosure. | Copy supplied above. |

The [official schedule](https://galuxium-nexus-v2-29411.devpost.com/details/dates), checked 22 September, lists the deadline as **31 October 2026 at 5:00 PM IST / 11:30 AM UTC**. Recheck at submission time. The [event checklist](EVENT_CHECKLIST.md) documents a discrepancy between Devpost's $14,944 advertised infrastructure/software value and the organizer website's $2,600 credit/seed-pool description. Do not assume a cash payout or use a prize in the business plan.

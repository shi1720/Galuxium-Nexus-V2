# Pactshift: Galuxium Nexus V2 submission pack

Prepared **22 September 2026** for **Shivam Gupta**, founder and product owner, and the existing Devpost project **1192668**. The seven story fields below are ready to paste into the application. The canonical app at https://pactshift.web.app is verified, and the product video is published. Devpost confirmed the final submission on 22 September; see [submission evidence](SUBMISSION_EVIDENCE.json).

**Participation gate:** Public rules and organizer updates were reviewed on 22 September. Existing Devpost edit access and $10 in free Backboard participant credits are verified. Original roster timing remains unknown. Discord requires the user's login/join action, and final Devpost submission is confirmed. See the [event checklist](EVENT_CHECKLIST.md).

## Application fields

### Project name

Pactshift

### Tagline

Turn “one more thing” into a choice everyone agrees to.

### Short description

Pactshift gives agencies a better answer to “Can we add one more thing?” Clients choose extra budget, an exchange of planned work, or a later phase. The decision updates the project agreement, so everyone knows what is included, what it costs, and what happens next.

### Inspiration

“Can we also have the website in Spanish?”

A reasonable request can put a small agency in a difficult position. Say yes and absorb the work. Ask for more money and risk an awkward conversation. Meanwhile, the original delivery plan stays unchanged.

We saw a better question: what matters most to the client now, and what can change to make room? Perhaps the Spanish pages matter more than the resource library planned for launch. Pactshift makes that trade visible, gives both sides a clear choice, and carries the decision into the project.

This is an established negotiation practice, reflected in [Upwork's guidance on scope changes](https://www.upwork.com/mc/documents/caf2f4f2e8dab00fc04b3408465eedb3). Our contribution is turning the conversation into a reliable workflow for small web and design agencies.

### What it does

An agency records the agreed budget, delivery date, and deliverables. When a new request arrives, Pactshift compares it with that scope. The owner reviews the evidence, confirms the effort, and offers practical choices through a private client link.

Our fictional demonstration starts with a $12,000 website and 96 estimated hours. The client wants 12 hours of Spanish-language pages and will supply approved translations. They can:

- Add the pages for $1,500 and two additional calendar days.
- Exchange the unstarted 16-hour resource library for the pages, keeping the budget and delivery date.
- Save the request for later and keep the existing agreement.

The client needs no account. When they choose the exchange, Pactshift creates version two of the agreement. The library moves out, the pages move in, and total estimated scope falls from 96 to 92 hours. The client receives a decision receipt; the agency sees the updated scope and its history. Four hours remain available within the plan. That is a capacity calculation, not a revenue claim.

### How we built it

Pactshift was built by Shivam Gupta, founder and project owner, with substantial AI assistance for development, research, testing support, and documentation. The demo narration is AI-generated.

We built Pactshift with React, TypeScript, Vite, and Express. Firebase Hosting serves the interface, Google Cloud Run runs the API, and Firestore persists the agreements. A local storage adapter makes the project reproducible without cloud credentials.

The agreement engine is the core. It calculates fees on the server, checks which work is eligible for exchange, and commits the decision and new baseline together in a transaction. Old proposals cannot silently overwrite a newer agreement, and repeated acceptance cannot add the same work twice.

Vertex AI Gemini helps explain a request using citations checked against the saved scope. A labeled rules engine provides a fallback. The owner confirms the estimate and terms; AI cannot approve a change or set the commercial price.

Owner authentication, workspace isolation, CSRF protection, expiring revocable client links, and a linked audit history support the workflow. The client view excludes internal costs. Records can be exported, and previous agreement versions preserve their original budget and date.

### Challenges we ran into

The hardest problem was keeping an agreement coherent when people act at different times. Two proposals may reference the same scope. A client may reopen an old link or press confirm twice. Work offered in an exchange may already have started. We addressed these cases with version checks, eligibility rules, and atomic decisions.

We also corrected historical views so a later schedule change cannot rewrite an earlier agreement's date. This detail matters when the record is what both sides rely on.

Commercially, the challenge was finding a useful position among existing scope-management tools. We focused on the exchange itself and the resulting delivery plan: a concrete reason to use the product beyond reading an AI answer.

### Accomplishments that we're proud of

Pactshift completes the loop from client request to reviewed choices, recorded decision, and changed project scope. The swap is real application state, not a screen prepared for a pitch.

We have verified the hosted desktop swap from client choice to updated agreement, and a mobile journey through project creation, live Vertex analysis, sharing, deferral, and revisiting the request. The project passes 46 automated tests and 21 hosted release checks. The public repository includes architecture, setup instructions, security boundaries, and the commercial model.

We are also proud of the restraint in the product: clients see the decision they need to make, while the application handles the agreement rules behind it.

### What we learned

The useful moment is when both parties understand the trade and the project follows their choice. Identifying extra scope is only the beginning.

We learned to separate helpful AI suggestions from decisions involving price and commitments. We also learned to distinguish proposed fees, approved work, collected revenue, and preserved capacity. Clear language is part of a trustworthy product.

### What's next for Pactshift

Our next milestone is real repeat use: agency owners bringing a live project, resolving a client change, and returning for a second request. We will measure whether clients understand the choices and whether owners find enough value to continue paying.

The proposed model is a free entry tier, $29/month for Studio, and $79/month for Agency, with defined project and analysis allowances. Clients need no paid seats, and Pactshift takes no percentage of approved agency work. Paid checkout awaits merchant activation. We have no verified customers or revenue yet.

After validation, we plan to improve scope setup and connect with the project tools agencies already use. The aim is a small, dependable product that helps good client relationships survive changing priorities.

### Built with

TypeScript · React · Vite · Express · Firebase Hosting · Google Cloud Run · Google Cloud Firestore · Vertex AI Gemini 2.5 Flash-Lite (optional) · Stripe Checkout and Billing (optional) · Zod · Vitest

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

**Shivam Gupta: founder, project owner, and submission lead.** Shivam set the commercial and quality goals and directed the project. Pactshift was developed with substantial AI assistance for research, implementation, testing support, and documentation. Contribution claims should reflect the actual work recorded in the repository; no invented manual implementation history or collaboration is needed.

### Links

| Field | Value / evidence required |
| --- | --- |
| Code repository | [shi1720/Galuxium-Nexus-V2](https://github.com/shi1720/Galuxium-Nexus-V2): public repository; release evidence is recorded below. |
| Live application | [Pactshift](https://pactshift.web.app): 21 hosted checks and desktop/mobile workflows verified on 22 September 2026. |
| Demo video | [Public 3:21 demonstration](https://youtu.be/BF9QX1_Pppg): published with disclosed AI narration and 63 captions. Public watch-page playback and unauthenticated oEmbed access are verified. |
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
| UI/UX and visual refinement | 15% | Hosted desktop swap and mobile creation/analysis/share/defer/revisit verified; no horizontal overflow in visited mobile views; closed-menu accessibility fix verified. | Targeted browser checks, not comprehensive accessibility certification. |
| Keynote and demo completeness | 10% | Public 3:21 captioned film with authentic hosted views, disclosed AI narration, and the persisted decision workflow. | Public playback and Devpost submission confirmed; Discord login/join remains a separate participation requirement. |

## Final submission evidence register

Update each item with an actual date, URL, command result, or artifact. “Designed,” “implemented,” “tested,” and “live” are different claims.

| Gate | Evidence to record | Current record |
| --- | --- | --- |
| Official eligibility | Official rules reviewed; account/participant requirements resolved. | Existing project/edit access and $10 free Backboard credits verified. Discord login/join remains required; original roster timing unknown. See [EVENT_CHECKLIST.md](EVENT_CHECKLIST.md). |
| Public repository | Logged-out URL access and release commit. | Public GitHub repository verified with main as its default and only branch. CI passed for deployed source commit `4364f86`; final deployment and evidence commits are recorded in [DEPLOYMENT.json](DEPLOYMENT.json). |
| Public live demo | HTTPS URL, readiness result, logged-out demo run. | All 21 hosted checks passed at `https://pactshift.web.app`; static assets, sessions, health, origins, and persistence verified. |
| Working core flow | Fresh session shares/accepts swap; owner sees new baseline. | Hosted 1920px desktop swap preserved $12,000/date and changed 96h to 92h. At 390px, project creation, Vertex analysis, sharing, deferral, receipt, and revisit as a fresh draft passed. Original receipt preserved. |
| Build and automated checks | Commands, pass/fail totals, release commit. | 46 automated tests passed; build passed; dependency audit reported zero vulnerabilities. Final immutable deployment metadata is tracked in [DEPLOYMENT.json](DEPLOYMENT.json). |
| Persistence | Native adapter behavior and deployed runtime access. | Native Firestore roundtrip, canonical audit check, concurrent increments, and rollback smoke passed. Deployed health/demo passed with Firestore capability. Final-revision hosted smoke passed; all disposable fixtures deleted. |
| Billing | Configuration state; test checkout/webhook/portal evidence if enabled. | Optional; no real payment claimed. |
| Live AI | Actual new request result, not only capability configuration. | Canonical smoke returned Vertex engine, `gemini-2.5-flash-lite`, and three validated citations; fresh mobile browser analysis also verified. |
| Video | 2–5 minute playable link with clear narration and UI. | [Public 3:21 video](https://youtu.be/BF9QX1_Pppg) published with 63 captions and AI disclosure. Public watch-page playback and unauthenticated oEmbed verified; see [VIDEO_METADATA.md](VIDEO_METADATA.md). |
| Documentation | README, schema, architecture, sources, business brief reviewed against code. | Prepared and reviewed: five-page PDF and seven-slide PPTX visually checked, real screenshot included, source/link checks completed. |
| Attribution | Accurate founder and AI-assistance disclosure. | Copy supplied above. |

The [official schedule](https://galuxium-nexus-v2-29411.devpost.com/details/dates), checked 22 September, lists the deadline as **31 October 2026 at 5:00 PM IST / 11:30 AM UTC**. Recheck at submission time. The [event checklist](EVENT_CHECKLIST.md) documents a discrepancy between Devpost's $14,944 advertised infrastructure/software value and the organizer website's $2,600 credit/seed-pool description. Do not assume a cash payout or use a prize in the business plan.

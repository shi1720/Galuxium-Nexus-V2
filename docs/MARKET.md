# Pactshift — market thesis and source pack

Research date: **22 September 2026**. Founder and product owner: **Shivam Gupta**. This is desk research, not customer validation. There are **zero verified users, paying customers, or revenue** in this research record.

## The commercial problem

A small agency sells a defined project. Later, a client asks for another page, language, integration, or revision. Someone must decide what changes in the fee, delivery plan, and agreed work. When that decision stays in a conversation, the client and agency can continue with different expectations.

Pactshift turns that moment into a shared choice: **add budget, exchange planned work, or defer the request**. An accepted choice changes the saved project baseline, so the delivery plan reflects the agreement.

The problem is credible, but its incidence and willingness to pay remain unmeasured here. Upwork publishes guidance for negotiating additional work, including exchanging deliverables, adding a paid milestone, and moving work into a later phase. That establishes a recognizable practice, not a market-size statistic. [S1]

## Beachhead customer

**Buyer:** the founder or delivery lead of a 2–15 person web or product design agency.

**Initial job:** manage changes on a fixed-fee website project with explicit pages, integrations, revision allowances, estimated effort, and a named client decision-maker.

**Trigger:** an extra request arrives while the project is active and the buyer needs to respond before work starts.

**Existing alternative:** email plus a spreadsheet, a project board, a proposal tool, or a broader agency operations platform. The switching strategy is to add a small shared decision workflow alongside those tools. Pactshift does not require moving the whole agency into a new project management system.

This initial release has one authenticated owner per workspace. The buyer may run an agency, but “Agency” pricing does not imply implemented team invitations or role management.

Proposed plans allow 3, 15, or 60 **stored projects**, including archived records, and 30, 300, or 1,500 monthly analyses. Every workspace is bounded to 720,000 serialized bytes; each project is bounded to 30 requests, 80 deliverables, 50 baselines, and 100 audit events. Included client decisions are subject to these limits. These constraints are relevant to adoption research, especially for larger agencies.

## What exists already

Prices below were advertised on the vendors' own sites when researched. Features are vendor claims, not independently tested capabilities. Prices can change.

| Product | Advertised position and price | Implication for Pactshift |
| --- | --- | --- |
| ScopePilot | Request-versus-contract analysis, estimates, change orders, and a client portal; Pro €4.99/month. [S2] | Generic analysis and generated text are already inexpensive. |
| ScopeGuardian | Cited SOW analysis, effort estimates, change orders, digital approvals, and a precedent engine; advertised post-beta $99/month plus 5% of approved change orders, capped at $5,000/year. [S3] | Citations, approvals, and an AI classifier alone are not distinctive. |
| ScopeApproval | Client approval URLs and receipt PDFs; Solo $27, Pro $47, Agency $97 per month. [S4] | The complete approval packet is also an established product. |
| Productive | Broad agency budgeting and operations; Essential advertised at $10/user/month on monthly billing, minimum three seats. [S5] | Stay focused on agreement changes rather than recreating a full agency suite. |

## The differentiation hypothesis

Pactshift's focus is the **project state after the decision**. A swap names the work being removed, checks that it is eligible, shows the client what changes, and updates the baseline when accepted. Budget and deliverables move together. A stale approval cannot silently overwrite a newer agreement.

That requires a coherent system, not just better generated prose:

- A versioned baseline with structured deliverables, estimates, locks, and dependencies.
- Three client choices with explicit consequences.
- Deterministic eligibility checks and server-calculated fees.
- Atomic acceptance, repeat-request protection, and a decision history.
- A clear distinction between approved additional fees and capacity preserved by a swap.

These are intended differentiators, not a claim that no competitor has comparable features. Scope trading itself predates Pactshift. The product must win on clarity, speed, and reliable execution.

The most important commercial uncertainty is whether a founder will introduce another tool for a conversation they currently handle in email. A second uncertainty is whether clients understand a swap without a call. Both must be tested before expanding the feature set.

## Alternatives considered

| Alternative | Attractive feature | Reason not selected |
| --- | --- | --- |
| Cloud SLA credit evidence assistant | An outcome with a direct monetary value. | Eligibility depends on actual provider terms, resource-level telemetry, and claim windows. AWS requires qualifying evidence; public incident pages alone are insufficient. NextSignal already offers recovery software. [S6–S7] |
| Accessibility regression reporting for agencies | A repeatable service agencies can resell. | Existing vendors advertise inexpensive monitoring and agency reports. Automated checks also cannot establish complete accessibility conformance; W3C describes the need for human judgment. [S8–S9] |

Pactshift offers a narrower workflow that can be demonstrated end to end with genuine persisted state and without pretending to have access to production customer systems.

## Positioning and acquisition

**One sentence:** Pactshift helps small agencies turn an extra client request into an agreed change in budget or deliverables.

**Story:** The problem is not that a client changes their mind. It is that the team keeps working from an agreement that never changed with it.

**First acquisition experiment:** invite a small set of agency founders to use Pactshift on one upcoming change request. Offer setup assistance, measure how many invite a real client, and ask for a paid continuation after the project. Messages and research sessions are prepared in [the validation playbook](VALIDATION_PLAYBOOK.md); they have not been sent or conducted.

**Retention hypothesis:** a reusable scope template and history of actual decisions make the next project easier to manage. That is a possible source of retention, not an established moat.

## Claims policy

Do not publish unsupported statements such as “agencies lose 30% of revenue,” “customers save thousands,” or “the first scope exchange.” Do not describe sample approvals as revenue, synthetic people as customers, or a hash chain as an independent notarization. A client acknowledgement records a decision; this release does not verify the person's identity or represent a qualified electronic signature.

Use numbers the product can explain: the agency's entered hourly rate, the estimated work affected, an explicitly approved fee, and the baseline before and after a decision. Keep commercial assumptions labeled as assumptions.

## Primary source pack

All sources accessed **22 September 2026**. This pack records the claims used above and in the business brief, so reviewers can inspect their original context.

| ID | Source | Supports / does not establish |
| --- | --- | --- |
| S1 | [Upwork — 14 Negotiation Helpers for Avoiding Scope Creep](https://www.upwork.com/mc/documents/caf2f4f2e8dab00fc04b3408465eedb3) | Recognizable swap/add/defer negotiation practice; not frequency or demand for Pactshift. |
| S2 | [ScopePilot](https://scopepilot.io/) | Vendor feature and pricing claims. |
| S3 | [ScopeGuardian](https://scopeguardian.ai/) | Vendor feature and pricing claims. |
| S4 | [ScopeApproval](https://www.scopeapproval.com/) | Vendor feature and pricing claims. |
| S5 | [Productive pricing](https://productive.io/pricing/) | Adjacent operations software and advertised commercial model. |
| S6 | [AWS — Amazon Compute SLA](https://aws.amazon.com/compute/sla/) | Resource evidence, availability definitions, exclusions, and credit request process. |
| S7 | [NextSignal pricing](https://www.nextsignal.io/pricing) | Existing SLA recovery competitor and its license/success-fee model. |
| S8 | [WCAG Repair pricing](https://www.wcagrepair.com/pricing) | Existing accessibility reports and monitoring offers. |
| S9 | [W3C — Selecting Web Accessibility Evaluation Tools](https://www.w3.org/WAI/test-evaluate/tools/selecting/) | Limits of automated accessibility evaluation. |
| S10 | [Google Cloud — generative AI pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing) | Published Gemini 2.5 Flash-Lite token prices used in the cost scenario. |
| S11 | [Google Cloud — Cloud Run pricing](https://cloud.google.com/run/pricing) | Request-based resource pricing, region sensitivity, shared billing-account free allowance. |
| S12 | [Google Cloud — Free Program](https://docs.cloud.google.com/free/docs/free-cloud-features) | Listed request-based Cloud Run and Firestore free allowances, subject to eligibility. |
| S13 | [Google Cloud — Firestore pricing](https://cloud.google.com/firestore/pricing) | Read/write/storage billing and free quota; backups and other features can cost extra. |
| S14 | [Stripe India pricing](https://stripe.com/in/pricing) | Payment processing fee scenarios and account availability. |
| S15 | [Stripe Billing India pricing](https://stripe.com/in/billing/pricing) | Published pay-as-you-go Billing fee. |

The hackathon requirements and rubric used in this repository come from the event brief supplied by Shivam Gupta. Final eligibility and submission fields must be checked against the official event rules before submission.

# Pactshift — business and monetization design

**22 September 2026 · Shivam Gupta, founder and product owner**

Pactshift sells a practical outcome: a client change request becomes a clear decision, and the project plan changes with it. The first customer is a small web or design agency delivering fixed-fee projects. The product supports an additional fee, a swap of eligible planned work, or deferral.

This is a proposed commercial model. **Verified customers: 0. Verified revenue: $0.** Pricing has not been validated with paying buyers. Optional Stripe Checkout and Billing integration requires a configured account, prices, and webhook; an unconfigured deployment does not collect payments.

## Plans

Prices are proposed monthly USD subscription prices, before applicable taxes. Project and monthly analysis allowances are enforced by the application; they are not promises of unbounded storage or workload.

| Plan | Monthly price | Stored projects | Analyses per month | Intended customer |
| --- | ---: | ---: | ---: | --- |
| Free | $0 | 3 | 30 | Evaluate a complete decision workflow. |
| Studio | $29 | 15 | 300 | An owner running several concurrent client engagements. |
| Agency | $79 | 60 | 1,500 | An owner managing a larger portfolio. |

Clients can review an offer without creating an account. There is no percentage charge on the agency's approved work. Each workspace currently has one authenticated owner; shared ownership, team invitations, SSO, and custom roles are outside this release.

Each tier retains the same essential decision integrity: server-calculated fees, eligibility checks, version checks, and recorded decisions. Integrity is not an upsell. Archived projects count as stored projects. Every workspace is capped at **720,000 serialized bytes**; each project supports at most **30 requests, 80 deliverables, 50 baselines, and 100 audit events**. The first bound reached applies. Client approvals are included within those limits, not unlimited. A project allowance does not guarantee that every project can simultaneously reach every object limit.

## What the buyer is paying for

The buyer gets a repeatable client conversation, a before/after agreement, and a saved delivery baseline. AI assists with understanding a request. The agency confirms effort and the client chooses the outcome. Pricing, eligibility, and acceptance are controlled by application rules.

An illustrative calculation is useful only when its terms are visible. At an entered rate of $100/hour, a 12-hour addition represents a $1,200 proposed fee. If a client instead swaps out a planned 16-hour deliverable, the project budget stays fixed and planned workload falls by four hours. Neither figure is cash collected. These are sample calculations, not observed customer results.

Break-even from capacity alone: at $100/hour, $29 equals 17.4 minutes and $79 equals 47.4 minutes. This says what a buyer would need to value the tool at; it does not establish that the tool saves that time, that freed time can be sold, or that any fee will be paid.

## Revenue loop

1. A founder tries the isolated sample workspace or creates an account.
2. They define a real project's deliverables and create one change request.
3. A client chooses an option through a limited offer link.
4. The owner sees the baseline update and returns for the next request.
5. Usage across more projects creates a reason to consider a paid plan.
6. When billing is configured, Stripe-hosted Checkout starts the subscription, verified webhook events apply plan state, and the portal handles subscription management.

The subscription purchases Pactshift. It does **not** pay the agency's customer invoices or collect approved add-on fees. Pactshift records approved commercial terms; it is not an accounts receivable system.

## Cost model: assumptions, not a bill

The small deployment uses Cloud Run with request-based billing, minimum zero and maximum two instances, Firestore, and optional Vertex AI Gemini 2.5 Flash-Lite. It is hosted in an existing shared Google Cloud project with an isolated named database, `pactshift`, and seven-day PITR enabled. Named databases do not receive the default database's free quota, and PITR adds cost. Actual cost depends on region, resource configuration, traffic, request duration, document size, retries, and other projects sharing the billing account. [Firestore pricing](https://cloud.google.com/firestore/pricing)

### AI unit cost

Google's published standard Gemini 2.5 Flash-Lite prices on the research date are **$0.10 per million text input tokens** and **$0.40 per million text output tokens**, including reasoning output. The example assumes no caching discount, grounding, or batch discount. [Google AI pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)

Assume 6,000 input tokens and 1,000 total billed output tokens per analysis:

```text
6,000 / 1,000,000 × $0.10 + 1,000 / 1,000,000 × $0.40 = $0.001
```

| Plan at its analysis allowance | Base AI estimate | 2× contingency for retries or longer calls |
| --- | ---: | ---: |
| Free: 30 | $0.03 | $0.06 |
| Studio: 300 | $0.30 | $0.60 |
| Agency: 1,500 | $1.50 | $3.00 |

The token counts are planning assumptions, not measured application averages. A stress case of 30,000 input and 4,000 output tokens costs $0.0046 per call before retries: $1.38 for Studio or $6.90 for Agency at full allowance. A 2× contingency raises these to $2.76 and $13.80. Request limits, output limits, and usage monitoring matter more than a tiny headline estimate. The rules engine has no external model charge; it is labeled separately and does not offer equivalent semantic understanding.

### Small-volume infrastructure scenario

For a planning example, assume 100,000 dynamic requests/month, average 0.5 billed seconds per request, one vCPU and 0.5 GiB of memory, minimum zero instances, and no benefit from concurrent processing. That gives 50,000 vCPU-seconds and 25,000 GiB-seconds. At published Tier 1 request-based rates, the gross compute/request calculation before free allowances is approximately **$1.30/month**: $1.20 CPU + $0.0625 memory + $0.04 requests. Model latency, startup time, static asset requests, and heavier operations can increase this materially. [Cloud Run pricing](https://cloud.google.com/run/pricing)

Google lists request-based free allowances of two million requests, 180,000 vCPU-seconds, and 360,000 GB-seconds monthly; Cloud Run allowances aggregate across projects on a billing account. **The account used for this project may already consume that allowance elsewhere. Free hosting is not promised.** [Free Program](https://docs.cloud.google.com/free/docs/free-cloud-features)

Firestore's listed free quota includes 1 GiB, 50,000 reads/day, and 20,000 writes/day for an eligible default database; **it does not apply to Pactshift's named production database**. Use a $10/month initial infrastructure reserve for planning rather than treating a free quota as a budget. This reserve is an internal assumption, not a provider quote; egress, build artifacts, logging, secrets, PITR/backups, and taxes need separate observation. Transactions and large workspace documents may dominate performance before raw request cost does. [Firestore pricing](https://cloud.google.com/firestore/pricing)

### Payment costs and contribution scenario

Do not use US processing fees as an assumption for an Indian business. Stripe's India page lists 4.3% for international cards with USD or other currency presentment, plus 2% if conversion is required; Stripe Billing lists 0.7% of Billing volume. Exact eligibility, commercial terms, taxes, and presentment must be confirmed with the configured account. [Stripe India](https://stripe.com/in/pricing), [Stripe Billing](https://stripe.com/in/billing/pricing)

For a conservative illustration, reserve **7% of subscription revenue** for processing, conversion, and Billing, before any applicable tax on fees. Allocate $1/account/month of a hypothetical $10 infrastructure reserve across ten paying accounts. With the 2× base AI contingency:

| Monthly scenario | Studio | Agency |
| --- | ---: | ---: |
| Subscription revenue | $29.00 | $79.00 |
| Payment fee reserve, 7% | −$2.03 | −$5.53 |
| AI at full allowance, base contingency | −$0.60 | −$3.00 |
| Allocated infrastructure reserve | −$1.00 | −$1.00 |
| Contribution before support and other expenses | **$25.37** | **$69.47** |

This is neither gross profit guidance nor a revenue forecast. It omits support labor, acquisition, refunds, disputes, tax, backup overhead, free-user subsidies, and product development. At the 2× AI stress case, contribution falls to $23.21 and $58.67 respectively. At one customer, the infrastructure reserve is not spread over ten accounts.

## Go-to-market experiment

Recruit ten qualified agency owners for problem interviews, then invite five to a time-limited pilot. These are targets; none have been recruited in this record. Offer to help structure one existing project, with their permission and a redacted scope. Measure whether they actually share an offer with a client and repeat the workflow, rather than counting a sign-up as value.

The initial acquisition channel is focused founder outreach and agency communities, followed by a free reusable change-request worksheet. Do not purchase ads before the activation and willingness-to-pay questions are answered. Use [VALIDATION_PLAYBOOK.md](VALIDATION_PLAYBOOK.md) for scripts, targets, and a decision log.

## Boundaries and expansion

The current product deliberately stops at the agreement boundary. It does not independently verify signers, provide legal advice, process agency client payments, integrate email/Slack, parse uploaded contracts, or operate a multi-user agency workspace. Those should be evaluated after real usage identifies the largest friction.

Potential expansion is structured templates, clearer allowance tracking, and integrations that bring requests in and updated deliverables out. The durable asset would be useful project history and a workflow clients understand. An AI model by itself is not a moat.

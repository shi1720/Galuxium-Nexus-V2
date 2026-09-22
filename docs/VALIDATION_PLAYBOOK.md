# Pactshift: customer validation playbook

**22 September 2026 · Owner: Shivam Gupta**

This is a plan, not completed research. Current record: **0 interviews, 0 recruited pilots, 0 verified customers, $0 verified revenue**. Outreach text below is a draft; it has not been sent. Do not count demo activity as customer evidence.

## Decisions this research should answer

1. Does an agency owner encounter enough consequential change requests to care?
2. Is a separate shared decision page easier than their existing email process?
3. Can a client understand and choose a deliverable exchange without explanation?
4. Does the saved updated baseline reduce a real coordination problem?
5. Will the owner continue paying $29 or $79 after a pilot?

The first product risk is adoption of another tool. The second is trust in the client-facing proposal. AI novelty is not the validation target.

## Recruitment criteria

Start with owners or delivery leads at independent web/design agencies with 2–15 people. They should have delivered a fixed-fee client project in the past three months and expect an active project during the pilot. Aim for a mix of people who charge for extras, exchange scope, or absorb changes.

Exclude friends who only want to be encouraging, speculative founders without client work, and participants seeking a full project-management replacement. Existing relationships are useful for access, but record the relationship so friendliness is not mistaken for demand.

Initial targets are **ten interviews and five pilots**. These are small learning samples, not statistically representative market research.

## Outreach draft

Subject: How do you handle changes after a website scope is agreed?

Hi [first name],

I'm Shivam, building Pactshift for small agencies. It turns an extra client request into a choice: add a fee, exchange planned work, or defer, then updates the saved project scope.

I'm looking for candid feedback from people who manage fixed-fee website projects. Could I spend twenty minutes learning how you handled the last change request that affected the budget or delivery plan? You don't need to share confidential documents, and this is research rather than a sales demo.

If the problem is relevant, I can also help you try it on one project. No pressure if your current process already works well.

Thanks,
Shivam

Send only through channels where the founder is authorized to communicate, and personalize the message. Avoid mass outreach, invented familiarity, and statements implying the recipient has already agreed to participate.

## Twenty-minute problem interview

Ask for permission before recording. Written notes are sufficient. Do not request a client contract or message if a verbal, anonymized account answers the question.

| Time | Question | What to capture |
| --- | --- | --- |
| 0–2 min | What sort of projects do you sell, and how is scope normally agreed? | Project type, contract size band, billing model, buyer role. |
| 2–7 min | Tell me about the last request that changed the agreed work. What happened next? | Actual sequence, people involved, tools, decision time. |
| 7–10 min | Was anything charged, removed, delayed, or absorbed? Where was the final decision recorded? | Behavior and consequence, not a hypothetical estimate of all losses. |
| 10–13 min | Did anyone later work from the wrong version of the plan? How did you discover it? | Evidence of the baseline problem or evidence it is rare. |
| 13–16 min | What works well about your current process? What have you tried to improve it? | Switching cost, existing paid tools, abandoned attempts. |
| 16–18 min | Who could introduce a new client-facing step, and what would make that risky? | Purchase authority and trust constraints. |
| 18–20 min | Would you show me how you would handle a fictional example in this product? | Consent for a separate usability exercise. |

Avoid leading questions such as “How much money does scope creep cost you?” or “Wouldn't a swap be useful?” Ask about the most recent concrete event and allow the answer to be that there is no meaningful problem.

## Fifteen-minute usability session

Give the participant the fictional Forma project and ask them to prepare an offer for Spanish-language pages. Do not explain the controls unless they are stuck. Observe:

- Can they identify the saved agreement and distinguish an estimate from a model suggestion?
- Can they find a valid swap and explain why the resource library can be exchanged?
- Can they predict what will happen to the fee and delivery plan for each choice?
- Do they notice the assumption that the client supplies approved translated copy?
- Do they understand that the client offer excludes internal costs?

For a second participant acting as the client, ask: “Choose the option you would prefer and tell me what you expect the agency to deliver afterward.” Compare their answer with the recorded decision. Do not coach them toward the swap.

Record completion, time, errors, and misunderstood consequences. Ask for feedback after the task so early opinions do not substitute for observation.

## Fourteen-day pilot

Use one active project per agency. The owner enters only data they are entitled to share and can start with redacted deliverables. Help establish the baseline; do not fabricate requests to inflate activity. The pilot succeeds only if a real request arises and the owner chooses to use the workflow.

Explain the early-release bounds before a pilot: plan counts apply to stored projects, including archives; workspace capacity is 720,000 serialized bytes, and a project allows at most 30 requests, 80 deliverables, 50 baselines, and 100 audit events. Client approvals are included within those limits. Record whether the bounds interfere with realistic usage rather than hiding them during recruitment.

Before a client receives an offer, confirm the owner understands its scope and that the acknowledgement is not independent identity verification. The agency remains responsible for its customer relationship and commercial terms. Keep their existing contract and billing process in place.

Suggested sequence:

1. Day 1: a 20-minute setup session and baseline review.
2. Days 2–7: observe the first request, if one occurs; help only when asked.
3. Day 7: ask about friction, confusing language, and whether the client needed a call.
4. Days 8–14: watch for voluntary reuse; do not prompt unnecessary proposals.
5. Day 14: review the record and ask for a paid continuation at the published proposed price. If live billing is unavailable, record an explicit willingness-to-pay answer separately from actual payment.

No real request during fourteen days is useful frequency evidence. Extend only if there is a clear expected event, not to manufacture a successful pilot.

## Measurement definitions

| Metric | Definition | Does not count |
| --- | --- | --- |
| Qualified interview | Relevant buyer discusses a recent real project in a completed session. | Newsletter sign-up or friendly comment. |
| Activated pilot | Owner saves a real baseline and shares an offer for a genuine request. | Seeded demo or founder-created fake project. |
| Client decision completion | A real client selects an option with the agency's authorization. | Founder acting as client, duplicate clicks, or abandoned views. |
| Correct understanding | Client can describe the agreed work, fee, and timing accurately. | A click alone. |
| Repeat use | Owner independently uses the workflow for another actual request. | A prompted test or retry. |
| Approved additional fee | Client accepts an addition with a recorded positive fee. | A proposed fee or a swap's estimated value. |
| Collected agency fee | Agency confirms receipt through its own billing record. | Approval alone; Pactshift does not collect this payment. |
| Paid Pactshift conversion | A subscription payment settles and is not a test transaction. | Verbal interest or test-mode checkout. |
| Time to decision | Elapsed time from sharing a real offer to a client choice, with context. | An asserted “hours saved” counter. |

Use consented observation and minimal manual notes initially. Do not claim product analytics instrumentation that has not been implemented.

## Decision thresholds

These are provisional learning gates, not industry benchmarks:

- Continue the beachhead if at least six of ten qualified interviews describe a recent consequential change and at least three identify a gap in their current recorded agreement.
- Continue the workflow if at least three of five pilots share a real offer and at least two reuse it without prompting when another request occurs.
- Rework client presentation if more than one observed client misunderstands the fee, removed work, or date after reading the offer.
- Revisit pricing if users repeat the workflow but no pilot buys a continuation. Investigate value and frequency before simply cutting price.
- Revisit the segment if founders already solve the problem comfortably in an existing system, or if changes occur too rarely for a subscription.

Always record the denominator, the time window, and exceptions. Five pilots cannot establish broad market fit, and a happy quote cannot override weak usage.

## Interview and pilot record template

```text
Participant ID:
Date / consent / relationship to founder:
Role and agency size band:
Project type and billing model:
Most recent relevant change (anonymized):
Actual process and tools:
Consequence and evidence:
Current alternative / what works:
Observed task completion and errors:
Pilot offered / accepted / declined and reason:
Real offer shared? Date and consented record reference:
Client understood fee, removed work, and date?
Repeat use? Context:
Price discussed / exact response:
Actual settled subscription? Evidence or none:
Product change suggested:
Researcher's interpretation, separated from facts:
Retention/deletion date for research notes:
```

## Responsible evidence and publishing

Ask separately before using a person's name, logo, quote, or project example. Keep private client information out of the public repository and demo. Publish aggregate results only with enough context to avoid misleading readers. A later testimonial must come from the person and reflect their experience; never generate a quote on their behalf.

Update [MARKET.md](MARKET.md), [BUSINESS.md](BUSINESS.md), and [SUBMISSION.md](SUBMISSION.md) only when new evidence supports the change. Preserve the original hypothesis and the reason for any product decision so the project learns from reality instead of rewriting its story.

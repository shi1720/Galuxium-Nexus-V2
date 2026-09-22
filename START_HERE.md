# Pactshift — handoff for Shivam

**The product is live. The hackathon entry still needs your video and verified participation steps.**

[Open Pactshift](https://pactshift-wh46bdeima-uc.a.run.app) · [Public source](https://github.com/shi1720/Galuxium-Nexus-V2) · [Submission copy](docs/SUBMISSION.md)

Pactshift turns an agency's “one more thing” conversation into three explicit choices: add budget, exchange planned work, or defer. A client's accepted choice updates the actual saved project agreement. The narrow commercial hypothesis is a repeatable, client-friendly change decision for small fixed-fee web and design agencies.

## Try it in two minutes

1. Open the live app and choose **Explore the live demo**. It creates a private, fictional workspace that expires after 24 hours.
2. Open **Forma website**, then **Spanish-language pages**. Review the 12-hour addition and proposed exchange of the 16-hour resource library.
3. Save and share the client proposal. Open its generated link in another tab.
4. Choose the scope exchange, enter a fictional client name, acknowledge, and confirm.
5. Return to the owner tab. The budget stays $12,000, the date stays fixed, and baseline two changes estimated scope from 96 to 92 hours.

For your own workspace, register through the app and save the one-time recovery code. A demo workspace is temporary and should not hold real client work.

## Everything prepared for submission

- [Executive brief PDF](deliverables/Pactshift-brief.pdf): five pages covering product, architecture, market, and economics.
- [Editable pitch deck](deliverables/Pactshift-pitch.pptx): seven slides with actual product imagery and editable data.
- [Verbatim narration and storyboard](docs/DEMO_SCRIPT.md): about four minutes, including exact clicks and sample numbers.
- [Recording kit](docs/RECORDING_KIT.md): teleprompter, timing-draft captions, and recording instructions.
- [Ready-to-paste Devpost copy](docs/SUBMISSION.md), [business model](docs/BUSINESS.md), and [customer validation plan](docs/VALIDATION_PLAYBOOK.md).
- [Architecture](docs/ARCHITECTURE.md), [security policy](SECURITY.md), [operations](docs/OPERATIONS.md), and [internal rubric review](docs/JUDGE_REVIEW.md).

The materials credit you as founder and builder and disclose substantial AI assistance. No customers, revenue, testimonials, or human collaboration history have been fabricated.

## Steps that still require you

**Record and upload the video.** Follow the script and perform the real workflow with a fresh demo. The event requires a 2–5 minute video. Upload it, verify playback while logged out, and add its URL to the prepared Devpost entry. A finished video and final submission are not claimed.

**Verify event participation.** Use the [official-event checklist](docs/EVENT_CHECKLIST.md). Organizer updates add mandatory Discord membership and Backboard credit redemption. Registration timing is not verified, and published wording is ambiguous for entrants registering after the build window began. Prize amounts and conditions differ across official pages; do not assume a cash payout.

**Activate billing only when the merchant account is ready.** Paid checkout currently displays as unavailable. The Stripe integration and signed-event tests are implemented, but no merchant onboarding or live charge is complete. Create recurring USD prices for Studio ($29/month) and Agency ($79/month), configure the customer portal and subscription webhook, and supply the four documented environment variables through secret storage. Verify the full test-mode purchase/cancel flow before enabling real sales. See [payment activation](docs/OPERATIONS.md#optional-payment-activation). Do not commit keys or publish them in a GitHub issue. The hosted AI path already works through the Google runtime identity; no AI key is needed from you.

Real buyer validation is the next business milestone. The validation playbook supplies interview and pilot scripts; no outreach has been sent on your behalf.

## Operational ownership

The application runs on Google Cloud Run in the existing `gen-lang-client-0444960702` project, using the isolated `pactshift` database and runtime identity. It uses billable services; no guaranteed-free hosting claim is made. Resources and AI attempts are capped, with cost assumptions in the business document. The runbook identifies the exact service and database so future work can avoid unrelated resources in that shared project.

This is an early production release with explicit capacity and identity limits. Automated checks, hosted API evidence, and local browser evidence are recorded separately. A final hosted browser/mobile check and a complete recovery drill remain unclaimed.

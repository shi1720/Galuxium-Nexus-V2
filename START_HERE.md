# Pactshift: handoff for Shivam

**Pactshift is live, the desktop and mobile workflows are verified, and the 3:21 demo is published. Discord access and final Devpost submission confirmation remain outstanding.**

[Open Pactshift](https://pactshift.web.app) · [Watch the demo](https://youtu.be/BF9QX1_Pppg) · [Public source](https://github.com/shi1720/Galuxium-Nexus-V2) · [Seven-field project story](docs/PROJECT_STORY.md)

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
- [Published product video](https://youtu.be/BF9QX1_Pppg): 3:21, disclosed AI narration, 63 captions, and authentic hosted application captures. [Exact chapters and metadata](docs/VIDEO_METADATA.md).
- [Verbatim narration and storyboard](docs/DEMO_SCRIPT.md): the 506-word source script and recording plan.
- [Recording kit](docs/RECORDING_KIT.md): teleprompter, timing-draft captions, and recording instructions.
- [Ready-to-paste Devpost copy](docs/SUBMISSION.md), [judge testing instructions](docs/TESTING_INSTRUCTIONS.md), and [YouTube title and description](docs/VIDEO_METADATA.md).
- [Business model](docs/BUSINESS.md) and [customer validation plan](docs/VALIDATION_PLAYBOOK.md).
- [Architecture](docs/ARCHITECTURE.md), [security policy](SECURITY.md), [operations](docs/OPERATIONS.md), and [internal rubric review](docs/JUDGE_REVIEW.md).

The materials credit you as founder and builder and disclose substantial AI assistance. No customers, revenue, testimonials, or human collaboration history have been fabricated.

## Completion record and remaining steps

**Confirm the final entry.** The [3:21 demo](https://youtu.be/BF9QX1_Pppg) was published publicly with an English caption track, custom thumbnail, and AI-use disclosure. Public watch-page playback and unauthenticated oEmbed access are verified. Existing Devpost project 1192668 has its fields, gallery, video, and ZIP saved through four of five steps; final submission has not yet been confirmed. Use the actual video URL in the entry and retain its final submission status.

**Log in to Discord and join the event server.** Use the [official invitation](https://discord.com/invite/J3Tbd3vXdr). No usable Discord login was available to complete membership. The [organizer makes joining mandatory](https://galuxium-nexus-v2-29411.devpost.com/updates/45996-official-board-notice-expansion-to-q4-global-summit-timeline-extension). Backboard signup, email verification, and **$10 in free participant credits** were successfully completed on 22 September; no API key or Backboard product integration was needed. The [event checklist](docs/EVENT_CHECKLIST.md) retains the original roster-timing ambiguity and differing published prize terms. No cash payout is assumed.

**Activate billing only when the merchant account is ready.** Paid checkout currently displays as unavailable. The Stripe integration and signed-event tests are implemented, but no merchant onboarding or live charge is complete. Create recurring USD prices for Studio ($29/month) and Agency ($79/month), configure the customer portal and subscription webhook, and supply the four documented environment variables through secret storage. Verify the full test-mode purchase/cancel flow before enabling real sales. See [payment activation](docs/OPERATIONS.md#optional-payment-activation). Do not commit keys or publish them in a GitHub issue. The hosted AI path already works through the Google runtime identity; no AI key is needed from you.

Real buyer validation is the next business milestone. The validation playbook supplies interview and pilot scripts; no outreach has been sent on your behalf.

## Operational ownership

Firebase Hosting site `pactshift` serves the interface at `https://pactshift.web.app` and forwards same-origin `/api` requests to the Cloud Run service. The existing `gen-lang-client-0444960702` project contains the isolated `pactshift` database and runtime identity. These are billable services; no guaranteed-free hosting claim is made. Resources and AI attempts are capped, with cost assumptions in the business document. The runbook identifies the exact resources to avoid unrelated services in that shared project.

This is an early production release with explicit capacity and identity limits. It has 46 passing tests, a passing build, zero reported dependency-audit vulnerabilities, and 21 passing checks against the Firebase origin. Hosted desktop swap, mobile project/analysis/deferral/revisit, and existing-owner mobile login with refresh persistence are verified. A complete recovery drill, independent security audit, and broad browser certification remain unclaimed.

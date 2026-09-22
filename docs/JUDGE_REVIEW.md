# Internal judge-style review

**Review date: 22 September 2026. This is an internal AI-assisted diagnostic, not an official judge score, external validation, or prediction of winning.**

The review used the supplied Galuxium Nexus V2 rubric, current source, tests, and deliverable copy. The initial score deliberately reflected incomplete deployment/video evidence and functional gaps. It is retained so improvements remain traceable rather than rewriting the starting assessment.

## Initial diagnostic: 61 / 100

| Criterion | Weight | Initial estimate | Main reason |
| --- | ---: | ---: | --- |
| Architecture and scalability | 20 | 15 | Strong transaction rules; cloud adapter/runtime evidence incomplete. |
| Governance and compliance | 20 | 14 | Sensible controls, but historical agreement dates were not preserved. |
| Innovation and market fit | 20 | 12 | Useful narrow workflow; crowded adjacent category and no customer validation. |
| Monetization | 15 | 9 | Explicit plans/costs, but checkout unavailable and willingness to pay untested. |
| UI/UX | 15 | 9 | Coherent interface, with a fresh-account creation bug and workflow dead ends. |
| Keynote and completeness | 10 | 2 | Script/artifacts existed; live evidence and required video were incomplete. |

At the initial checkpoint, the missing mandatory video was an eligibility/completeness problem regardless of score. The video is now produced and publicly published; the later assessment below incorporates that evidence.

## Findings and follow-through

“Implemented” below means a source fix was inspected. It does not substitute for release browser verification.

| Finding | Priority | Inspected follow-through |
| --- | --- | --- |
| New-project form sent extra raw form fields rejected by strict API validation. | Critical | Client maps only accepted fields. Actual project creation was subsequently verified in the hosted mobile journey. |
| Historical baseline omitted due date and showed the current date after later additions. | High | Baseline includes due date; snapshots persist it; historical view uses it; prior local records have normalization. Regression coverage added. |
| AI/rules ignored the project-level field where users entered scope boundaries. | High | Boundaries now feed analysis with exact-source validation and dedicated tests. |
| Revoked requests became non-editable in the client despite backend review support. | High | Client permits review/editing of revoked drafts and reissue; stale review rebases before a new share. |
| New real projects had no interface to mark work started or protected. | High | Status/protection controls added; backend enforces forward progress and prerequisites. |
| Pricing said active projects and unlimited client decisions despite storage/object limits. | High | Copy now says stored projects and includes explicit request/history/storage bounds; archive still counts. |
| Client offer lacked actual before/after budget and date. | High | Before/after summary and receipt totals/dates added; public values anchored to the source baseline. |
| Adapter behavior had only local-suite evidence. | High | Native Firestore roundtrip, canonical audit verification, concurrent updates, and rollback smoke passed; deployed readiness/demo verified. |

The updated source also keeps the difference between configured Vertex capability and actual model execution visible. Stripe remains explicitly unavailable without merchant configuration. No paid usage or customer traction was invented to improve the score.

## Follow-up evidence and disposition

1. **Completed targeted browser checks:** hosted desktop swap and mobile project creation, Vertex analysis, sharing, deferral, receipt, and revisit as a new draft. No horizontal overflow in visited 390px views. Existing-owner mobile login, invalid-password feedback, and refresh persistence also passed. Closed mobile navigation was verified absent from the accessibility tree after its fix. These checks do not constitute a comprehensive accessibility audit.
2. **Completed live AI check:** canonical smoke and mobile browser requests returned Vertex analysis with validated scope evidence.
3. **Completed artifacts:** five-page executive PDF and seven-slide editable presentation rendered and visually validated.
4. **Produced and published:** the 3:21 product film has 63 captions and disclosed AI narration. Public watch-page playback and unauthenticated oEmbed access are verified in [VIDEO_METADATA.md](VIDEO_METADATA.md).
5. **Completed release checks:** public repository available, 46 tests passing, build passing, no reported dependency-audit vulnerabilities, and 21 passing Firebase-origin checks. Final commit/deployment metadata must match the published release.
6. **Intentionally unavailable:** merchant billing remains unconfigured. No paid usage or successful live checkout is claimed.
7. **Participation remaining:** Discord requires the user's login/join action; final Devpost submission confirmation is not yet recorded. Backboard signup, email verification, and $10 participant-credit redemption are complete.

## Earlier checkpoint after initial workflow: 72 / 100

At this review checkpoint, the release operator verified 30 focused tests (26 backend, 4 frontend), native Firestore behavior, and an actual live Vertex response with a validated citation. A real local Safari session published an offer, accepted its swap in the client view, displayed the $12,000/version-two receipt, and showed the updated owner project. The deployed Cloud Run workflow was verified separately through its real API. Screenshots were captured from the application. A final hosted browser/mobile check was not claimed at that checkpoint. These are functional checks, with distinct local UI and deployed API evidence.

| Criterion | Updated estimate | Reason |
| --- | ---: | --- |
| Architecture and scalability | 17/20 | Native persistence/concurrency smoke and tested domain rules; bounded aggregate remains a deliberate ceiling. |
| Governance and compliance | 16/20 | Historical-date, scope-boundary, and receipt integrity fixes inspected; real controls, with identity/audit limits disclosed. |
| Innovation and market fit | 12/20 | Clear differentiated workflow; no new buyer-validation evidence. |
| Monetization | 9/15 | Credible model and bounded costs; checkout still disabled and paid demand untested. |
| UI/UX | 13/15 | At this earlier checkpoint, local Safari was verified and hosted browser validation remained. |
| Keynote and completeness | 5/10 | At this earlier checkpoint, the live product and artifacts existed but the finished video was missing. |

The 72-point estimate was made before the final Firebase browser checks and public film. It is retained as a historical checkpoint, not the current result.

## Current diagnostic after hosted verification and publication: 76 / 100

The release now has 46 passing automated tests, a successful build, and a dependency audit with zero reported vulnerabilities. All 21 checks in [RELEASE_EVIDENCE.json](RELEASE_EVIDENCE.json) passed at `https://pactshift.web.app`. The operator also verified the 1920px desktop swap and the 390px mobile creation/analysis/share/deferral/revisit journey. The public 3:21 film uses authentic hosted captures, disclosed AI narration, and 63 captions. [Video evidence](VIDEO_EVIDENCE.json)

| Criterion | Current estimate | Reason |
| --- | ---: | --- |
| Architecture and scalability | 17/20 | Transactional agreement rules, real persistence, and hosted regression evidence; bounded workspace aggregate and single-region limits remain. |
| Governance and compliance | 16/20 | Inspectable isolation, origin/CSRF, capability and AI controls; no independent security audit, verified signer identity, or compliance certification. |
| Innovation and market fit | 12/20 | Clear scope-exchange workflow in a competitive category; no buyer or repeat-use validation yet. |
| Monetization | 9/15 | Defined plans and grounded cost assumptions; paid checkout and willingness to pay are unverified. |
| UI/UX | 14/15 | Actual desktop/mobile paths verified, historical-export and calendar-date issues fixed, and closed-menu accessibility state checked. Broader usability research remains. |
| Keynote and completeness | 8/10 | Captioned 3:21 film publicly published, live product and submission materials complete. Public playback verified; final event-submission confirmation remains separate. |

This is an internal, subjective assessment, not an official judge score or assurance of placement. The remaining commercial evidence cannot be replaced by additional polish. Published event participation requirements and the final submission receipt must still be verified independently of this estimate.

## Commercial critique

The underlying problem is recognizable. The product is easy to explain, and its best feature is that a client choice updates the delivery agreement. That is stronger than a detached chatbot response.

It is not an uncontested category. Existing products already offer scope classification, citations, estimates, approval links, and receipts. Scope exchange is an established negotiation practice. Pactshift must earn adoption through an unusually clear, reliable implementation and by fitting alongside existing agency tools.

The largest unanswered question is whether founders will introduce another client-facing step often enough to pay a subscription. Desk research cannot answer that. The validation playbook defines actual interviews, pilot use, and paid continuation as the next evidence. There are currently zero verified customers and $0 verified revenue.

## Production-readiness critique

The release contains real authentication, durable cloud persistence, domain constraints, and meaningful failure tests. Its governance statements are limited and inspectable.

Its small architecture also has real ceilings: one workspace aggregate, 720,000-byte storage bound, 100 audit events and 50 snapshots per project, no team roles, no email verification/MFA, no verified signer identity, no import/restore interface, and a small single-region runtime. A seven-day PITR configuration is not a completed recovery drill. These should remain visible rather than being concealed behind “enterprise-grade” language.

The best next engineering investment is measured reliability and complete user journeys. Extra feature count, unsupported compliance badges, or fabricated traction would make the submission less credible.

## Submission iteration: five product priorities

The next source review found four specific gaps in the owner/client journey. The release operator implemented the corresponding fixes, and the updated source was inspected. This table records that inspection; final hosted behavior requires release evidence.

The operator subsequently reported **46 passing tests, a passing production build, and zero dependency-audit vulnerabilities**. Firebase session forwarding and API behavior passed the canonical-origin checks. Desktop/mobile journeys and public video publication were also verified. These improvements strengthen implementation confidence; they do not supply customer-validation or revenue evidence.

| Priority | User consequence | Current inspection result |
| --- | --- | --- |
| Give deferred requests a path back into work. | A client chooses later, but the owner needs a fresh proposal when priorities change. | **Implemented:** Revisit as new request creates a new draft against current scope and preserves the prior deferral. |
| Preserve calendar dates across time zones. | A midnight UTC conversion could show the previous date to a client in the Americas. | **Implemented:** date-only values render with their agreed calendar day preserved. |
| Show the same project count that plan limits use. | An archived project still consumes an allowance, so an active-only usage counter misleads the owner. | **Implemented:** plan usage displays stored projects, including archives. |
| Export the agreement version being viewed. | An owner inspecting a historical baseline could otherwise download the current terms by mistake. | **Implemented:** export and visible version use the selected baseline's version, date, budget, and deliverables. |
| Finish the hosted browser journey and release video. | Source/API checks cannot establish readable mobile controls or smooth browser navigation. | **Completed targeted checks:** desktop swap and mobile creation/analysis/deferral/revisit passed; 3:21 film published. Public playback verified; broader accessibility research and final submission confirmation remain distinct. |

The strongest judging story remains the visible client decision and resulting agreement. Keep the film focused on the 16-hour-to-12-hour exchange, unchanged $12,000 budget and date, and saved version two. Present transparent AI support and the transaction rules as reasons that workflow is dependable. Customer demand, recurring use, and willingness to pay remain the commercial evidence still to earn.

# Pactshift testing instructions

Prepared 22 September 2026. The first section is ready to paste into the Devpost testing-instructions field. The canonical hosted desktop and mobile workflows have been verified; the checks below remain reproducible instructions for judges.

## Paste into Devpost

Open https://pactshift.web.app and select **Explore the live demo**. No login, API key, card, or shared password is required. Each demo creates an isolated workspace with fictional data, so judges can make real decisions without changing another judge's project. Use a separate browser tab for the client view.

**Main workflow, about three minutes:**

1. Open **Forma website**. Note the $12,000 agreed budget, 96 hours of planned scope, delivery date, and agreement version one. The date is generated when the demo is created.
2. Open **Change requests**, then **Spanish-language pages**. The request is 12 hours at $125/hour, with approved Spanish copy supplied by the client. The planned **Resource library** is the 16-hour exchange candidate. Started or protected work cannot be selected for exchange.
3. Review the estimate, two extra calendar days for the paid option, selected resource library, and client note. Check **I reviewed the scope, estimate, and choices**, then select **Create client decision link**.
4. Select **Open client view**. Compare the three choices. Adding the work produces a $13,500 total and two extra calendar days. Exchanging the resource library keeps the budget and date. Saving for later leaves the agreement unchanged.
5. Choose **Exchange scope**, enter **Alex Morgan** as a fictional test name, check the acknowledgement, and select **Confirm scope exchange**. The receipt should show a $12,000 total, the unchanged date, and agreement version two. You can print/save the receipt or download its record.
6. Return to the owner tab. Refresh if necessary. The resource library is exchanged out, Spanish-language pages are included, and planned scope totals 92 hours. Open **Version history** to compare with version one. Reloading the page should preserve the decision.

For a fresh AI comparison, create a new demo and select **Capture request** in the project. Use **Fill with a sample client request**, then **Review this request**. Inspect the explanation, quoted scope evidence, assumptions, and engine label. The preloaded request is a prepared rules-based sample; a newly captured request executes the configured analysis path. An AI outage can produce a clearly labeled rules fallback.

To test a real owner account, select **Create your workspace**, use an email address you control and a password of at least 12 characters, and save the private recovery code. The new workspace starts empty. No card is required. Use fictional project details for evaluation.

Paid subscriptions are proposed and checkout is currently disabled. The demo records agreement decisions; it does not charge the client. Do not enter confidential client content into a test workspace.

## Additional product checks

Use a fresh demo for each alternative decision, so an earlier acceptance does not alter the next test's baseline.

| Check | Action | Expected result |
| --- | --- | --- |
| Paid addition | Share the seeded request and choose **Add to the project**. | Version two includes both the resource library and Spanish pages; total budget $13,500, total scope 108h, delivery two calendar days later. No payment is collected. |
| Deferral | Share the seeded request and choose **Save for later**. | A recorded deferral, with budget $12,000, total scope 96h, date unchanged, and no new baseline. |
| Revisit a deferred request | Open its owner request page and select **Revisit as new request**. | A new draft is ready for review against current scope; the original deferral remains in the record. |
| Revocation | Share a request, copy its link, then use **Revoke this link** in the owner view. | Reloading the former client link shows it is unavailable. |
| Repeat visit | After a decision, reload the client offer. | The recorded receipt appears. No second deliverable or extra fee is created. |
| Stale proposal | Share two requests against the same version, accept one, then reload the other offer. | The second proposal needs review against the updated agreement before it can be accepted. |
| Historical record | After an addition, open the previous version. | Its original budget and date remain visible. |
| Account recovery | With a disposable account, log out and use **Forgot your password?**, the saved code, and a new password. | Access restored; a replacement code is issued. The previous code and sessions must no longer work. |
| Export | Use the workspace export in Settings. | A downloaded structured record; private client-link tokens are excluded. |
| Account removal | Export any records you need, then delete a disposable workspace using its name as confirmation. | The account, workspace, and associated client links stop being accessible. |

The platform has bounded usage and storage, including 720,000 serialized workspace bytes. Keep evaluation fixtures small. Do not perform load testing against the shared public deployment.

## Independent source checks

Follow [README.md](../README.md) for the supported local environment. The repository includes a lockfile and an example environment file. Local development can run without cloud or payment credentials.

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

Open `http://localhost:5173`. The API runs on port 8080 through the development proxy. Cloud storage, live AI, and Stripe are optional configured integrations; local operation does not establish that those providers were tested.

## Evidence and reporting

[RELEASE_EVIDENCE.json](RELEASE_EVIDENCE.json) records 21 passing checks against `https://pactshift.web.app`. The current automated suite has 46 passing tests. Hosted desktop swap and the 390px mobile creation/Vertex/share/deferral/revisit journey were also verified; no horizontal overflow was observed in visited mobile views. Existing-owner mobile login showed the invalid-password error, opened the correct private workspace after successful login, and retained the session on refresh. The closed mobile navigation's accessibility state was checked after its fix. These are targeted checks, not an all-browser or comprehensive accessibility certification. [JUDGE_REVIEW.md](JUDGE_REVIEW.md) distinguishes the evidence and remaining limits.

The [3:21 public demonstration](https://youtu.be/BF9QX1_Pppg) shows the core scope exchange using fictional data, disclosed AI narration, and 63 captions. Publication, public playback, and unauthenticated oEmbed access are verified; see [VIDEO_METADATA.md](VIDEO_METADATA.md).

When reporting a problem, include the route without any private offer token, browser, viewport, expected outcome, actual outcome, and a fictional-data reproduction. Keep passwords, recovery codes, cookies, and real client content out of reports and screenshots. Follow [SECURITY.md](../SECURITY.md) for sensitive findings.

# Security policy and trust boundaries

Pactshift is an early production release maintained by **Shivam Gupta**. This document describes implemented controls and their limits. It is not a certification, legal opinion, or guarantee of security.

## Reporting a vulnerability

Use GitHub's **Report a vulnerability** option in this repository's Security tab if private reporting is available. If it is not available, open an issue containing only a request for a private reporting channel and a general category. Do not post working exploits, private client links, credentials, account information, or project content publicly.

Include the affected release or commit, a minimal reproduction using your own isolated workspace, expected versus actual behavior, and impact. Avoid accessing another person's data, destructive testing, automated load against the live service, or attempts to obtain cloud credentials. Local reproduction is preferred. No paid bounty or response-time SLA is promised.

The current release is the supported version. There is no independently maintained long-term support branch.

## What the application protects

| Boundary | Control | Important limit |
| --- | --- | --- |
| Account access | bcrypt password hashing; random session tokens stored through hashed lookup; host-only `__session` cookie with Secure, HttpOnly, SameSite=Lax, and Path=/ in production. | No MFA, email verification, or enterprise SSO. |
| Recovery | One-time displayed random recovery code; stored hash; successful recovery rotates the code and invalidates prior sessions. | Losing both password and recovery code has no self-service email reset path. |
| Workspace isolation | Server-side owner checks on private routes and project lookup within the owner's workspace. | One owner per workspace; no team roles or delegated access. |
| Browser mutation | Exact trusted origin and authenticated CSRF token checks; strict schema validation. | A stolen authenticated session or compromised owner's device remains a serious risk. |
| Client decision | High-entropy expiring/revocable capability plus acknowledgement; current-version and state checks. | Anyone holding the link can act. Entered names are not independently verified. |
| Financial state | Server price arithmetic, bounded integers, transactionally checked scope changes. | The agency's input estimates and commercial authority remain its responsibility. |
| Concurrent changes | Native Firestore transaction with version checks and idempotent same-choice acceptance. | The workspace is a bounded contention unit, not an unlimited event store. |
| Audit evidence | SHA-256-linked records and historical snapshots, with export. | A privileged actor could rewrite an entire chain; no independent timestamp anchor or notarization. |
| Model output | Structured parsing, exact-source citation validation, deadline, labeled fallback. | Grounded quotations do not prove the interpretation is correct. |
| Subscription events | Stripe raw-body signatures, saved-customer matching, replay and ordering checks. | Current live checkout is unconfigured. Provider activation/testing is separate. |

## Capability links and public data

Client links expose only the relevant offer and its necessary project context, including the agreed price, date, request, and proposed exchange. They exclude internal cost rates, unrelated requests, account credentials, and the private audit trail. Owner bootstrap contains the link for sharing; exported workspace records remove it.

Treat a client URL like a secret. It may appear in browser history, screenshots, messages, or infrastructure request paths. Forwarding it grants its recipient the same capability. Revoke exposed undecided links and issue a fresh one after review. The app does not claim to prove the legal identity of the person entering a name.

## AI and untrusted content

Project scope and client messages are untrusted data. The model is instructed to analyze them, not obey embedded instructions. Model output never calls tools, applies a decision, chooses a commercial fee, or gains access to credentials.

The API validates every cited source and quoted substring; unsupported output falls back to rules. A human reviews estimates and options before sharing. There is no claim of legal contract interpretation, calibrated model confidence, or automated decision authority.

When Vertex is enabled, relevant scope boundaries, deliverables, request text, and the owner's estimate are sent to Google. Internal cost rates and user credentials are omitted. Remove unrelated sensitive information from input. The interface identifies the actual analysis engine used.

## Cloud and data operations

The canonical browser origin is `https://pactshift.web.app`. Firebase Hosting serves static application assets and rewrites `/api/**` to Cloud Run. Production sessions use `__session` because Firebase Hosting forwards that specially named cookie to the backend. The cookie has no Domain attribute; CSRF and exact-origin validation remain required. API responses use `Cache-Control: no-store`, including authenticated data and public offer responses. Static security headers are also configured in `firebase.json`. [Firebase cookie behavior](https://firebase.google.com/docs/hosting/manage-cache#using_cookies)

The current service uses a dedicated runtime identity and a named Firestore database in a shared Google Cloud project. Database access uses a scoped IAM condition; cloud administrators and deployment maintainers remain trusted. The browser never receives a Firestore service credential.

Expiry is checked at authorization time, independently of asynchronous TTL cleanup. Account deletion removes active app records; provider logs and PITR versions follow their retention windows. PITR is enabled, but no complete restore drill or disaster-recovery SLA is claimed. See [the operations runbook](docs/OPERATIONS.md).

Resource, object, and rate limits reduce accidental overload and abuse. They are not a DDoS guarantee. Exported data and recovery codes are the owner's responsibility to store securely. Local JSON persistence is single-process development storage and is rejected by production startup.

## Verification and known limits

The automated suite covers account recovery/session invalidation, isolation, CSRF/origin rejection, capability expiry/revocation, tampered fees, invalid swaps, concurrent decisions, stale/repeated approvals, audit/citation tampering, AI fallback, and signed billing events. A native Firestore smoke exercises the actual adapter independently of the local HTTP suite. These checks are useful evidence, not a penetration test or a certification.

The current operator-reported result is 46 passing tests, a passing build, and a dependency audit with zero reported vulnerabilities. All 21 hosted checks passed against the Firebase origin, including secure sessions, foreign-origin rejection, workspace isolation, and recovery invalidation. Desktop and mobile product journeys were also verified. Mobile existing-owner login rejected an invalid password, loaded the correct private workspace with valid credentials, and retained the session on refresh. The closed mobile navigation was checked in the accessibility tree after its fix. These bounded checks are not a comprehensive accessibility or security audit. [Hosted evidence](docs/RELEASE_EVIDENCE.json)

The project makes no SOC 2, GDPR certification, PCI scope certification, certified-signature, high-availability, or independent audit claim. Stripe-hosted card entry keeps card details out of the app when billing is configured, but does not by itself certify the whole business.

Do not add secrets, customer records, exported real workspaces, client capability links, or recovery codes to source control. Use synthetic fixtures in tests and documentation. Report material security changes with their threat, mitigation, remaining limits, and relevant validation.

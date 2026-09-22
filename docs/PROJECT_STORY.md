## Inspiration

“Can we also have the website in Spanish?”

A reasonable request can put a small agency in a difficult position. Say yes and absorb the work. Ask for more money and risk an awkward conversation. Meanwhile, the original delivery plan stays unchanged.

We saw a better question: what matters most to the client now, and what can change to make room? Perhaps the Spanish pages matter more than the resource library planned for launch. Pactshift makes that trade visible, gives both sides a clear choice, and carries the decision into the project.

This is an established negotiation practice, reflected in [Upwork's guidance on scope changes](https://www.upwork.com/mc/documents/caf2f4f2e8dab00fc04b3408465eedb3). Our contribution is turning the conversation into a reliable workflow for small web and design agencies.

## What it does

An agency records the agreed budget, delivery date, and deliverables. When a new request arrives, Pactshift compares it with that scope. The owner reviews the evidence, confirms the effort, and offers practical choices through a private client link.

Our fictional demonstration starts with a $12,000 website and 96 estimated hours. The client wants 12 hours of Spanish-language pages and will supply approved translations. They can:

- Add the pages for $1,500 and two additional calendar days.
- Exchange the unstarted 16-hour resource library for the pages, keeping the budget and delivery date.
- Save the request for later and keep the existing agreement.

The client needs no account. When they choose the exchange, Pactshift creates version two of the agreement. The library moves out, the pages move in, and total estimated scope falls from 96 to 92 hours. The client receives a decision receipt; the agency sees the updated scope and its history. Four hours remain available within the plan. That is a capacity calculation, not a revenue claim.

## How we built it

Pactshift was built by Shivam Gupta, founder and project owner, with substantial AI assistance for development, research, testing support, and documentation. The demo narration is AI-generated.

We built Pactshift with React, TypeScript, Vite, and Express. Firebase Hosting serves the interface, Google Cloud Run runs the API, and Firestore persists the agreements. A local storage adapter makes the project reproducible without cloud credentials.

The agreement engine is the core. It calculates fees on the server, checks which work is eligible for exchange, and commits the decision and new baseline together in a transaction. Old proposals cannot silently overwrite a newer agreement, and repeated acceptance cannot add the same work twice.

Vertex AI Gemini helps explain a request using citations checked against the saved scope. A labeled rules engine provides a fallback. The owner confirms the estimate and terms; AI cannot approve a change or set the commercial price.

Owner authentication, workspace isolation, CSRF protection, expiring revocable client links, and a linked audit history support the workflow. The client view excludes internal costs. Records can be exported, and previous agreement versions preserve their original budget and date.

## Challenges we ran into

The hardest problem was keeping an agreement coherent when people act at different times. Two proposals may reference the same scope. A client may reopen an old link or press confirm twice. Work offered in an exchange may already have started. We addressed these cases with version checks, eligibility rules, and atomic decisions.

We also corrected historical views so a later schedule change cannot rewrite an earlier agreement's date. This detail matters when the record is what both sides rely on.

Commercially, the challenge was finding a useful position among existing scope-management tools. We focused on the exchange itself and the resulting delivery plan: a concrete reason to use the product beyond reading an AI answer.

## Accomplishments that we're proud of

Pactshift completes the loop from client request to reviewed choices, recorded decision, and changed project scope. The swap is real application state, not a screen prepared for a pitch.

We have verified the hosted desktop swap from client choice to updated agreement, and a mobile journey through project creation, live Vertex analysis, sharing, deferral, and revisiting the request. The project passes 46 automated tests and 21 hosted release checks. The public repository includes architecture, setup instructions, security boundaries, and the commercial model.

We are also proud of the restraint in the product: clients see the decision they need to make, while the application handles the agreement rules behind it.

## What we learned

The useful moment is when both parties understand the trade and the project follows their choice. Identifying extra scope is only the beginning.

We learned to separate helpful AI suggestions from decisions involving price and commitments. We also learned to distinguish proposed fees, approved work, collected revenue, and preserved capacity. Clear language is part of a trustworthy product.

## What's next for Pactshift

Our next milestone is real repeat use: agency owners bringing a live project, resolving a client change, and returning for a second request. We will measure whether clients understand the choices and whether owners find enough value to continue paying.

The proposed model is a free entry tier, $29/month for Studio, and $79/month for Agency, with defined project and analysis allowances. Clients need no paid seats, and Pactshift takes no percentage of approved agency work. Paid checkout awaits merchant activation. We have no verified customers or revenue yet.

After validation, we plan to improve scope setup and connect with the project tools agencies already use. The aim is a small, dependable product that helps good client relationships survive changing priorities.

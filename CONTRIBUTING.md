# Contributing to Pactshift

Pactshift is a focused tool for agreeing to changes in client work. Keep contributions tied to a complete user workflow and an explicit state invariant. A new screen is not complete until its error paths, persistence, and authorization are coherent.

## Local setup

Use Node.js 22 and npm:

```bash
npm ci
npm run dev
```

The interface runs on port 5173 and proxies the API on 8080. Local development uses `.data/pactshift.json` and a rules engine without external credentials. Do not use the production database for routine development. [.env.example](.env.example) lists environment variables; it is not loaded automatically.

Before proposing a change:

```bash
npm run typecheck
npm test
npm run build
```

The CI workflow also checks dependency audit results. Review findings rather than automatically replacing packages without compatibility checks. Do not commit `node_modules`, compiled output, temporary render files, local data, or credentials.

## Code organization

- `shared/types.ts` is the shared public model. Update API, client, tests, and docs together when it changes.
- `server/domain.ts` owns prices, decisions, eligibility, snapshots, and audit history.
- `server/app.ts` owns HTTP validation, authentication, authorization, quotas, and provider integration.
- `server/store.ts` owns commit/rollback behavior. Production decisions must use a transaction.
- `server/analysis.ts` owns advisory model validation and fallback, never commercial authority.
- `client/src` owns presentation and interaction; browser checks do not replace server checks.
- `tests` contains behavior checks with synthetic, isolated data.
- `scripts/artifacts` reproduces submission documents; update their factual inputs when product claims change.

## Invariants worth preserving

Changes to agreement behavior need meaningful tests. Cover invalid transitions and rollback, not only the happy path. In particular:

1. A foreign project ID must never cross the workspace boundary.
2. A client cannot supply a trusted price or apply an old baseline.
3. A swap must have unique eligible items and sufficient estimated capacity.
4. Started/completed work does not move backward to become exchangeable.
5. A repeated decision does not duplicate a deliverable or fee.
6. Baseline and receipt dates remain historical after later changes.
7. Model failure cannot break a reviewed client's decision path.
8. Reaching a limit fails explicitly without losing prior data.
9. Shared proposals require revocation and review before changes are reissued.

For a reversible copy or styling change, prefer direct visual inspection over a test that merely repeats the implementation. For workflow or financial changes, add tests that would have caught the actual failure. Browser checks should include a fresh real account, not only the pre-seeded demo.

## Product language and claims

Use “estimated hours,” “approved additional fee,” and “recorded decision” precisely. A swap is capacity allocation, not revenue. A client approval is not a payment. A linked hash history is not an independently notarized or tamper-proof ledger.

Disclose the actual engine and provider configuration. Do not market unavailable billing, unlimited usage, team roles, or verified signatures. Project allowances count stored projects, including archived records, and coexist with the 720,000-byte workspace bound.

Keep fictional data labeled. Customer quotes, names, logos, and outcome claims need permission and evidence. See [MARKET.md](docs/MARKET.md) and [VALIDATION_PLAYBOOK.md](docs/VALIDATION_PLAYBOOK.md).

## Pull requests and commit history

Describe the concrete problem, the resulting behavior, and relevant verification. Include a before/after screenshot for a material UI change, with no private data. Mention schema compatibility and deployment effects when relevant. Link the issue if one exists; avoid inventing one purely for appearances.

Use authentic authorship and commit messages. Do not backdate commits, fabricate collaboration, or attribute manual work to someone who did not do it. Credit **Shivam Gupta** as founder and project owner, and describe AI coding assistance accurately where relevant. AI-generated contributions must still be reviewed against the same invariants and evidence standards.

Sensitive findings belong in the process described by [SECURITY.md](SECURITY.md), not a public reproduction containing live secrets. Application code and documentation are provided under the [MIT License](LICENSE); no separate contributor license agreement is currently required. Preserve third-party notices and check license compatibility before incorporating third-party code.

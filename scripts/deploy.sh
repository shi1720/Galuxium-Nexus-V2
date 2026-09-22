#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project="${PACTSHIFT_GCP_PROJECT:-gen-lang-client-0444960702}"
region="us-central1"
origin="https://pactshift.web.app"
source_commit="$(git rev-parse HEAD)"
if [[ -n "$(git status --porcelain --untracked-files=normal)" ]]; then
  printf 'Commit the intended release before deploying so its source is reproducible.\n' >&2
  exit 1
fi
npm ci
npm test
npm run build
npm audit --audit-level=moderate
gcloud run deploy pactshift --source . --project="$project" --region="$region" \
  --service-account="pactshift-runtime@$project.iam.gserviceaccount.com" \
  --min-instances=0 --max-instances=2 --concurrency=40 --memory=512Mi --cpu=1 --timeout=60 \
  --update-labels="source-commit=$source_commit" \
  --update-env-vars="APP_ORIGIN=$origin" --quiet
npx --yes firebase-tools@15.30.2 deploy --only hosting:pactshift --project="$project" --non-interactive
node scripts/live-smoke.mjs "$origin"
printf 'Pactshift deployed and verified at %s\n' "$origin"

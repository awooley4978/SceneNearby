#!/bin/bash
# Deploy Scene Nearby API to Fly.io.
# Requires: FLY_API_TOKEN (owner-provided via Secrets/card) in the environment.
# Reads all other values from this machine's existing environment so nothing
# extra is needed from the owner.
set -euo pipefail
cd "$(dirname "$0")"

: "${FLY_API_TOKEN:?FLY_API_TOKEN is required (owner provides it)}"

# Bridge the machine's R2_Account_ID casing to the canonical R2_ACCOUNT_ID the app
# reads (the machine's profile exports R2_Account_ID; start.sh does the same).
export R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-${R2_Account_ID:-}}"

echo "== installing flyctl =="
if ! command -v flyctl >/dev/null 2>&1; then
  curl -sL https://fly.io/install.sh | FLYCTL_INSTALL=/usr/local sh >/dev/null 2>&1
fi
export PATH="$PATH:/usr/local/bin"

echo "== auth =="
flyctl auth whoami >/dev/null 2>&1 || { echo "auth failed"; exit 1; }

echo "== secrets (values come from this machine's env) =="
flyctl secrets set \
  "TEAM_DB_URL=${TEAM_DB_URL}" \
  "TEAM_DB_AUTH_TOKEN=${TEAM_DB_AUTH_TOKEN}" \
  "R2_ACCOUNT_ID=${R2_ACCOUNT_ID}" \
  "R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}" \
  "R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}" \
  ${RESEND_API_KEY:+"RESEND_API_KEY=${RESEND_API_KEY}"} \
  ${NOTIFICATION_EMAIL_FROM:+"NOTIFICATION_EMAIL_FROM=${NOTIFICATION_EMAIL_FROM}"} \
  ${NOTIFICATION_EMAIL_TO:+"NOTIFICATION_EMAIL_TO=${NOTIFICATION_EMAIL_TO}"} \
  ${GOOGLE_PLACES_API_KEY:+"GOOGLE_PLACES_API_KEY=${GOOGLE_PLACES_API_KEY}"} \
  ${FIREBASE_SERVICE_ACCOUNT:+"FIREBASE_SERVICE_ACCOUNT=${FIREBASE_SERVICE_ACCOUNT}"} \
  ${APPSTORE_KEY_ID:+"APPSTORE_KEY_ID=${APPSTORE_KEY_ID}"} \
  ${APPSTORE_ISSUER_ID:+"APPSTORE_ISSUER_ID=${APPSTORE_ISSUER_ID}"} \
  ${APPSTORE_PRIVATE_KEY:+"APPSTORE_PRIVATE_KEY=${APPSTORE_PRIVATE_KEY}"} \
  --app scene-nearby-api

echo "== deploy =="
flyctl deploy --remote-only --app scene-nearby-api --config fly.toml

echo "== health =="
sleep 8
curl -s -m 10 https://scene-nearby-api.fly.dev/health; echo
echo "DONE"

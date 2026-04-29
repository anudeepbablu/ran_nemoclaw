#!/usr/bin/env sh
# Bootstrap the RAN Drift Guard demo sandbox in OpenShell.
#
# Prerequisites:
#   - openshell on PATH (run scripts/openshell-install.sh first)
#   - .env contains NVIDIA_API_KEY
#   - Docker daemon running

set -eu

HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"

if ! command -v openshell >/dev/null 2>&1; then
  echo "openshell is not on PATH. Run scripts/openshell-install.sh first." >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.example to .env and set NVIDIA_API_KEY." >&2
  exit 1
fi

set -a
. ./.env
set +a

if [ -z "${NVIDIA_API_KEY:-}" ]; then
  echo "NVIDIA_API_KEY is not set in .env." >&2
  exit 1
fi

PROVIDER_NAME="${OPENSHELL_PROVIDER_NAME:-nvidia-build}"
SANDBOX_NAME="${OPENSHELL_SANDBOX_NAME:-ran-drift-demo}"
MODEL="${OPENSHELL_INFERENCE_MODEL:-nvidia/nemotron-3-super-120b-a12b}"
POLICY_FILE="$HERE/policies/ran-drift-demo.yaml"

echo "[1/4] Creating provider '$PROVIDER_NAME' (type=nvidia, picks up NVIDIA_API_KEY from env)…"
openshell provider create \
  --name "$PROVIDER_NAME" \
  --type nvidia \
  --from-existing \
  || echo "  provider already exists; continuing"

echo "[2/4] Creating sandbox '$SANDBOX_NAME' from openclaw, mounting workdir…"
openshell sandbox create \
  --name "$SANDBOX_NAME" \
  --from openclaw \
  --upload "$HERE":/workspace \
  || echo "  sandbox already exists; continuing"

echo "[3/4] Applying policy from $POLICY_FILE…"
openshell policy set "$SANDBOX_NAME" \
  --policy "$POLICY_FILE" \
  --wait \
  --timeout 60

echo "[4/4] Routing inference through provider '$PROVIDER_NAME' (model=$MODEL)…"
openshell inference set \
  --provider "$PROVIDER_NAME" \
  --model "$MODEL" \
  || echo "  inference route may already be set; check with: openshell inference"

cat <<POST_BOOTSTRAP

Sandbox is ready.
  Name:     $SANDBOX_NAME
  Provider: $PROVIDER_NAME
  Model:    $MODEL
  Policy:   $POLICY_FILE

Verify with:
  openshell sandbox list
  openshell policy get $SANDBOX_NAME

Run the bridge + UI:
  npm run dev

Smoke-test the agent runner inside the sandbox:
  openshell sandbox exec --name $SANDBOX_NAME -- node /workspace/server/agent/runner.mjs --scenario power-drift

POST_BOOTSTRAP

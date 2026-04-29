#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.example to .env and set NVIDIA_API_KEY." >&2
  exit 1
fi

set -a
. ./.env
set +a

if [ -z "${NVIDIA_API_KEY:-}" ]; then
  echo "Missing NVIDIA_API_KEY in .env." >&2
  exit 1
fi

if ! command -v nemoclaw >/dev/null 2>&1; then
  echo "nemoclaw is not installed. Run scripts/nemoclaw-install.sh first." >&2
  exit 1
fi

export NEMOCLAW_PROVIDER="${NEMOCLAW_PROVIDER:-nvidia}"
export NEMOCLAW_MODEL="${NEMOCLAW_MODEL:-nvidia/nemotron-3-super-120b-a12b}"
export NEMOCLAW_POLICY_TIER="${NEMOCLAW_POLICY_TIER:-restricted}"
export NEMOCLAW_ACCEPT_THIRD_PARTY_SOFTWARE=1

nemoclaw onboard --non-interactive --yes-i-accept-third-party-software

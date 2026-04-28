#!/usr/bin/env sh
set -eu

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI is required before installing NemoClaw." >&2
  exit 1
fi

if ! docker version >/dev/null 2>&1; then
  echo "Docker daemon is not reachable. Start Colima or Docker Desktop first." >&2
  exit 1
fi

curl -fsSL https://www.nvidia.com/nemoclaw.sh | bash

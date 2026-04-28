#!/usr/bin/env sh
set -eu

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

sandbox="${NEMOCLAW_SANDBOX:-ran-drift-demo}"

nemoclaw list
nemoclaw "$sandbox" status

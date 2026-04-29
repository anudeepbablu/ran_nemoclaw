#!/usr/bin/env sh
set -eu

node server/liveBridge.js &
bridge_pid="$!"

cleanup() {
  kill "$bridge_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

vite --host 0.0.0.0

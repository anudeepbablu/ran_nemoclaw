#!/usr/bin/env sh
# Install the official OpenShell CLI from NVIDIA's GitHub releases.
#
# Defaults to ~/.local/bin (override with OPENSHELL_INSTALL_DIR).
# After install, ensure ~/.local/bin is on your PATH.
#
# Source: https://github.com/NVIDIA/OpenShell

set -eu

if command -v openshell >/dev/null 2>&1; then
  echo "openshell already installed: $(openshell --version 2>/dev/null || echo 'version unknown')"
  echo "Re-run this script to reinstall (it will overwrite the binary)."
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI is required by OpenShell (gateway runs in a container)." >&2
  echo "On macOS:  brew install docker colima && colima start --cpu 4 --memory 8" >&2
  exit 1
fi

if ! docker version >/dev/null 2>&1; then
  echo "Docker daemon is not reachable. Start Colima or Docker Desktop, then retry." >&2
  exit 1
fi

curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh | sh

cat <<'POST_INSTALL'

OpenShell installed. Next steps:
  1. Ensure ~/.local/bin is on your PATH (the installer prints the right line for your shell).
  2. Set NVIDIA_API_KEY in .env (copy from .env.example if needed).
  3. Run: sh scripts/openshell-bootstrap.sh

POST_INSTALL

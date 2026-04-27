#!/usr/bin/env sh
set -eu

docker build -t ran-nemoclaw-dev .

docker run --rm \
  -v "$PWD":/workspace \
  -v ran_nemoclaw_node_modules:/workspace/node_modules \
  ran-nemoclaw-dev \
  sh -lc "npm install && npm test && npm run build"

#!/usr/bin/env sh
set -eu

docker build -t ran-nemoclaw-dev .

docker run --rm -it \
  -p 5173:5173 \
  -v "$PWD":/workspace \
  -v ran_nemoclaw_node_modules:/workspace/node_modules \
  ran-nemoclaw-dev \
  sh -lc "npm install && npm run dev:ui -- --host 0.0.0.0"

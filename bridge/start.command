#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v java >/dev/null 2>&1; then
  echo "Java is required. Install a current Java runtime, then open this file again."
  read -r -p "Press Return to close..."
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node.js 20 or newer, then open this file again."
  read -r -p "Press Return to close..."
  exit 1
fi
node server/server.mjs

#!/bin/sh
# Controlli da eseguire prima di pubblicare.
set -e
cd "$(dirname "$0")/.."
node --check data.js && node --check app.js && node --check sw.js
python3 tools/check-offline.py

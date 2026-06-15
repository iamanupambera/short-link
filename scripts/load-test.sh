#!/bin/sh
# This script runs a load test using autocannon via npx.
# Make sure the application is running and the target shortCode exists before running.

TARGET_URL=${API_URL:-"http://localhost:3000"}
SHORT_CODE="abc123"

echo "=============================================="
echo "ShortLink Redirection Load Test"
echo "Target: $TARGET_URL/$SHORT_CODE"
echo "Duration: 10 seconds"
echo "Connections: 50"
echo "=============================================="

npx autocannon -c 50 -d 10 "$TARGET_URL/$SHORT_CODE"

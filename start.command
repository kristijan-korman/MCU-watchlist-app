#!/bin/bash
cd "$(dirname "$0")"
echo "Starting MCU App with live reload..."
echo "Open http://localhost:8080 in your browser"
echo "Press Ctrl+C to stop"
npx browser-sync start --server --port 8080 --files "**/*.html,**/*.css,**/*.js" --no-notify

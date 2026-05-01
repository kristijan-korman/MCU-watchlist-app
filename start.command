#!/bin/bash
cd "$(dirname "$0")"
echo "Starting MCU App server..."
echo "Open http://localhost:8080 in your browser"
echo "Press Ctrl+C to stop"
open "http://localhost:8080"
python3 -m http.server 8080

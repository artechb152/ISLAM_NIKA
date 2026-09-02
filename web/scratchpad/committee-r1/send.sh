#!/bin/sh
# usage: send.sh <file-with-js> [timeout_s]
DIR="C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r1"
T=${2:-60}
rm -f "$DIR/done.txt" "$DIR/out.txt"
cp "$1" "$DIR/cmd.js"
i=0
while [ ! -f "$DIR/done.txt" ] && [ $i -lt $((T*4)) ]; do sleep 0.25; i=$((i+1)); done
cat "$DIR/out.txt" 2>/dev/null || echo "TIMEOUT waiting for driver"

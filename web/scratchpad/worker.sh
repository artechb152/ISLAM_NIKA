#!/bin/sh
# usage: worker.sh <start> <step>  — מייצר כל שוט start, start+step, ...
HF="$HOME/.higgsfield/bin/hf.exe"
NEG="No modern objects, no vehicles, no text, no letters, no watermark, no signature. Do not depict any prophet or central holy figure; no haloed, veiled or singled-out leader. No visible faces in close-up."
i=0
while IFS='|' read -r id body; do
  i=$((i+1))
  [ -z "$id" ] && continue
  case $(( (i - $1) % $2 )) in 0) ;; *) continue ;; esac
  echo "=== $id ==="
  "$HF" generate create seedance_2_0 --duration 12 --resolution 1080p --aspect_ratio 16:9 --wait --wait-timeout 30m --prompt "$body $NEG" 2>&1 | tail -1
done < scratchpad/shots.txt

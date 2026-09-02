#!/bin/sh
# usage: run.sh N  (expects cmd-N.js already written) - waits for cmd-N.out.json and prints it
D="C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r0/cmds"
N=$1
i=0
while [ ! -f "$D/cmd-$N.out.json" ]; do
  i=$((i+1))
  if [ $i -gt 400 ]; then echo TIMEOUT; exit 1; fi
  sleep 0.5
done
cat "$D/cmd-$N.out.json"

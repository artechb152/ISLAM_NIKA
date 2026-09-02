#!/bin/sh
# usage: send.sh N  (reads command JS from stdin, atomically installs cmd-N.js, waits, prints result)
D="C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r0/cmds"
N=$1
cat > "$D/cmd-$N.tmp"
mv "$D/cmd-$N.tmp" "$D/cmd-$N.js"
i=0
while [ ! -f "$D/cmd-$N.out.json" ]; do
  i=$((i+1))
  if [ $i -gt 500 ]; then echo TIMEOUT; exit 1; fi
  sleep 0.5
done
cat "$D/cmd-$N.out.json"

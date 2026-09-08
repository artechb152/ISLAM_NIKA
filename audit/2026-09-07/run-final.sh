#!/bin/zsh
export PATH="$HOME/.local/node/bin:$PATH"
A=/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07
V=/private/tmp/claude-501/-Users-nikagreenbaum/9aa07fdd-34f8-43ce-9d20-79d7f178ec6f/scratchpad/video
cd /Users/nikagreenbaum/ISLAM_NIKA/web
: > $A/logs/final.log
echo "== המבקר העצמאי: מעבר טבעי בכל התחנות · $(date +%H:%M)" >> $A/logs/final.log
echo "-- yemen-heights" >> $A/logs/final.log
node scratchpad/yemen-play.mjs 2>&1 | grep -v "ניווט" >> $A/logs/final.log
cp -f $V/play-yemen/play.webm $A/video/yemen-heights.webm 2>/dev/null
for r in night-camp border-post narrow-pass loading-road yathrib monastery; do
  echo "-- $r" >> $A/logs/final.log
  node scratchpad/play.mjs $r 2>&1 | grep -v "ניווט" >> $A/logs/final.log
  cp -f $V/play-$r/play.webm $A/video/$r.webm 2>/dev/null
done
echo "-- mecca" >> $A/logs/final.log
node scratchpad/mecca-play.mjs 2>&1 | grep -v "ניווט" >> $A/logs/final.log
cp -f $V/play-mecca/play.webm $A/video/mecca.webm 2>/dev/null
echo "== redteam · $(date +%H:%M)" >> $A/logs/final.log
node $A/scripts/redteam.mjs border-post 2>&1 | grep -v "ניווט" >> $A/logs/final.log
echo "== videos · $(date +%H:%M)" >> $A/logs/final.log
node $A/scripts/videos.mjs >> $A/logs/final.log 2>&1
echo "== viewports · $(date +%H:%M)" >> $A/logs/final.log
node $A/scripts/viewports.mjs border-post >> $A/logs/final.log 2>&1
echo "== practice · $(date +%H:%M)" >> $A/logs/final.log
node $A/scripts/practice.mjs >> $A/logs/final.log 2>&1
echo "== console/net · $(date +%H:%M)" >> $A/logs/final.log
node $A/scripts/console-net.mjs yemen-heights border-post mecca /chapter1/practice /notebook >> $A/logs/final.log 2>&1
echo "== camels · $(date +%H:%M)" >> $A/logs/final.log
for r in yemen-heights night-camp border-post narrow-pass loading-road yathrib monastery mecca exit; do
  node scratchpad/camel-real.mjs $r >> $A/logs/final.log 2>&1
done
echo "== overlaps (mesh) · $(date +%H:%M)" >> $A/logs/final.log
for r in yemen-heights night-camp border-post narrow-pass loading-road yathrib monastery mecca exit; do
  node scratchpad/real-overlap.mjs $r 2>&1 | grep -E "^==|סיכום|✗" >> $A/logs/final.log
done
echo "== sweep · $(date +%H:%M)" >> $A/logs/final.log
rm -rf scratchpad/shots/sweep-audit
node scratchpad/sweep.mjs audit yemen-heights night-camp border-post narrow-pass loading-road yathrib monastery mecca >> $A/logs/final.log 2>&1
cp -f scratchpad/shots/sweep-audit/*.png $A/shots/ 2>/dev/null
echo "== verify + build · $(date +%H:%M)" >> $A/logs/final.log
npm run verify >> $A/logs/final.log 2>&1; echo "verify=$?" >> $A/logs/final.log
NEXT_DIST_DIR=.next-verify npx next build --webpack > $A/logs/build.log 2>&1; echo "build=$?" >> $A/logs/final.log
echo "== FINAL DONE · $(date +%H:%M)" >> $A/logs/final.log

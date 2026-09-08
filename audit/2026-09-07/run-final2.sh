#!/bin/zsh
export PATH="$HOME/.local/node/bin:$PATH"
A=/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07
V=/private/tmp/claude-501/-Users-nikagreenbaum/9aa07fdd-34f8-43ce-9d20-79d7f178ec6f/scratchpad/video
cd /Users/nikagreenbaum/ISLAM_NIKA/web
: > $A/logs/final2.log
echo "== מעבר טבעי בכל התחנות · $(date +%H:%M)" >> $A/logs/final2.log
echo "-- yemen-heights" >> $A/logs/final2.log
node scratchpad/yemen-play.mjs 2>&1 | grep -v ניווט >> $A/logs/final2.log
cp -f $V/play-yemen/play.webm $A/video/yemen-heights.webm 2>/dev/null
for r in night-camp border-post narrow-pass loading-road yathrib monastery; do
  echo "-- $r" >> $A/logs/final2.log
  node scratchpad/play.mjs $r 2>&1 | grep -v ניווט >> $A/logs/final2.log
  cp -f $V/play-$r/play.webm $A/video/$r.webm 2>/dev/null
done
echo "-- mecca (עכבר)" >> $A/logs/final2.log
node scratchpad/mecca-play.mjs 2>&1 | grep -v ניווט >> $A/logs/final2.log
cp -f $V/play-mecca/play.webm $A/video/mecca-mouse.webm 2>/dev/null
echo "== F בכל תחנה שיש בה פעולה · $(date +%H:%M)" >> $A/logs/final2.log
for r in yathrib monastery border-post narrow-pass night-camp loading-road; do
  echo "-- F $r" >> $A/logs/final2.log
  node $A/scripts/play-f.mjs $r 2>&1 | grep -v ניווט >> $A/logs/final2.log
done
echo "-- F mecca" >> $A/logs/final2.log
node $A/scripts/mecca-f.mjs 2>&1 | grep -v ניווט >> $A/logs/final2.log
cp -f $V/f-mecca/play.webm $A/video/f-mecca.webm 2>/dev/null
echo "== redteam · $(date +%H:%M)" >> $A/logs/final2.log
node $A/scripts/redteam.mjs border-post 2>&1 | grep -v ניווט >> $A/logs/final2.log
echo "== practice · $(date +%H:%M)" >> $A/logs/final2.log
node $A/scripts/practice3.mjs >> $A/logs/final2.log 2>&1
echo "== outro · $(date +%H:%M)" >> $A/logs/final2.log
node $A/scripts/outro.mjs >> $A/logs/final2.log 2>&1
echo "== videos · $(date +%H:%M)" >> $A/logs/final2.log
node $A/scripts/videos.mjs >> $A/logs/final2.log 2>&1
echo "== console/net · $(date +%H:%M)" >> $A/logs/final2.log
node $A/scripts/console-net.mjs yemen-heights border-post yathrib mecca /chapter1/practice /notebook >> $A/logs/final2.log 2>&1
echo "== camels · $(date +%H:%M)" >> $A/logs/final2.log
for r in yemen-heights night-camp border-post narrow-pass loading-road yathrib monastery mecca; do
  node scratchpad/camel-real.mjs $r >> $A/logs/final2.log 2>&1
done
echo "== overlaps · $(date +%H:%M)" >> $A/logs/final2.log
for r in yemen-heights night-camp border-post narrow-pass loading-road yathrib monastery mecca; do
  node scratchpad/real-overlap.mjs $r 2>&1 | grep -E "^==|סיכום|✗" >> $A/logs/final2.log
done
echo "== viewports · $(date +%H:%M)" >> $A/logs/final2.log
node $A/scripts/viewports.mjs yathrib >> $A/logs/final2.log 2>&1
echo "== verify + build · $(date +%H:%M)" >> $A/logs/final2.log
npm run verify >> $A/logs/final2.log 2>&1; echo "verify=$?" >> $A/logs/final2.log
NEXT_DIST_DIR=.next-verify npx next build --webpack > $A/logs/build2.log 2>&1; echo "build=$?" >> $A/logs/final2.log
echo "== DONE · $(date +%H:%M)" >> $A/logs/final2.log

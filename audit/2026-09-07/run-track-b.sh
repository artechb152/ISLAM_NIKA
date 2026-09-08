#!/bin/zsh
export PATH="$HOME/.local/node/bin:$PATH"
A=/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07
V=/private/tmp/claude-501/-Users-nikagreenbaum/9aa07fdd-34f8-43ce-9d20-79d7f178ec6f/scratchpad/video
cd /Users/nikagreenbaum/ISLAM_NIKA/web
echo "== monastery שוב $(date +%H:%M)" >> $A/logs/track-b.log
node scratchpad/play.mjs monastery 2>&1 | tee $A/logs/play-monastery-2.log | grep -v "ניווט" >> $A/logs/track-b.log
cp -f $V/play-monastery/play.webm $A/video/monastery.webm 2>/dev/null
echo "== yathrib שוב $(date +%H:%M)" >> $A/logs/track-b.log
node scratchpad/play.mjs yathrib 2>&1 | tee $A/logs/play-yathrib-2.log | grep -v "ניווט" >> $A/logs/track-b.log
cp -f $V/play-yathrib/play.webm $A/video/yathrib.webm 2>/dev/null
echo "== redteam $(date +%H:%M)" >> $A/logs/track-b.log
node $A/scripts/redteam.mjs border-post 2>&1 | grep -v "ניווט" >> $A/logs/track-b.log
echo "== videos $(date +%H:%M)" >> $A/logs/track-b.log
node $A/scripts/videos.mjs >> $A/logs/track-b.log 2>&1
echo "== viewports $(date +%H:%M)" >> $A/logs/track-b.log
node $A/scripts/viewports.mjs border-post >> $A/logs/track-b.log 2>&1
echo "== practice $(date +%H:%M)" >> $A/logs/track-b.log
node $A/scripts/practice.mjs >> $A/logs/track-b.log 2>&1
echo "== console/net $(date +%H:%M)" >> $A/logs/track-b.log
node $A/scripts/console-net.mjs yemen-heights border-post mecca /chapter1/practice /notebook >> $A/logs/track-b.log 2>&1
echo "== track B done $(date +%H:%M)" >> $A/logs/track-b.log

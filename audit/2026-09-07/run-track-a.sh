#!/bin/zsh
# מסלול א: מעבר טבעי בכל התחנות, בעכבר ובמקלדת, עם הקלטה. בלי שינוי קוד.
export PATH="$HOME/.local/node/bin:$PATH"
A=/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07
V=/private/tmp/claude-501/-Users-nikagreenbaum/9aa07fdd-34f8-43ce-9d20-79d7f178ec6f/scratchpad/video
cd /Users/nikagreenbaum/ISLAM_NIKA/web
echo "== track A start $(date +%H:%M:%S)" | tee -a $A/logs/track-a.log
echo "== yemen-heights $(date +%H:%M:%S)" | tee -a $A/logs/track-a.log
node scratchpad/yemen-play.mjs 2>&1 | tee $A/logs/play-yemen-heights.log | grep -v "^$" >> $A/logs/track-a.log
cp -f $V/play-yemen/play.webm $A/video/yemen-heights.webm 2>/dev/null
for r in night-camp border-post narrow-pass loading-road yathrib monastery; do
  echo "== $r $(date +%H:%M:%S)" | tee -a $A/logs/track-a.log
  node scratchpad/play.mjs $r 2>&1 | tee $A/logs/play-$r.log | grep -v "^$" >> $A/logs/track-a.log
  cp -f $V/play-$r/play.webm $A/video/$r.webm 2>/dev/null
done
echo "== mecca $(date +%H:%M:%S)" | tee -a $A/logs/track-a.log
node scratchpad/mecca-play.mjs 2>&1 | tee $A/logs/play-mecca.log | grep -v "^$" >> $A/logs/track-a.log
cp -f $V/play-mecca/play.webm $A/video/mecca.webm 2>/dev/null
echo "== track A playthroughs done $(date +%H:%M:%S)" | tee -a $A/logs/track-a.log

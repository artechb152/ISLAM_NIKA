import fs from 'fs'
const p = 'scripts/check-slide.mjs'
let s = fs.readFileSync(p, 'utf8')
s = s.replace('if (w && r && isFinite(w) && isFinite(r)) {',
`if (w && r && isFinite(w) && isFinite(r)) {
  console.log(\`  calibration: walk \${(w * 100).toFixed(0)}% of its clip cycle, run \${(r * 100).toFixed(0)}%\`)
  if (Math.abs(w - 1) > 0.12 || Math.abs(r - 1) > 0.12) console.log('  ⚠ cycle constants are off — remeasure WALK/RUN_CYCLE_METRES')
`)
fs.writeFileSync(p, s)
console.log('patched')

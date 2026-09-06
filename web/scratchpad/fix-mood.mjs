/* מחזיר צבע לעולם. הפילטרים שירדו מתחת ל-saturate(1) בסבב הקודם
   הם שהאפירו את הגמלים ואת הסביבות; שעת היום נשמרת, הכרומה חוזרת. */
import fs from 'node:fs'
const dir = 'src/lib/chapter1'
const M = {
  'border-layout.json': {
    grade: 'saturate(1.06) contrast(1.06) brightness(1.03) hue-rotate(4deg)',
    fill: { sky: '#dbe6f2', ground: '#bda487', intensity: 1.18 },
    sun: { color: '#fff0d8' },
  },
  'camp-layout.json': {
    grade: 'saturate(1.10) contrast(1.10) brightness(0.96) hue-rotate(6deg)',
    fill: { sky: '#5d6ea8', ground: '#8a4b2a', intensity: 1.05 },
    sun: { color: '#9db4e6' },
  },
  'monastery-layout.json': {
    grade: 'saturate(1.08) contrast(1.08) brightness(0.98) hue-rotate(14deg)',
    fill: { sky: '#b6acdf', ground: '#836a5c', intensity: 1.08 },
    sun: { color: '#e2c6ee' },
  },
  'narrow-pass-layout.json': {
    grade: 'saturate(1.08) contrast(1.03) brightness(1.05)',
    fill: { sky: '#f0f1e6', ground: '#bda88c' },
  },
  'yemen-heights-layout.json': {
    grade: 'saturate(1.12) contrast(1.05) brightness(1.04) hue-rotate(-5deg)',
    fill: { sky: '#e8f0dd', ground: '#b7a47c' },
  },
  'yathrib-layout.json': { grade: 'saturate(1.14) contrast(1.04) brightness(1.02) hue-rotate(-9deg)' },
  'loading-road-layout.json': { grade: 'saturate(1.14) contrast(1.02) brightness(1.05) sepia(.05)' },
  'mecca-layout.json': { grade: 'saturate(1.16) contrast(1.09) brightness(0.99)' },
}
function indentOf(src) {
  const m = src.match(/\n(\s+)"/)
  return m ? m[1].length : 2
}
for (const [file, patch] of Object.entries(M)) {
  const p = `${dir}/${file}`
  const src = fs.readFileSync(p, 'utf8')
  const ind = indentOf(src)
  const d = JSON.parse(src)
  d.mood = d.mood || {}
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object') d.mood[k] = { ...(d.mood[k] || {}), ...v }
    else d.mood[k] = v
  }
  fs.writeFileSync(p, JSON.stringify(d, null, ind) + (src.endsWith('\n') ? '\n' : ''))
  console.log('patched', file, 'indent', ind)
}

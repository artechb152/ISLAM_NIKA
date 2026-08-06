/* Layout guard for the chapter 1 camp.
   Parses the CAMP table, the HERD patrol routes and the station's points of
   interest out of the source, then fails if any two footprints overlap, if a
   patrol route runs through a prop, or if a prop buries a point of interest.
   Run: node scripts/check-camp.mjs */

import { readFileSync } from 'node:fs'
import { radiusAt } from './measure-props.mjs'

const src = readFileSync(new URL('../src/components/chapter1/Game.tsx', import.meta.url), 'utf8')
const stations = readFileSync(new URL('../src/lib/chapter1/stations.ts', import.meta.url), 'utf8')

const layout = JSON.parse(readFileSync(new URL('../src/lib/chapter1/camp-layout.json', import.meta.url), 'utf8'))
const props = layout.props.map((p) => ({ url: 'MODEL_' + p.model.toUpperCase(), file: p.model + '.glb', x: p.x, z: p.z, h: p.h, r: p.r, role: p.role }))
const herd = layout.herd
const pois = [...stations.matchAll(/label: '([^']+)',\s*\n\s*kind: '\w+',\s*\n\s*x: (-?[\d.]+),\s*\n\s*z: (-?[\d.]+),/g)].map(
  (m) => ({ label: m[1], x: +m[2], z: +m[3] }),
)

if (props.length < 15) throw new Error(`parsed only ${props.length} props — regex out of sync with Game.tsx`)
if (herd.length === 0) throw new Error('parsed no herd routes')
if (pois.length === 0) throw new Error('parsed no points of interest')

const errors = []
const warnings = []
/* Small decor — bushes, cacti, jars — is routinely tucked right against a tent
   on purpose. Report it, but do not fail the import over it; only genuinely
   large props growing through each other is a real problem. */
const SMALL = 1.2
const CAMPFIRE = layout.campfire

/* Spacing uses each model's MEASURED footprint, not the hand-written collision
   radius — guessed radii let the elongated tent grow through its neighbours
   while every circle test still passed. Palms are the one exception: their
   crowns sit 4 m up, well clear of everything else, so only the trunk matters. */
const files = Object.fromEntries(props.map((p) => [p.url, p.file]))
const TRUNK_ONLY = new Set(['MODEL_PALM'])
for (const p of props) {
  if (TRUNK_ONLY.has(p.url)) {
    p.space = 0.9
    continue
  }
  const f = files[p.url]
  const m = f ? radiusAt(f, p.h) : null
  p.space = m ? Math.max(p.r, m.radius) : p.r
}
const all = [...props.filter((p) => p.role !== 'campfire'), { ...CAMPFIRE, url: 'CAMPFIRE', space: CAMPFIRE.r }]

/* A palm's crown is only "overhead" relative to short props. Against a 2.5 m
   tent the fronds of a short palm hang right into the canvas, so palm↔tent uses
   the full crown radius instead of the trunk. */
const crownRadius = (p) => {
  const f = files[p.url]
  const m = f ? radiusAt(f, p.h) : null
  return m ? m.radius : p.r
}

// 1. prop vs prop, using measured footprints
for (let i = 0; i < all.length; i++) {
  for (let j = i + 1; j < all.length; j++) {
    const a = all[i]
    const b = all[j]
    const d = Math.hypot(a.x - b.x, a.z - b.z)
    const palmTent =
      (a.url === 'MODEL_PALM' && b.url === 'MODEL_TENT') || (b.url === 'MODEL_PALM' && a.url === 'MODEL_TENT')
    if (palmTent) {
      const palm = a.url === 'MODEL_PALM' ? a : b
      const tent = a.url === 'MODEL_PALM' ? b : a
      const need = crownRadius(palm) + tent.space
      if (d < need) {
        errors.push(
          `דקל בתוך אוהל: ${palm.url}(${palm.x},${palm.z}) ↔ ${tent.url}(${tent.x},${tent.z}) — מרחק ${d.toFixed(2)} < ${need.toFixed(2)}`,
        )
      }
      continue
    }
    if (d < a.space + b.space) {
      const bucket = Math.min(a.space, b.space) < SMALL ? warnings : errors
      bucket.push(
        `חפיפה: ${a.url}(${a.x},${a.z}) ↔ ${b.url}(${b.x},${b.z}) — מרחק ${d.toFixed(2)} < ${(a.space + b.space).toFixed(2)}`,
      )
    }
  }
}

// 2. prop vs point of interest (a marker must stay reachable and visible)
for (const p of all) {
  for (const poi of pois) {
    const d = Math.hypot(p.x - poi.x, p.z - poi.z)
    // props that intentionally dress a marker: the scrolls, and torches that
    // are placed to light it
    if (p.url === 'MODEL_SCROLLS' || p.role === 'torch') continue
    if (d < p.r + 0.9) {
      const bucket = p.space < SMALL ? warnings : errors
      bucket.push(`נקודת עניין חסומה: ${poi.label}(${poi.x},${poi.z}) ↔ ${p.url}(${p.x},${p.z}) — מרחק ${d.toFixed(2)}`)
    }
  }
}

// 3. patrol routes vs props
for (const h of herd) {
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 90) {
    const x = h.cx + Math.cos(a) * h.rx
    const z = h.cz + Math.sin(a) * h.rz
    for (const p of all) {
      const d = Math.hypot(x - p.x, z - p.z)
      if (d < p.r + 1.5) {
        const bucket = p.space < SMALL ? warnings : errors
        bucket.push(`מסלול גמל (${h.cx},${h.cz}) חוצה את ${p.url}(${p.x},${p.z}) — מרחק ${d.toFixed(2)}`)
        a = Math.PI * 2
        break
      }
    }
  }
}

const unique = (a) => [...new Set(a)]
if (warnings.length) {
  console.warn(`\n⚠ ${unique(warnings).length} התראות — פרופים קטנים צמודים למשהו (לא חוסם):\n`)
  for (const w of unique(warnings).slice(0, 8)) console.warn('  • ' + w)
  if (unique(warnings).length > 8) console.warn(`  … ועוד ${unique(warnings).length - 8}`)
}
if (errors.length) {
  console.error(`\n✗ פריסת המחנה — ${unique(errors).length} בעיות:\n`)
  for (const e of unique(errors)) console.error('  • ' + e)
  process.exit(1)
}
console.log(
  `✓ פריסת המחנה תקינה: ${props.length} מודלים, ${herd.length} מסלולי גמלים, ${pois.length} נקודות עניין — אין חפיפות משמעותיות.`,
)

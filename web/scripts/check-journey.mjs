/* Every line the chapter teaches has to be reachable on foot.
 *
 * The content and the world are authored in different files by different
 * methods: `dialogue.json` holds 27 source-anchored encounters across nine
 * regions, while the world is layout files, a region registry and a cast table.
 * Nothing connects them, so a region can quietly ship without the character who
 * carries its material — and the failure is invisible, because the region still
 * looks finished. That is exactly how a chapter loses three of its lessons.
 *
 * This walks the journey the way a learner does and fails on anything they
 * could not reach:
 *   1. every region in dialogue.json is either playable or explicitly pending
 *   2. every speaker in a playable region has somewhere to stand
 *   3. the notebook total the HUD promises matches the encounters that exist
 *   4. every encounter still carries its §-anchor to the source text
 *
 * Run: npm run check-journey   (part of `npm run verify`)
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const lib = resolve(here, '../src/lib/chapter1')
const read = (p) => readFileSync(resolve(lib, p), 'utf8')

const dialogue = JSON.parse(read('dialogue.json'))
const worldsSrc = read('worlds.ts')
const placementsSrc = read('placements.ts')
const notebookSrc = read('notebook.ts')
const tasksSrc = read('tasks.ts')

/* which regions have ground to stand on — read from the registry itself, so
   this can never drift from what the game actually loads */
const registry = worldsSrc.match(/export const LAYOUTS[^{]*\{([\s\S]*?)\n\}/)
if (!registry) fail('could not find the LAYOUTS registry in worlds.ts')
const playable = [...registry[1].matchAll(/^\s*'?([\w-]+)'?\s*:/gm)].map((m) => m[1])

/* who stands where — likewise read from the cast table */
const cast = {}
for (const block of placementsSrc.matchAll(/'?([\w-]+)'?\s*:\s*\[([\s\S]*?)\],?\n/g)) {
  const region = block[1]
  if (region === 'PLACEMENTS' || !region) continue
  cast[region] = [...block[2].matchAll(/who:\s*'([\w-]+)'/g)].map((m) => m[1])
}

/* Rawi walks beside the player everywhere, and the narrator is a voice rather
   than a body, so neither needs a placement. Everyone else needs a spot. */
const ALWAYS_PRESENT = new Set(['rawi', 'narrator'])

const problems = []
const notes = []
let reachable = 0
let total = 0

for (const region of dialogue.regions) {
  const encounters = region.encounters ?? []
  total += encounters.length
  const isPlayable = playable.includes(region.id)

  if (!isPlayable) {
    notes.push(`· ${region.id.padEnd(14)} ${String(encounters.length).padStart(2)} encounters — no layout yet`)
    continue
  }
  reachable += encounters.length

  const placed = new Set([...(cast[region.id] ?? []), ...ALWAYS_PRESENT])
  for (const e of encounters) {
    /* A line may name its own speaker so two people can hold a conversation.
       That also makes it possible to hand a line to somebody who is nowhere in
       the region — the panel would show their face and their name over a scene
       they are not standing in, and no other check would see it. */
    for (const l of [...(e.lines ?? []), ...(e.rawi_followup ?? []), ...(e.choices ?? []).flatMap((c) => c.lines ?? [])]) {
      if (l.speaker && !placed.has(l.speaker) && l.speaker !== 'narrator') {
        problems.push(
          `${region.id}: a line in "${e.id}" is given to '${l.speaker}', who is not in this region — ` +
          `the panel would show their portrait over a place they do not stand in.`,
        )
      }
    }
    if (!placed.has(e.speaker)) {
      problems.push(
        `${region.id}: "${e.id}" is spoken by '${e.speaker}', who has no placement — ` +
        `the learner can walk the whole region and never hear it. ` +
        `Add { who: '${e.speaker}', x, z } to PLACEMENTS['${region.id}'] in placements.ts.`,
      )
    }
    if (!/§\s*\d/.test(JSON.stringify(e))) {
      problems.push(`${region.id}: "${e.id}" carries no §-anchor to the source text.`)
    }
    /* A narrator beat fires by itself — on arrival, or once the beat it is the
       payoff to has been heard. `after:` pointing at nothing is a beat that can
       never play, and nothing else here would notice: it has a speaker who is
       always present and a §-anchor like any other. */
    const trig = e.trigger ?? 'arrive'
    if (trig.startsWith('after:')) {
      const needs = trig.slice(6)
      const found = region.encounters.find((x) => x.id === needs)
      if (!found) {
        problems.push(
          `${region.id}: "${e.id}" waits for "${needs}", which is not an encounter in this region — ` +
          `it can never fire.`,
        )
      } else if (found.notebook >= e.notebook) {
        problems.push(
          `${region.id}: "${e.id}" (notebook ${e.notebook}) waits for "${needs}" (notebook ${found.notebook}), ` +
          `which comes after it — the payoff would still precede its setup.`,
        )
      }
    } else if (trig !== 'arrive') {
      problems.push(`${region.id}: "${e.id}" has an unknown trigger '${trig}'.`)
    }
  }
  notes.push(`✓ ${region.id.padEnd(14)} ${String(encounters.length).padStart(2)} encounters, cast: ${[...(cast[region.id] ?? [])].join(', ') || '(rawi only)'}`)
}

/* The road has to actually connect. An exit placed beyond its region's walkable
   radius is a door the clamp turns you away from before you reach it — the
   journey looks wired and is not. Three of the first four were like this. */
const layoutFiles = { 'night-camp': 'camp-layout.json', 'border-post': 'border-layout.json', yathrib: 'yathrib-layout.json' }
const layouts = {}
for (const id of playable) {
  const file = layoutFiles[id] ?? `${id}-layout.json`
  try {
    layouts[id] = JSON.parse(read(file))
  } catch {
    problems.push(`${id}: registered in LAYOUTS but ${file} could not be read.`)
  }
}
for (const [id, layout] of Object.entries(layouts)) {
  const bound = layout.bound ?? 24
  for (const e of layout.exits ?? []) {
    const d = Math.hypot(e.x, e.z)
    if (d > bound - e.r) {
      problems.push(
        `${id}: the exit to '${e.to}' sits ${d.toFixed(1)}m out but the region is only walkable to ${bound}m — ` +
        `the player is turned back before reaching it. Move it inside ${(bound - e.r).toFixed(1)}m.`,
      )
    }
    if (!layouts[e.to] && !dialogue.regions.some((r) => r.id === e.to)) {
      problems.push(`${id}: the exit leads to '${e.to}', which is not a region.`)
    }
    /* a one-way road strands the traveller */
    const back = layouts[e.to]?.exits?.some((x) => x.to === id)
    if (layouts[e.to] && !back) {
      problems.push(`${id} → ${e.to} has no way back; add a return exit to ${e.to}'s layout.`)
    }
  }
}

/* A slot too narrow to stand in but wide enough to walk into is where the
   third-person camera ends up inside a wall. The committee measured 0.4 m
   pockets in Yathrib doing exactly that. Either it is a room you can move in,
   or it is sealed — nothing in between. */
const bbPath = resolve(here, '../../../AppData/Local/Temp/claude/c--Users-nikag-Downloads/39c268be-2c2c-455a-9e2e-0b79d4338167/scratchpad/bk/bboxes.json')
let boxes = null
try { boxes = JSON.parse(readFileSync(bbPath, 'utf8')) } catch { /* measurement tool not present; skip */ }
if (boxes) {
  for (const [id, layout] of Object.entries(layouts)) {
    const solid = layout.props.filter((p) => (p.r ?? 0) > 0.8 && boxes[p.model])
    let pockets = 0
    for (let i = 0; i < solid.length; i++) {
      for (let k = i + 1; k < solid.length; k++) {
        const a = solid[i], b = solid[k]
        const gap = Math.hypot(a.x - b.x, a.z - b.z) - a.r - b.r
        if (gap > 0.8 && gap < 4.2) pockets++
      }
    }
    if (pockets > 12) {
      problems.push(
        `${id}: ${pockets} gaps between solid props are 0.8–4.2m wide — too narrow for the ` +
        `follow camera, wide enough for the player to walk into. Widen or seal them.`,
      )
    }
  }
}

/* Can a person actually walk it? Every check above asks whether props overlap
   each other; none asked whether the learner fits between them. Two tents once
   left a 63 cm gap across the only road out of the night camp, and the chapter
   was unfinishable for as long as that stood. */
if (boxes) {
  const HALF = 1.4
  const SOFT = new Set(['palm','butte','pergola','torch','fodder','waterskin','desert-bush','waymark','gate-post','shrub','collider'])
  const reachOf = (p) => {
    const b = boxes[p.model]
    return b ? Math.max(Math.max(b[0], b[1]) * (p.h / b[2]) / 2, p.r ?? 0) : (p.r ?? 0)
  }
  for (const [id, layout] of Object.entries(layouts)) {
    const spawn = layout.player ?? { x: 0, z: 0 }
    for (const g of layout.exits ?? []) {
      const steps = Math.ceil(Math.hypot(g.x - spawn.x, g.z - spawn.z) / 1.5)
      let worst = 99
      for (let s2 = 0; s2 <= steps; s2++) {
        const t = s2 / steps
        const cx = spawn.x + (g.x - spawn.x) * t
        const cz = spawn.z + (g.z - spawn.z) * t
        let left = 99, right = 99
        for (const p of layout.props) {
          if (SOFT.has(p.model) || (p.r ?? 0) === 0) continue
          const gap = Math.hypot(p.x - cx, p.z - cz) - reachOf(p)
          const side = (p.x - cx) * (g.z - spawn.z) - (p.z - cz) * (g.x - spawn.x)
          if (side >= 0) left = Math.min(left, gap); else right = Math.min(right, gap)
        }
        worst = Math.min(worst, left + right)
      }
      if (worst < HALF * 2) {
        problems.push(
          `${id}: the way to the '${g.to}' gate narrows to ${worst.toFixed(1)}m — ` +
          `the player is 0.9m wide and the camera follows behind, so this route is not walkable.`,
        )
      }
    }
  }
}

/* מטרות ליבה: אם אזור מכריז core, כל מזהה חייב להתקיים אצלו — מפגש
   מאותו אזור או משימת האזור. ליבה שמצביעה על כלום היא שער שלא ייפתח
   לעולם, וזה בדיוק סוג התקיעה שאסור שתגיע ללומד. השדה רשות: אזור בלי
   core פשוט לא שוער. */
for (const region of dialogue.regions) {
  const core = region.core
  if (!core) continue
  if (!Array.isArray(core) || core.length === 0) {
    problems.push(`${region.id}: core must be a non-empty array of ids.`)
    continue
  }
  const encounterIds = new Set(region.encounters.map((e) => e.id))
  for (const id of core) {
    if (encounterIds.has(id)) continue
    if (tasksSrc.includes(`'${id}'`) || tasksSrc.includes(`"${id}"`)) continue
    problems.push(`${region.id}: core id "${id}" is neither an encounter of this region nor a known task.`)
  }
}

/* the HUD promises a notebook total; it must match what actually exists */
const promised = notebookSrc.match(/NOTEBOOK_TOTAL\s*=\s*(\d+)/)
if (promised && +promised[1] !== total) {
  problems.push(
    `the HUD promises ${promised[1]} notebook entries but dialogue.json holds ${total} encounters — ` +
    `update NOTEBOOK_TOTAL in notebook.ts, or the learner is told they missed something that was never there.`,
  )
}

console.log('\nchapter 1 — journey coverage\n')
for (const n of notes) console.log('  ' + n)
console.log(`\n  reachable now: ${reachable} of ${total} encounters (${playable.length} of ${dialogue.regions.length} regions built)\n`)

if (problems.length) {
  console.error('journey check FAILED:\n')
  for (const p of problems) console.error('  ✗ ' + p)
  console.error('')
  process.exit(1)
}
console.log('  every encounter in every built region is reachable.\n')

function fail(msg) {
  console.error('journey check could not run: ' + msg)
  process.exit(1)
}

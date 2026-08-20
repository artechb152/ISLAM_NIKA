/* The evidence and the region tasks have to be reachable, standing on clear
   ground, and sourced.
 *
 * A find placed inside a wall is invisible; a task station placed off the
 * walking route is a mechanic the learner never meets. Both are exactly the
 * kind of thing that looks right in a data file and is wrong in the world. */
import { readFileSync } from 'node:fs'
import { layouts, ORDER, collidersOf, PLAYER_R, entryPoint, route } from './route-sim.mjs'

const src = (f) => readFileSync('src/lib/chapter1/' + f, 'utf8')
const parse = (text, re) => [...text.matchAll(re)]

const finds = parse(
  src('finds.ts'),
  /id:\s*'([^']+)',\s*\n\s*region:\s*'([^']+)',\s*\n\s*x:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+),[^]*?source:\s*'(§\d+)'/g,
).map((m) => ({ id: m[1], region: m[2], x: +m[3], z: +m[4], source: m[5] }))

const tasks = parse(
  src('tasks.ts'),
  /id:\s*'([^']+)',\s*\n\s*region:\s*'([^']+)',\s*\n\s*x:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+),[^]*?source:\s*'(§\d+)'/g,
).map((m) => ({ id: m[1], region: m[2], x: +m[3], z: +m[4], source: m[5] }))

if (finds.length < 10) throw new Error(`parsed only ${finds.length} finds — regex out of step with finds.ts`)
if (tasks.length < 4) throw new Error(`parsed only ${tasks.length} tasks — regex out of step with tasks.ts`)

const sections = new Set(
  [...readFileSync('../concept/chapter1/SOURCE-TEXT.md', 'utf8').matchAll(/^#+ (§\d+) ·/gm)].map((m) => m[1]),
)

const problems = []
for (const item of [...finds.map((f) => ({ ...f, kind: 'עדות' })), ...tasks.map((t) => ({ ...t, kind: 'משימה' }))]) {
  const L = layouts[item.region]
  if (!L) { problems.push(`${item.id}: region ${item.region} has no layout`); continue }
  if (!sections.has(item.source)) problems.push(`${item.id}: ${item.source} is not a section of the source text`)
  const bound = L.bound ?? 24
  if (Math.hypot(item.x, item.z) > bound - 2) problems.push(`${item.id}: outside the walkable circle`)
  /* standing inside a prop? */
  for (const c of collidersOf(L))
    if (Math.hypot(item.x - c.x, item.z - c.z) < c.r + 0.3) {
      problems.push(`${item.id}: sits inside ${c.model}(${c.x},${c.z})`)
      break
    }
  /* and can the traveller actually walk to it from where they arrive? */
  const back = ORDER[ORDER.indexOf(item.region) - 1]
  const start = entryPoint(L, back)
  if (!route(L, start, item, 0.4)) problems.push(`${item.id}: no way to walk to it from the arrival point`)
}

if (problems.length) {
  console.log(`\n✗ אינטראקציות — ${problems.length} בעיות:\n`)
  for (const p of problems) console.log('  • ' + p)
  process.exit(1)
}
console.log(`✓ ${finds.length} עדויות ו-${tasks.length} משימות — כולן נגישות ברגל, על קרקע פנויה, ומעוגנות בטקסט המקור.`)

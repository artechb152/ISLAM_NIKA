/* Walk chapter 1 the way a player walks it, in plain numbers.
   Every leg of every region: arrival → each speaker → the far gate. */
import { layouts, ORDER, readPlacements, legsOf, walkLeg, TALK_RANGE } from './route-sim.mjs'

const placements = readPlacements()
let bad = 0
for (const id of ORDER) {
  const L = layouts[id]
  const { legs } = legsOf(id, placements)
  if (!legs.length) { console.log(`${id.padEnd(14)} (end of the road)`); continue }
  const parts = []
  for (const leg of legs) {
    const arrive = leg.to.talk ? TALK_RANGE - 0.6 : (leg.to.r ?? 3.2) - 0.4
    const r = walkLeg(L, leg.from, leg.to, arrive)
    if (!r.ok) { bad++; parts.push(`✗ ${leg.name} — ${r.reason} at ${r.at.x.toFixed(1)},${r.at.z.toFixed(1)}`) }
    else parts.push(`✓ ${leg.name} ${r.seconds.toFixed(0)}s`)
  }
  console.log(`${id.padEnd(14)} ${parts.join('   ')}`)
}
console.log(bad ? `\n${bad} legs a walking player cannot complete` : '\nthe chapter walks end to end')
process.exit(bad ? 1 : 0)

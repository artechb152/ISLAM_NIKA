/* The gate every change has to pass: is chapter 1 walkable end to end?
   Prints one line per leg — arrival to each speaker, speaker to the far gate. */
import { layouts, ORDER, readPlacements, route, legsOf, collidersOf, entryPoint } from './route-sim.mjs'

const placements = readPlacements()
let bad = 0
for (const id of ORDER) {
  const L = layouts[id]
  const { start, legs, fwd } = legsOf(id, placements)
  console.log(`\n${id}  (bound ${L.bound ?? 24}, ${collidersOf(L).length} colliders)`)
  console.log(`   arrive at ${start.x.toFixed(1)},${start.z.toFixed(1)}  yaw ${start.yaw.toFixed(2)}`)
  if (!legs.length) { console.log('   (no legs — end of the road)'); continue }
  for (const leg of legs) {
    /* A route that only exists if you thread a 5 cm gap is not a route a
       player finds. Ask for a corridor a person can see. */
    const wide = route(L, leg.from, leg.to, 0.55)
    const tight = wide ?? route(L, leg.from, leg.to, 0)
    const direct = Math.hypot(leg.to.x - leg.from.x, leg.to.z - leg.from.z)
    if (!tight) { console.log(`   ✗ ${leg.name}  BLOCKED (no path at all)`); bad++; continue }
    const detour = tight.length / Math.max(direct, 0.001)
    const tag = !wide ? '⚠ squeeze' : detour > 1.45 ? '⚠ detour' : '✓'
    if (tag !== '✓') bad++
    console.log(`   ${tag} ${leg.name}  ${direct.toFixed(1)}m direct, ${tight.length.toFixed(1)}m walked (×${detour.toFixed(2)})`)
  }
  if (fwd && !L.exits?.some((e) => e.to === fwd)) { console.log(`   ✗ no gate to ${fwd}`); bad++ }
}
console.log(bad ? `\n${bad} legs are not cleanly walkable` : '\nall legs walkable')
process.exit(bad ? 1 : 0)

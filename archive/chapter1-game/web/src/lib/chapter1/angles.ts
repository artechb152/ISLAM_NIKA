/** Shortest signed angle for a difference, wrapped into (−π, π].
 *
 *  Replaces the idiom `((d + Math.PI) % (Math.PI * 2)) - Math.PI`, which only
 *  works for `d ≥ −π`. JavaScript's `%` keeps the sign of the dividend, so for
 *  `d` in `[−3π, −π)` it returns `d` unchanged — `wrap(−4)` gives `−4` where it
 *  should give `+2.28`. Both callers reached that range: the camera's yaw
 *  accumulates without bound from look-drags, and Rawi's target can sit
 *  anywhere on the circle. The result was a second, spurious attractor half a
 *  turn from the real one, and a guide who took the long way round in exactly
 *  the case a comment promised he would not.
 *
 *  It lives here rather than in Game.tsx because Characters.tsx needs it too,
 *  and Game.tsx already imports Characters.tsx — the other direction would
 *  close a cycle. */
export function wrapPi(d: number) {
  return Math.atan2(Math.sin(d), Math.cos(d))
}

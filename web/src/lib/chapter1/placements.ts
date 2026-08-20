/* Where the cast stands, per region.

   This is the seam the old station system used to occupy. A station carried
   both its content and its position; content now lives in dialogue.json alone,
   so all that is left to author is a spot on the ground. Adding a character to
   a region is a data change here — never a code change in Game.tsx.

   Positions are scene metres (x, z on the ground plane), `ry` is the facing in
   radians. What a character says is not written here: it is every encounter in
   the region whose `speaker` matches, taken in the order dialogue.json gives
   them. */

import type { SpeakerId } from './dialogue'

export interface Placement {
  who: Exclude<SpeakerId, 'narrator' | 'rawi'>
  x: number
  z: number
  ry?: number
}

export const PLACEMENTS: Record<string, Placement[]> = {
  /* The night camp is Rawi's region — he is the only one who speaks in it, and
     he walks beside the player rather than standing anywhere. */
  'night-camp': [],
  /* The envoy waits on the road just south of the gate, facing the traveller
     coming up from Yemen — crossing the frontier means walking straight into
     his conversation. He stands in clear sand: his old spot at (1.9,-6.2) was
     inside the watchtower's real footprint, which is nearly a metre wider than
     the collision radius the layout used to claim. */
  'border-post': [{ who: 'envoy', x: -1.5, z: -4.6, ry: 0.32 }],
  /* The Jewish trader stands at his own stall on the market square, facing the
     well — the shared market is where the region's whole subject lives, so the
     conversation happens in the middle of it rather than off to one side. */
  yathrib: [{ who: 'jewish', x: 4.2, z: 8.6, ry: -2.5 }],
  /* The opening is the narrator's alone, and Rawi walks with the player from
     the first step — neither needs a body placed on the ground. */
  'yemen-heights': [],
  /* The tribal chief stands at his own camp fire, facing the pass the caravans
     come up through. */
  'narrow-pass': [{ who: 'chief', x: -2.6, z: 6, ry: -1.1 }],
  /* The loading road is Rawi's stretch — he explains it as you walk it. */
  'loading-road': [],
  /* The monk waits by the altar in the middle of the courtyard, which is the
     one place the whole region points at. */
  monastery: [{ who: 'monk', x: 1.8, z: -1.2, ry: -1.9 }],
  /* Mecca carries the most: the merchant keeps his stall on the square where
     the idols stand, so the pantheon is behind him while he speaks. */
  mecca: [{ who: 'merchant', x: -4.5, z: -3.5, ry: -0.6 }],
  /* The closing summary is Rawi's, spoken at the overlook. */
  exit: [],
}

# Art Director Verdict — player4 (weight-transfer skin, in-game review)

Date: 2026-09-02
Reviewed: game-idle.png, game-walk.png, game-run.png, committee-r0/p4-walk.png, committee-r0/p4-talk.png
Note: game-idle.png captured the title card only (no 3D scene) — idle not judged in-world.

## VERDICT: FIX-FIRST

Two fixes required before this replaces the rejected character in production:

1. **Right forearm/wrist skinning is broken.** In both close-ups (p4-walk, p4-talk) the right
   forearm collapses: it thins and twists along its length and the wrist hooks into a
   "candy-cane" droop — this is not residual stiffness, it reads as a snapped limb. It is the
   classic weight-transfer failure on forearm twist: re-transfer or hand-fix weights on the
   right forearm/twist bones so the forearm keeps volume and the wrist follows the hand bone.

2. **Zombie-arm read in walk/run at gameplay distance.** In game-walk and game-run both arms
   hang stiffly forward with near-straight elbows instead of swinging at the sides. Visible
   even at full gameplay distance, so it is not cosmetic. Looks like a rest-pose mismatch
   (A-pose mesh vs T-pose retarget or vice versa) on the shoulder/upper-arm — correct the
   bind/retarget offset so the arms drop to the sides and swing.

## What passes (do not touch)

- **World lighting: PASS.** No self-glow. The character takes the warm sunset key and grounds
  with a correct contact shadow, exactly like the NPCs and Rawi. NPC-recipe material is
  confirmed working in-scene.
- **Silhouette/readability: PASS.** Tan tunic + deep-red sash + white trousers reads clearly
  at gameplay distance and separates well from terrain and from Rawi's white robes.
- **Cloth deformation: PASS.** Sash, tunic hem, and trouser cuffs deform naturally in walk
  and talk; sandaled feet with modeled toes hold up in close-up.
- **Family match vs Rawi: PASS.** Same painterly handling, believable shared palette and
  proportions; the warm traveler against Rawi's white is a good player/guide pairing.

## Bottom line

The mesh, material, and world integration are production-ready — this is already miles past
the rejected white blob. But the broken right forearm shows in close-up dialogue framing and
the forward-locked arms show in every traversal shot, i.e. the two things the player looks at
most. Fix the right-forearm weights and the arm rest-pose offset, re-shoot walk + talk, and
this accepts. If the Mixamo-rigged version lands first and its arms are clean, prefer it —
judged on this build alone, it is FIX-FIRST, not production-ready today.

---

# Re-review — player5 (bind-pose arm alignment rebuild)

Date: 2026-09-02
Reviewed: committee-r0/p5-walk.png (full figure, far), committee-r0/p5-talk.png (talk close)

## VERDICT: ACCEPT-FOR-PRODUCTION

Per criterion, one line each:

- **World lighting / material:** unchanged from the passed player4 build — same NPC-recipe
  material, grounds with correct shadow in the diagnostic room; carries over as PASS.
- **Silhouette / readability:** at far camera the full figure (head included this time) reads
  cleanly mid-stride — tunic, sash, white trousers, natural gait; PASS.
- **Deformation — walk:** the zombie-arm lock is gone — arms now swing opposed with a proper
  elbow bend, and the right forearm keeps its volume through the forward swing; PASS.
- **Deformation — talk:** the right elbow bends as a believable gesture and the forearm no
  longer thins or twists; the slight wrist droop that remains reads as the animation's pose,
  not a skinning failure; PASS.
- **Family match vs Rawi:** same character, same painterly family as the approved static
  mesh; PASS.

Fix confirmation: both player4 blockers (right-forearm weight collapse, forward rest-pose
offset) are resolved by the bind-pose arm alignment. One item to eyeball in the in-game
re-shoot after integration: the right wrist during talk loops at dialogue-camera distance —
confirmation only, not a blocker. player5 is approved to replace the rejected character in
production today; if the Mixamo-rigged version arrives later it competes on merit, it is not
awaited.

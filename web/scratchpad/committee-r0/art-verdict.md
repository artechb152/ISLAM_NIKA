# Art Director Verdict — Player Character, Committee Round 0

Judged against the visual language of the five NPCs (reference: npc-merchant,
`cand-npc-ref-near.png` / `cand-npc-ref-far.png`): warm, matte, hand-painted look,
natural proportions, sand/ochre/madder palette.

## Candidate A — ACCEPT-FOR-RIGGING

- **Face**: Clean and readable at the near view — defined painted eyes, dark
  trimmed beard, ochre headwrap over black shoulder-length hair. Slightly more
  stylized/toon than the merchant's grungier painterly texture, but clearly the
  same family and it will read well at gameplay distance where the merchant's
  micro-detail vanishes anyway.
- **Hands**: Modeled five-finger hands, correct thumb placement. They run a
  touch large and splay wide in the bind pose (the claw-like cast shadow in the
  back/side shots is pose, not geometry). Acceptable.
- **Garment**: Taupe/khaki knee-length tunic with side slits, madder-red waist
  sash with hanging tails, leather belt with pouch, off-white baggy sirwal
  trousers gathered at the ankle, strapped leather sandals. Folds are painted
  softly and matte — consistent with the NPC recipe.
- **Palette harmony**: Very good. Tunic sits between the room's sand tones and
  the merchant's brown robe; the madder sash echoes the merchant's striped red
  exactly. One flag: the sirwal trousers are the brightest surface in the frame,
  brighter than anything on the NPC ref — see World Lighting notes below.
- **Silhouette at distance** (`cand-A-far.png`): Reads instantly — headwrap,
  belted torso, tapered trousers. Distinct from the merchant's full-length robe,
  which is correct for a player character: the player must never be mistaken for
  an NPC at range.

## Candidate B — REJECT (broken capture set, unverifiable)

- `cand-B-front.png` is an empty dark frame — no model rendered.
- `cand-B-side.png` shows only the floor grid and a red "1 Issue" error badge —
  the asset or viewer errored during capture.
- No near view exists, so **the face was never seen**. I will not pass a player
  character whose face has not been reviewed.
- The two usable views (`cand-B-back.png`, `cand-B-far.png`) show what appears
  to be essentially the same outfit as A (taupe tunic, madder sash, white
  sirwal) in a wider A-pose, offering no visible advantage over A even if the
  captures were repaired.
- Verdict: reject on presentation integrity. If the team believes B is
  materially different, recapture front/side/near with the issue resolved and
  resubmit — but do not block A on it.

## Winner: **Candidate A**

Send to rigging.

## Fixable concerns to watch after rigging

1. **Sash tails at the hip**: the two hanging madder tails are the most likely
   candy-wrapper/clipping zone during walk and turn cycles. Skin them to hips
   with falloff, or accept minor interpenetration at distance.
2. **Tunic hem and side slits**: knee-length hem over separate trousers will
   clip on high leg raises; check the walk and any sit/kneel poses.
3. **Hands**: slightly oversized with splayed bind-pose fingers — verify finger
   weights so fists/gestures don't web between fingers; consider a 5–8% scale
   reduction if they read big in-game.
4. **Hair-to-neck and hair-to-headwrap seams**: shoulder-length hair cards may
   shear at the neck during head turns.
5. **Sandal straps and toes**: painted straps over modeled toes — watch for toe
   weights bleeding into the sole during the walk cycle.
6. **Belt pouch**: rigid pouch on a soft belt; parent it to the pelvis bone
   only, never blended, or it will stretch.

## World-lighting art direction (re: `game-idle.png` / `game-walk.png`)

The old character failed in-world partly because pure-white albedo under the
warm sunset key plus the 6-band posterize collapses into a flat paper-white
cutout — exactly the "white blob" the product owner rejected. Before dropping
Candidate A in, warm the sirwal trousers' albedo down from near-white to a
bone/undyed-linen tone (roughly 8–12% toward sand, max value ~0.85) and keep
every material fully matte (roughness 1.0, zero specular/metalness) so the
posterize bands land as painterly steps, not highlights. Skin can lose a few
points of saturation so the world's ochre grade doesn't push it orange; the
madder sash and ochre headwrap need no change — they are the accents that will
keep the player readable against sand at distance, just as Rawi's dark hair
does.

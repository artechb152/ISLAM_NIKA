'use client'

/* עלי · שתי דרכים אל אותו אדם — the genealogy plate.

   THE PLATE CARRIES NO LETTERING, exactly like the conquest map: it was generated with
   four EMPTY cartouches under its four medallions, and the names are DOM text dropped
   into them. That is the chapter's rule for every generated asset, and here it is also
   the only way the plate could carry Hebrew at all.

   No face is visible in any medallion — every figure is hooded, veiled or turned away.
   That was asked for and it is also the right call for the subject.

   The positions below are fractions of the plate's own box, measured against the render
   and then checked on the page. They are not derived from anything, so if the plate is
   ever regenerated every one of them has to be measured again. */

import { list } from '@/lib/chapter5/content'

const PLATE = '/assets/chapter5/lineage.jpg'

/* Centre of each blank cartouche, as a fraction of the plate.

   THE PLATE'S SHAPE IS THE ARGUMENT. The first one stacked all four medallions in one
   column, and in a genealogy a vertical rule means „child of" — so it said Ali was
   Fatima's son. He was her husband. This plate puts him BESIDE her, joined by a
   horizontal marriage rule, with the descent from the couple above landing on HER, and a
   long rule sweeping down the right side from Muhammad to Ali for the blood tie. Which
   medallion holds which name is therefore not interchangeable: Muhammad has to be the
   upper right, because that is the end of the sweep.

   The numbers were READ OFF A GRID laid over the plate at 5% intervals, not judged by
   eye — the cartouches are small and an eyeballed centre is visibly off in a box that
   size. Regenerate the plate and every one of them has to be measured again. */
const SLOT = {
  khadija: { x: 0.250, y: 0.415 },
  muhammad: { x: 0.600, y: 0.415 },
  /* the lower pair was re-measured on a 2% grid over the plate's bottom half — the two
     cartouches sit a shade lower than the first reading put them, and at this size a
     percent and a half is the difference between a name in its plaque and a name on the
     rim of it */
  fatima: { x: 0.4175, y: 0.849 },
  ali: { x: 0.7125, y: 0.849 },
}

export default function Lineage() {
  const [khadija, muhammad, fatima, ali] = list('§8.line')
  const [inLaw, cousin] = list('§8.rel')
  const name = (k: keyof typeof SLOT, text: string, big = false) => (
    <b
      className={'ch5-lin-name' + (big ? ' is-subject' : '')}
      style={{ left: `${SLOT[k].x * 100}%`, top: `${SLOT[k].y * 100}%` }}
      dir="rtl"
    >
      {text}
    </b>
  )
  return (
    <figure className="ch5-lin" data-reveal>
      {/* THE OVERLAY MUST BOX THE IMAGE, NOT THE FIGURE. It was `inset:0` on the figure,
          which also contains the caption below the plate — so every percentage was
          measured against a taller box and every name sat low of its cartouche. The
          frame holds exactly the picture. */}
      <span className="ch5-lin-frame">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PLATE} alt="לוח ייחוס מצויר — ארבע מדליות, והפנים אינן נראות באף אחת" loading="lazy" decoding="async" />
      {/* the overlay is mounted LTR and every position is `left`/`top`: a plate is a
          picture and its geometry is not reading direction. Only the labels run RTL,
          because they are text. Same rule as the conquest map, and the same bug avoided. */}
      <span className="ch5-lin-plate" dir="ltr">
        {name('khadija', khadija)}
        {name('muhammad', muhammad)}
        {name('fatima', fatima)}
        {name('ali', ali, true)}
        {/* the marriage that makes Ali a son-in-law — on the rule between Fatima and him */}
        <i className="ch5-lin-rel" dir="rtl">{inLaw}</i>
      </span>
      </span>
      {/* THE SECOND TIE is drawn INTO the plate — the long rule sweeping down its right
          side from Muhammad to Ali — so only its name is added here. It sits under the
          plate rather than along the rule: a margin that narrow cannot hold a Hebrew
          phrase, and turning the phrase on its side to make it fit would be worse than
          a caption. „בן דודו" alone would not say whose. */}
      <figcaption className="ch5-lin-cap">{cousin}</figcaption>
    </figure>
  )
}

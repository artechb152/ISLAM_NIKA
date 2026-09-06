/* Repaints the nine pictures that failed a look-at-every-panel pass.

   Three of them broke a rule the manifest had already declared:
     p32  a fully modelled human face — every drawn head in this book is blank
     p38  a skyline of blue and gold domes, which reads as Jerusalem, under a
          caption about the hundred and fifty believers of MECCA
     p46  a dome and a minaret in Mecca in 621, where no mosque yet stood
     p53  robed figures standing in the seventh heaven — the prophets, drawn
     q64  three figures in a scene whose own mustNot says כל דמות אנוש

   Three were not pictures at all — bare cream with a rule drawn across it:
     p58  q70  p07

   One was an empty gradient: p52.

   Same frozen style string and same face rule as produce.mjs. A picture that
   does not carry them does not belong to the same book. */
import { writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import sharp from '../../web/node_modules/sharp/lib/index.js'
const run = promisify(execFile)
const HF = 'C:/Users/nikag/.local/bin/higgsfield.exe'
const OUT = 'C:/Users/nikag/ISLAM_NIKA/web/public/assets/chapter3/comic/'

const STYLE = 'Comic book panel art. Confident dark brown ink linework over loose flat watercolour washes that do not perfectly follow the lines. Cross-hatching in the shadows, dry-brush texture, areas of bare paper. Strictly limited palette: warm cream paper, ochre and umber stone, deep brown-black shadow, muted grey-blue, and one warm gold. Graphic novel illustration, clean and readable, strong value contrast. No text, no lettering, no speech balloons, no captions, no panel border or frame, no signature, no watermark.'
const FACES = 'Every human figure has a DELIBERATELY BLANK AND INDISTINCT HEAD — the whole head, hair included, dissolves into a soft wash with no eyes, no mouth, no features and no hairline, as if the paint faded there; every other part of them is fully drawn in sharp ink line.'
const NOPROPHET = 'Absolutely do not include: Muhammad or any prophet figure, Gabriel, any angel, any mosque, any dome, any minaret or tower, any text or lettering.'
const NOBODY = 'There is no person anywhere in this picture: no figure, no silhouette, no hands, no shadow of a person.'

const JOBS = {
  /* SIXTH PASS — two skylines, found by cropping the top 40% of every picture
     that has a town in it and looking along the rooflines.

     p05 put a DOME AND A MINARET in Mecca in 570 — a mosque forty years before
     the religion existed, and against the chapter's own standing rule.

     p40 is worse: walls, towers, a dome, cypresses and a pointed arched gate —
     JERUSALEM — under a caption about the emigration to ABYSSINIA. Wrong place,
     and the one city this chapter may never draw. */

  /* §3 — the town that was spared, and the Quran's telling of it. */
  p05: { faces: true, art:
    'A small 6th-century desert town of flat-roofed mud-brick houses seen at night from a ridge above, one window lit among the dark houses, bare hills closing it in, a wide starless sky. The rooflines are all flat and all the same height.',
    avoid: 'No dome, no domes, no minaret, no tower, no spire, no mosque, no church, no bell tower, no arch, no city wall.' },

  /* §30 — he sent a group of his followers to Abyssinia, and its king received
     them well. The Aksumite highlands, not the Levant. */
  p40: { faces: true, art:
    'A small party of robed travellers with bundles standing on a high green terraced hillside in the Aksumite highlands of 6th-century Abyssinia, looking down at a scatter of low rectangular stone houses among terraces and flat-topped acacia trees, tall escarpments beyond, soft afternoon light.',
    avoid: 'No dome, no minaret, no tower, no spire, no city wall, no fortified gate, no pointed arch, no cypress trees, no Jerusalem, no Levantine city, no large cross, no monumental church.' },

  /* FIFTH PASS — the four oldest assets in the book, and one fault they share.
     They were painted before the face rule was tightened from 'no features' to
     'the whole head, hair included, dissolves'. Checked by cropping the top 46%
     of all seventy-five and looking at them side by side: these four have fully
     modelled heads — hairline, ear, brow, jaw, chin — with only the features
     wiped, and the other seventy-one are correct. */

  /* §1 — Abraha, king of Aksum, rides out to take the Kaaba. Aksumite, and
     therefore African: this book has been caught twice already drawing an
     Indian elephant for the same campaign. */
  p02: { faces: true, art:
    'A 6th-century Aksumite commander in a rich embroidered cloak riding a horse at the head of a long column of spearmen with round shields, crossing dry hills toward a desert valley, dust rising, hard morning light. He fills the right of the frame and the column runs back into the distance behind him.',
    avoid: 'No Indian elephant, no crown of laurel, no Roman armour, no modern clothing, no dome, no minaret.' },

  /* §7 — the name comes from his great-grandfather, and the family belongs to
     Quraysh. A man of standing, and the Kaaba he has standing behind him. */
  p10: { faces: true, art:
    'A man of standing in 6th-century Mecca in a fine dark blue robe with gold embroidery, seen from behind and to one side, looking out across an open sandy valley toward a plain dark stone cube in the middle distance, a scatter of robed people between him and it, bare hills beyond.',
    avoid: 'No dome, no minaret, no mosque, no cloth over the cube, no modern clothing.' },

  /* §8 — his father and his mother. Neither is a prophet, so both may be drawn;
     the head rule is the whole of what changes here. */
  p11: { faces: true, art:
    'A young man and a young woman of 6th-century Arabia standing together in the doorway of a well-kept mud-brick house, he in a pale robe and headcloth, she in a blue-grey mantle with a gold-edged veil, warm interior light behind them, a water jar and a palm frond at the edge of the frame.',
    avoid: 'No modern clothing, no jewellery on the forehead, no dome, no minaret.' },

  /* §14 — Khadija: he is twenty-five, she is forty, and she is the one with the
     standing. */
  p19: { faces: true, art:
    'A woman of about forty in 6th-century Mecca, in a fine deep-blue mantle over an embroidered gown with a heavy gold necklace, standing composed and upright beside the stone wall of her own courtyard, bales of cloth and sealed jars stacked behind her, late afternoon light.',
    avoid: 'No modern clothing, no crown, no dome, no minaret.' },

  /* FOURTH PASS, and the rule that produced it, stated once so it does not have
     to be rediscovered:

       A DRAWN FIGURE IS A PROBLEM WHEN THE CAPTION ABOVE IT NAMES AN ACT OF
       MUHAMMAD, GABRIEL OR ANOTHER PROPHET AND THAT FIGURE IS THE ONLY ONE, OR
       ONE OF A PAIR, IN THE FRAME.

     A blank head does not make a figure anonymous when the sentence beside it
     names exactly one person. Where a crowd or a household is drawn the agreed
     treatment holds and nothing changes; where a lone climber appears under
     'to the cave of Hira', the lone climber is him. Each of these becomes the
     PLACE, or the view from where he stood. */

  /* §10 — the black spot they took out of his heart. */
  p14: { faces: false, art:
    'Bare stony desert ground seen from very close and low, pale dry stones and dust filling the frame, and one small deep-black stone lying among them, sharp against the pale ground.',
    avoid: NOBODY + ' No hands, no cloth, no vessel, no blood.' },

  /* §11 — it had to be taken out to fit him for what was coming. */
  p15: { faces: false, art:
    'A wide empty desert seen from a high bare ridge at first light, the stony ridge running across the foreground with nothing standing on it, range after range of pale hills going back to the horizon, an enormous cold sky.',
    avoid: NOBODY + ' No path, no marker, no building, no animal.' },

  /* §17 — up to the cave of Hira, above Mecca. */
  p22: { faces: false, art:
    'A steep bare mountain path climbing between big pale boulders towards a dark cave mouth high in the rock face above, the path empty, a small desert town very far below in the valley behind.',
    avoid: NOBODY + ' No animal, no ladder, no steps cut in the rock, no dome, no minaret.' },

  /* §17 — to be alone there, as the ascetics did. The view from inside is the
     view he had, which is the whole point of drawing it this way. */
  p23: { faces: false, art:
    'The inside of a bare rock cave looking out through its low mouth at distant pale mountains under a rising sun, the cave floor empty stone with one folded woollen blanket and a clay water jar set against the wall.',
    avoid: NOBODY + ' No hands, no shadow of a person, no scroll, no lamp, no fire.' },

  /* §36 — he rode it as far as the farthest place of prayer. Neither the beast
     nor the rider nor the place may be drawn, so what is drawn is the ground. */
  p47: { faces: false, art:
    'A wide empty stony plateau at night under a heavy field of stars, a low ruined dry-stone enclosure standing open at its far edge, bare rock and dust in the foreground.',
    avoid: NOBODY + ' No dome, no minaret, no tower, no mosque, no gate, no animal, no winged creature, no city.' },

  /* §41 — that night he came back to Mecca. The town, at the hour he came back
     to it — a crowd, where a pair would have had to be him and Abu Bakr. */
  p55: { faces: true, art:
    'A narrow mud-brick street of a small 6th-century desert town at first light, five or six robed townspeople standing in their doorways and along the wall, water jars and a hand-cart, long low sun down the length of the street.',
    avoid: 'No dome, no minaret, no tower, no mosque, no modern clothing.' },

  /* §41 — and for believing him he was called al-Siddiq. Abu Bakr is not a
     prophet, so he can be drawn — alone, which makes the caption his. */
  p56: { faces: true, art:
    'One robed man of 6th-century Arabia standing alone and still in the doorway of a mud-brick house at dawn, looking out down an empty street, a plain undyed robe and a shoulder cloth, bare morning light on the wall beside him.',
    avoid: 'No second figure, no crowd, no dome, no minaret, no modern clothing.' },

  /* THIRD PASS — the same fault as the second, found by walking the whole
     night-journey run: a caption that names Gabriel, or Moses, or Muhammad's
     own act, with figures standing in the frame under it. A blurred head does
     not make a figure anonymous when the sentence above it names only one
     person. Every one of these becomes the PLACE the thing happened in. */

  /* §37 — Gabriel set him a test, and tied the beast where the prophets tie
     theirs. The picture is the tethering ring, empty. */
  p48: { faces: false, art:
    'A worn iron tethering ring set into a low dry-stone wall at night, the stone polished smooth around it by long use, a scatter of straw on the packed earth below, a wide star field above the wall.',
    avoid: NOBODY + ' No animal, no winged creature, no vessel, no dome, no minaret, no tower.' },

  /* §39 — from there Gabriel went up with him. Both of them are undrawable, so
     the picture is the place they left from. */
  p51: { faces: false, art:
    'A bare flat stone rooftop seen from its own level, nothing standing on it at all, its low parapet giving onto an immense open night sky that fills three quarters of the frame, a few roofs of a small desert town far below and behind.',
    avoid: NOBODY + ' No ladder, no stairs, no gate, no beam of light, no winged creature, no dome, no minaret.' },

  /* §40 — fifty prayers a day. Drawn as fifty, so that the five of the next
     page reads as the answer to it. */
  p54: { faces: false, art:
    'A flat field of deep indigo night sky and nothing else, filling the entire frame edge to edge, and floating in the middle of it about fifty tiny warm points of light set out in five even horizontal rows of ten. The whole image is sky. It is a painting of a night sky with points of light in it, not a place.',
    avoid: NOBODY + ' There is NO architecture of any kind: no arch, no vault, no corridor, no tunnel, no steps, no stairs, no columns, no walls, no ceiling, no doorway, no room, no interior. No ground, no horizon, no floor, no fire, no brazier, no throne, no symbol, no crescent.' },

  /* SECOND PASS. Four of these put a lone figure in a frame whose caption names
     Muhammad's own movement — a walker on the road to Ta'if IS Muhammad to any
     reader — and two put figures in the heavens directly under the names of the
     prophets met there. The other two dressed his daughters in laced bodices,
     aprons and buttoned boots: central-European peasant clothes in seventh-
     century Arabia. */

  /* §10 — they washed his heart with water from Zamzam. The spring, and no one
     at it: the boy in the frame would be Muhammad. */
  q14: { faces: false, art:
    'A small clear spring welling up between bare desert rocks into a shallow round stone basin, the water catching low sunlight, dry stone and scrub around it.',
    avoid: NOBODY + ' No hands, no reflection of a person, no vessel being held.' },

  /* §34 — he went out at night to the foot of the Kaaba. Same reason: a lone
     walker on that road is him. */
  q51: { faces: false, art:
    'A bare mountain road at night climbing away from a dark valley town far below, winding empty between big stones under a wide star field, one low stone marker at the roadside.',
    avoid: NOBODY + ' No animals, no dome, no minaret, no mosque, no tower, no lamp.' },

  /* §39 — the third and fourth heavens: Joseph, then Aaron. Prophets, so the
     picture is the sky, in the same strata language as the heavens either side
     of it. */
  q60: { faces: false, art:
    'A completely abstract field of night sky in four horizontal strata, each lighter than the one below, one fine luminous seam brighter than the others between the third and the fourth, fine stars thinning upward.',
    avoid: NOBODY + ' No ground, no horizon line, no architecture, no stairs, no gate, no symbol.' },

  /* §39 — the fifth and sixth: Enoch, then Moses. */
  q61: { faces: false, art:
    'A completely abstract field of night sky in six horizontal strata rising from deep indigo to a cool pale grey-blue, the topmost two divided by a fine warm gold seam, very few stars.',
    avoid: NOBODY + ' No ground, no horizon line, no architecture, no stairs, no gate, no symbol.' },

  /* §42 — the verse of the star. The two figures the old picture put under it
     read as Muhammad and Gabriel. */
  q68: { faces: false, art:
    'An immense empty night sky filling almost the whole frame, one thin crescent moon low near the horizon, a wide dark bare desert plain along the very bottom edge, a scatter of small stars.',
    avoid: NOBODY + ' No tree, no lotus, no building, no symbol, no animal.' },

  /* §32 — Khadija died. No body, no display of grief: the room she is not in. */
  p43: { faces: false, art:
    'The empty interior of a 6th-century Arabian mud-brick house at dusk: a bare sleeping mat with a folded woollen mantle left on it, a hand-mill and a water jar against the wall, a low doorway open onto an empty courtyard, one unlit clay oil lamp on a ledge.',
    avoid: NOBODY + ' No body, no bier, no mourners, no fireplace, no European furniture.' },

  /* §32–§33 — now alone with his four daughters. */
  p44: { faces: true, art:
    'Four young women and girls of 6th-century Arabia standing quietly together in the sunlit courtyard of a mud-brick house, in long plain undyed robes and simple head coverings, bare feet or plain sandals on packed earth, a palm and a water jar behind them.',
    avoid: 'No laced bodice, no apron, no pinafore, no buttoned boots, no European peasant dress, no fireplace, no cobblestones.' },

  /* §42 — the verse of the night journey. The old picture put a man in a
     buttoned shirt and trousers on a cliff: a modern figure in a book set in
     621. The journey sets out from the sacred precinct, so that is what the
     page shows — the Kaaba as it stood, a dry-laid granite cube on open sand,
     with no mosque around it because none existed yet. */
  p57: { faces: true, art:
    'A plain cube of dark dry-laid granite standing alone on open sand in a shallow desert valley at night under an immense field of stars, a few rough upright standing-stones at a distance, bare hills all around, one small robed figure standing far off with their back to the viewer, tiny against the scale of the place.',
    avoid: 'No dome, no domes, no minaret, no tower, no mosque, no cloth covering the cube, no modern clothing, no shirt, no trousers, no winged creature, no animal.' },

  /* §23 — she believed him. A woman of substance in her own doorway. */
  p32: { faces: true, art:
    'A woman in a fine embroidered 6th-century Arabian robe and long headscarf standing tall and calm in the stone doorway of a desert house, morning light across the wall, a mud-brick town behind her. Half length, she fills the right of the frame.' },

  /* §28 — twelve years of preaching, a hundred and fifty people. The subject
     of the picture is the EMPTINESS of the square, not the group. */
  p38: { faces: true, art:
    'Seen from a rooftop above: a very small group of about ten robed people standing close together in the middle of a huge empty stone courtyard of a 6th-century desert town at midday, the vast bare pavement around them filling most of the frame, low flat mud-brick roofs and bare hills beyond.',
    avoid: 'No dome, no domes, no minaret, no tower, no mosque, no church, no cross, no monumental building, no modern city, no Jerusalem.' },

  /* §35 — one night in 621, in Mecca. No mosque existed there yet. */
  p46: { faces: false, art:
    'A single flat-roofed mud-brick house of a small 6th-century desert town at night under a vast field of stars, its low doorway dark, a bare dirt lane running past it, dry hills behind, one shuttered window. Deep night blues and warm shadow.',
    avoid: NOBODY + ' No dome, no minaret, no tower, no mosque, no animal, no winged creature.' },

  /* §39–§40 — the seventh heaven, and the command to pray. The seven met there
     are prophets. Nothing there can be drawn, so the picture is the sky. */
  p53: { faces: false, art:
    'A completely abstract field of deep night sky divided into seven horizontal strata, each one a shade lighter than the one below, the topmost band brightening into a warm gold seam of light across the whole width, fine stars thinning as they rise.',
    avoid: NOBODY + ' No ground, no horizon line, no architecture, no stairs, no ladder, no gate, no throne, no symbol.' },

  /* §40 — fifty prayers bargained down to five. */
  q64: { faces: false, art:
    'A completely empty deep night sky, very dark and perfectly still, with a faint clearing of pale light low along one edge and five small warm points of light spaced in a row within that clearing.',
    avoid: NOBODY + ' No ground, no architecture, no throne, no stairs, no symbol, no crescent.' },

  /* §43 — the accepted tradition: the journey went far. The far place is never
     identified, because the source does not settle it. */
  p58: { faces: false, art:
    'A long empty desert road running dead straight away from the viewer to a far horizon at night, one faint warm glow very small and very distant at the end of it, a wide star field above, bare stony ground either side.',
    avoid: NOBODY + ' Nothing identifiable at the horizon: no buildings, no walls, no domes, no towers, no city, no gate.' },

  /* §44 — the minority reading: it never left the peninsula. Same road, and
     the glow is just over the next ridge. */
  q70: { faces: false, art:
    'The same long straight desert road at first light, and the faint warm glow is close now — just beyond the next low stony ridge, only a hint of a low mud wall catching the light there. Pale dawn sky, bare ground.',
    avoid: NOBODY + ' No dome, no minaret, no tower, no city, no gate, no walls of a large city.' },

  /* §39 — the first two heavens. Adam, Jesus and John cannot be drawn. */
  p52: { faces: false, art:
    'A completely abstract vertical field of night sky in two clear horizontal strata divided by one fine luminous seam running across the whole width, the lower stratum deep indigo and the upper a shade lighter and cooler, fine scattered stars.',
    avoid: NOBODY + ' No ground, no horizon line, no architecture, no gate, no symbol.' },

  /* §4 — the heroic past the movements reach back to. The subject is the
     reaching back, and it is drawn as distance. */
  p07: { faces: false, art:
    'A vast empty desert plain at dusk seen from low ground, and along the far ridge a long thin line of tiny indistinct mounted silhouettes moving across the horizon, so distant they are almost dissolved into the haze. Enormous sky, bare foreground.',
    avoid: 'No banners, no emblems, no modern objects, no vehicles, no weapons in detail, no faces, no near figures.' },
}

function findUrl(o) {
  if (!o) return null
  if (typeof o === 'string') return /^https?:.*\.(jpg|jpeg|png|webp)/i.test(o) ? o : null
  for (const v of Array.isArray(o) ? o : Object.values(o)) { const r = findUrl(v); if (r) return r }
  return null
}

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(JOBS)
let done = 0
async function one(id) {
  const j = JOBS[id]
  const prompt = [j.art, j.faces ? FACES : '', j.avoid ?? '', NOPROPHET, STYLE].filter(Boolean).join(' ')
  try {
    const { stdout } = await run(HF, ['generate', 'create', 'gpt_image_2',
      '--aspect_ratio', '4:3', '--resolution', '2k', '--quality', 'high',
      '--prompt', prompt, '--wait', '--wait-timeout', '20m', '--json'],
      { maxBuffer: 32 * 1024 * 1024 })
    const url = findUrl(JSON.parse(stdout))
    if (!url) throw new Error('no url in response')
    const res = await fetch(url)
    await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(1280, 960, { fit: 'cover' }).jpeg({ quality: 86 }).toFile(OUT + id + '.jpg')
    console.log(`✓ ${id} (${++done}/${ids.length})`)
  } catch (e) { console.error(`✗ ${id}: ${String(e.message).slice(0, 200)}`) }
}
const q = [...ids]
await Promise.all(Array.from({ length: 5 }, async () => { while (q.length) await one(q.shift()) }))
console.log('REPAINT DONE')

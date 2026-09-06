/* Builds the book: 58 panels laid into double spreads, straight out of
   panels.json + passages.json. No panel content is written here.

   ⚠ THE FIRST VERSION OF THIS FILE IGNORED EVERY LAYOUT RULE THE PROJECT HAD
   RESEARCHED. It stacked two equal panels per leaf, thirty leaves, no size
   variation at all — so "panel size is pacing" and the nine/six grids existed
   in the manifest and in the moodboard and nowhere in the actual book.

   What it does now:
     · real page templates, not a stacker. A leaf holds 1, 3, 4 or 6 panels.
     · SIZE IS PACING — every multi-panel template has one panel larger than
       its neighbours, so the eye is told what matters.
     · a `splash` panel takes a whole leaf, alone.
     · §§4–6 get the nine-grid feel: a rigid, even, three-row column, the one
       page in the book with no emphasis anywhere. Formal and documentary,
       which is what that material is.
     · captions ride the RTL Z: first box top-right, last box bottom-left.
     · templates rotate so no two consecutive leaves have the same shape.
*/
import { readFile, writeFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const M = JSON.parse(await readFile(new URL('panels.json', here), 'utf8'))
const S = JSON.parse(
  await readFile(new URL('../../web/src/lib/chapter3/passages.json', here), 'utf8'),
).passages

const text = (ref) => {
  const [sec, id] = ref.split('.')
  const f = (S[sec] ?? []).find((x) => x.id === id)
  if (!f) throw new Error(`missing ${ref}`)
  return [f.name, f.text].filter(Boolean).join(' — ')
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

/* ---- page templates. `slots` are grid-areas; the first slot is the biggest. ---- */
const T = {
  /* one wide establishing panel, two beats under it */
  lead3: { n: 3, css: 'grid-template-columns:1fr 1fr;grid-template-rows:1.5fr 1fr;',
           areas: ['1/1/2/3', '2/1/3/2', '2/2/3/3'] },
  /* two beats, then a wide one that lands.
     ⚠ `areas` IS IN READING ORDER, NEVER IN VISUAL ORDER. This template used to
     list the wide bottom panel first while placing it in the bottom row, so the
     page showed the chapter's second beat before its first — and it was in use
     on seven of the twenty-two pages. */
  land3: { n: 3, css: 'grid-template-columns:1fr 1fr;grid-template-rows:1fr 1.5fr;',
           areas: ['1/1/2/2', '1/2/2/3', '2/1/3/3'] },
  /* a tall panel beside two stacked — the busiest page shape */
  tall4: { n: 4, css: 'grid-template-columns:1.25fr 1fr;grid-template-rows:1fr 1fr 1fr;',
           areas: ['1/1/3/2', '1/2/2/3', '2/2/3/3', '3/1/4/3'] },
  /* six even — used once, for the register change */
  even6: { n: 6, css: 'grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr 1fr;',
           areas: ['1/1/2/2', '1/2/2/3', '2/1/3/2', '2/2/3/3', '3/1/4/2', '3/2/4/3'] },
  /* the nine-grid feel: rigid, even, no emphasis. §§4–6 only. */
  rigid3: { n: 3, css: 'grid-template-columns:1fr;grid-template-rows:1fr 1fr 1fr;',
            areas: ['1/1/2/2', '2/1/3/2', '3/1/4/2'] },
  splash: { n: 1, css: 'grid-template-columns:1fr;grid-template-rows:1fr;', areas: ['1/1/2/2'] },
}

/* ---- assign panels to leaves ---- */
const leaves = []
let i = 0
const rotation = ['lead3', 'tall4', 'land3', 'lead3', 'tall4', 'land3']
let r = 0
while (i < M.panels.length) {
  const p = M.panels[i]
  if (p.grid === 'splash') { leaves.push({ t: 'splash', ps: [p] }); i += 1; continue }
  if (p.grid === 'nine') {
    /* every consecutive nine-grid panel goes on one rigid page */
    const run = []
    while (i < M.panels.length && M.panels[i].grid === 'nine') run.push(M.panels[i++])
    leaves.push({ t: run.length === 6 ? 'even6' : 'rigid3', ps: run })
    continue
  }
  let name = rotation[r++ % rotation.length]
  let want = T[name].n
  const run = []
  while (run.length < want && i < M.panels.length &&
         M.panels[i].grid !== 'splash' && M.panels[i].grid !== 'nine') run.push(M.panels[i++])
  if (run.length < want) { name = run.length >= 3 ? 'lead3' : 'land3' }
  leaves.push({ t: name, ps: run })
}

/* ---- caption spots, walking the RTL Z: start top-right, end bottom-left ---- */
const SPOTS = [
  'top:8px;inset-inline-start:8px',
  'top:34%;inset-inline-end:8px',
  'bottom:8px;inset-inline-start:8px',
  'bottom:8px;inset-inline-end:8px',
]

/* TWO CAPTION SHAPES, and the reason is measured. Of this chapter's 96
   captions, 40% run past eighteen words and the longest is fifty-one. A
   floating box carrying fifty-one words swallows two thirds of its panel and
   reads as a sticker pasted on the art — which is exactly what looked wrong.
   Long captions get a BAND locked to the panel edge, full width, clear of the
   picture; short ones keep the floating box that was chosen. */
const LONG = 18
const panelHtml = (p, area) => {
  const boxes = p.captions.map((ref, k) => {
    const t = text(ref)
    const long = t.split(/\s+/).length > LONG
    const cls = long ? `band ${k === 0 ? 'top' : 'bottom'}` : 'box'
    return `<div class="${cls}" style="${long ? '' : SPOTS[k % 4]}">${esc(t)}</div>`
  }).join('')
  const bal = p.balloon ? `<div class="bal ${p.balloon.tail}">${esc(p.balloon.text)}</div>` : ''
  return `<figure class="pn" style="grid-area:${area}"><img src="art/${p.id}.jpg" alt="">` +
    `<span class="pid">${p.id}</span>${boxes}${bal}</figure>`
}

let pages = ''
let folio = 1
for (let l = 0; l < leaves.length; l += 2) {
  pages += '<div class="spread">'
  for (const [n, leaf] of [leaves[l], leaves[l + 1]].entries()) {
    if (!leaf) { pages += '<div class="leaf l blank"></div>'; continue }
    const tpl = T[leaf.t]
    const inner = leaf.ps.map((p, k) => panelHtml(p, tpl.areas[k])).join('')
    /* THE GUTTER SAYS WHETHER THIS IS ONE MOMENT OR A LATER ONE. A page whose
       panels all belong to one part is one continuous scene and gets a hairline
       gutter, so the panels read as a single field instead of as separate
       pictures; a page that crosses from one part to the next gets a wide one,
       which is what carries the passage of time. */
    const oneScene = new Set(leaf.ps.map((p) => p.part)).size === 1
    pages += `<div class="leaf ${n === 0 ? 'r' : 'l'}">` +
      `<div class="page ${oneScene ? 'tight' : 'loose'}" style="${tpl.css}">${inner}</div>` +
      `<span class="folio">${folio++}</span></div>`
  }
  pages += '</div>\n'
}

const html = `<meta charset="utf-8">
<title>פרק 3 · הקומיקס</title>
<style>
@font-face{font-family:"Kedem";src:url("../../web/public/assets/fonts/kedem-bold-aaa.otf") format("opentype");font-weight:700}
@font-face{font-family:"Kedem";src:url("../../web/public/assets/fonts/kedem-black-aaa.otf") format("opentype");font-weight:900}
@font-face{font-family:"Ploni";src:url("../../web/public/assets/fonts/ploni-regular-aaa.otf") format("opentype");font-weight:400}
:root{--paper:#EDE4D0;--panel:#f3ead6;--surface:#faf4e6;--edge:#d8c7a3;--maroon:#8a2733;
 --maroon-deep:#571820;--cream:#f5ecd6;--ink:#3c2c1d;--muted:#6f5c43;--gold:#c79a3c;
 --line:#4a3826;--shadow:0 14px 40px rgba(60,35,18,.18)}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--panel);color:var(--ink);direction:rtl;font-family:"Ploni",Arial,sans-serif;padding:40px 0 70px}
h1{font-family:"Kedem",serif;font-weight:900;font-size:44px;color:var(--maroon);text-align:center}
.sub{text-align:center;color:var(--muted);font-size:16px;margin:8px 0 34px}
.spread{display:flex;justify-content:center;margin:0 auto 34px;width:fit-content;box-shadow:var(--shadow)}
/* FULL BLEED WAS TRIED AND WAS WORSE — with no frame and no gutter the long
   caption bands had nothing holding them back, and two sand-toned panels
   meeting on a 2px rule read as one smeared picture. The frame is doing real
   work: it is what lets a panel end. */
.leaf{width:500px;height:690px;padding:14px;position:relative;background:var(--surface)}
.leaf.r{background:linear-gradient(to right,rgba(0,0,0,.075),transparent 11%),var(--surface)}
.leaf.l{background:linear-gradient(to left,rgba(0,0,0,.075),transparent 11%),var(--surface);
 border-inline-end:1px solid var(--edge)}
.leaf.blank{background:var(--surface)}
.page{display:grid;height:100%;gap:6px}
.page.loose{gap:14px}
.pn{position:relative;border:2.5px solid var(--line);overflow:hidden;background:var(--paper);min-height:0}
.pn img{display:block;width:100%;height:100%;object-fit:cover}
.pid{position:absolute;top:4px;inset-inline-end:5px;font-size:9px;color:var(--muted);
 background:rgba(250,244,230,.85);border:1px solid var(--edge);padding:0 4px}
.box{position:absolute;background:var(--surface);border:1.5px solid var(--line);
 padding:5px 8px;font-size:10.5px;line-height:1.42;max-width:52%}
/* the band: locked to an edge, full width, never floating over the middle */
.band{position:absolute;inset-inline:0;background:var(--surface);
 border-block:1.5px solid var(--line);padding:6px 11px;font-size:10.5px;line-height:1.45}
.band.top{top:0;border-top:0}
.band.bottom{bottom:0;border-bottom:0}
.bal{position:absolute;bottom:18px;inset-inline-end:22px;background:var(--surface);
 border:2.5px solid var(--line);border-radius:20px;padding:4px 12px;
 font-family:"Kedem",serif;font-weight:700;font-size:14px;color:var(--maroon-deep)}
.bal.none{inset-inline-end:auto;inset-inline-start:50%;transform:translateX(50%);bottom:auto;top:14%;
 box-shadow:0 0 30px 11px rgba(217,180,91,.42)}
/* the folio sits ON the art now — there is no margin left to put it in */
.folio{position:absolute;bottom:4px;inset-inline-start:16px;font-size:10px;color:var(--muted);letter-spacing:.1em}
</style>
<h1>ראשית חיי מוחמד</h1>
<p class="sub">${M.panels.length} פאנלים · ${leaves.length} עמודים · דפדוף מימין לשמאל</p>
${pages}`

await writeFile(new URL('book.html', here), html)
const shapes = leaves.reduce((a, l) => ((a[l.t] = (a[l.t] ?? 0) + 1), a), {})
console.log('book.html ·', M.panels.length, 'panels ·', leaves.length, 'pages ·', JSON.stringify(shapes))

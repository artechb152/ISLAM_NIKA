/* The comic, built from beats.json + panels75.json.

   Everything the earlier builder learned is kept: real page templates, size as
   pacing, reading order in `areas`, the RTL Z for caption placement. What
   changes is the text — captions are now short beats, so the long-caption band
   is gone and every box is a floating box again, which is treatment א. */
import { readFile, writeFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const M = JSON.parse(await readFile(new URL('panels75.json', here), 'utf8'))
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const T = {
  lead3: { n: 3, css: 'grid-template-columns:1fr 1fr;grid-template-rows:1.5fr 1fr;',
           areas: ['1/1/2/3', '2/1/3/2', '2/2/3/3'] },
  land3: { n: 3, css: 'grid-template-columns:1fr 1fr;grid-template-rows:1fr 1.5fr;',
           areas: ['1/1/2/2', '1/2/2/3', '2/1/3/3'] },
  tall4: { n: 4, css: 'grid-template-columns:1.25fr 1fr;grid-template-rows:1fr 1fr 1fr;',
           areas: ['1/1/3/2', '1/2/2/3', '2/2/3/3', '3/1/4/3'] },
  quad4: { n: 4, css: 'grid-template-columns:1fr 1fr;grid-template-rows:1.35fr 1fr;',
           areas: ['1/1/2/2', '1/2/2/3', '2/1/3/2', '2/2/3/3'] },
  rigid3: { n: 3, css: 'grid-template-columns:1fr;grid-template-rows:1fr 1fr 1fr;',
            areas: ['1/1/2/2', '2/1/3/2', '3/1/4/2'] },
  splash: { n: 1, css: 'grid-template-columns:1fr;grid-template-rows:1fr;', areas: ['1/1/2/2'] },
}

const leaves = []
let i = 0
const rotation = ['lead3', 'quad4', 'land3', 'tall4', 'lead3', 'land3']
let r = 0
while (i < M.panels.length) {
  const p = M.panels[i]
  if (p.grid === 'splash') { leaves.push({ t: 'splash', ps: [p] }); i++; continue }
  if (p.epilogue) {
    const run = []
    while (i < M.panels.length && M.panels[i].epilogue) run.push(M.panels[i++])
    /* the epilogue runs as rigid three-row pages: no emphasis anywhere */
    for (let k = 0; k < run.length; k += 3) leaves.push({ t: 'rigid3', ps: run.slice(k, k + 3) })
    continue
  }
  let name = rotation[r++ % rotation.length]
  const run = []
  while (run.length < T[name].n && i < M.panels.length &&
         M.panels[i].grid !== 'splash' && !M.panels[i].epilogue) run.push(M.panels[i++])
  if (run.length < T[name].n) name = run.length >= 3 ? 'lead3' : 'land3'
  leaves.push({ t: name, ps: run })
}

/* the RTL Z: the first box sits top-right, the last bottom-left */
const SPOTS = [
  'top:9px;inset-inline-start:9px',
  'bottom:9px;inset-inline-end:9px',
  'bottom:9px;inset-inline-start:9px',
]

const panelHtml = (p, area) => {
  const boxes = p.beats.map((b, k) =>
    `<div class="box${b.v ? ' v' : ''}" style="${SPOTS[k % 3]}">${esc(b.t)}</div>`).join('')
  const src = p.assetId
  return `<figure class="pn" style="grid-area:${area}"><img src="art/${src}.jpg" alt="">` +
    `<span class="pid">${p.id}</span>${boxes}</figure>`
}

let pages = ''
let folio = 1
for (let l = 0; l < leaves.length; l += 2) {
  pages += '<div class="spread">'
  for (const [n, leaf] of [leaves[l], leaves[l + 1]].entries()) {
    if (!leaf) { pages += '<div class="leaf l blank"></div>'; continue }
    const tpl = T[leaf.t]
    const inner = leaf.ps.map((p, k) => panelHtml(p, tpl.areas[k])).join('')
    const oneScene = new Set(leaf.ps.map((p) => p.part)).size === 1
    pages += `<div class="leaf ${n === 0 ? 'r' : 'l'}">` +
      `<div class="page ${oneScene ? 'tight' : 'loose'}" style="${tpl.css}">${inner}</div>` +
      `<span class="folio">${folio++}</span></div>`
  }
  pages += '</div>\n'
}

const beats = M.panels.reduce((a, p) => a + p.beats.length, 0)
const html = `<meta charset="utf-8">
<title>פרק 3 · הקומיקס</title>
<style>
@font-face{font-family:"Kedem";src:url("../../web/public/assets/fonts/kedem-bold-aaa.otf") format("opentype");font-weight:700}
@font-face{font-family:"Kedem";src:url("../../web/public/assets/fonts/kedem-black-aaa.otf") format("opentype");font-weight:900}
@font-face{font-family:"Ploni";src:url("../../web/public/assets/fonts/ploni-regular-aaa.otf") format("opentype");font-weight:400}
@font-face{font-family:"Ploni";src:url("../../web/public/assets/fonts/ploni-demibold-aaa.otf") format("opentype");font-weight:600}
:root{--paper:#EDE4D0;--panel:#f3ead6;--surface:#faf4e6;--edge:#d8c7a3;--maroon:#8a2733;
 --maroon-deep:#571820;--cream:#f5ecd6;--ink:#3c2c1d;--muted:#6f5c43;--gold:#c79a3c;
 --line:#4a3826;--shadow:0 14px 40px rgba(60,35,18,.18)}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--panel);color:var(--ink);direction:rtl;font-family:"Ploni",Arial,sans-serif;padding:40px 0 70px}
h1{font-family:"Kedem",serif;font-weight:900;font-size:44px;color:var(--maroon);text-align:center}
.sub{text-align:center;color:var(--muted);font-size:16px;margin:8px 0 34px}
.spread{display:flex;justify-content:center;margin:0 auto 34px;width:fit-content;box-shadow:var(--shadow)}
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
/* a beat is short, so the box is small — no bands are needed any more */
.box{position:absolute;background:var(--surface);border:1.5px solid var(--line);
 padding:5px 9px;font-size:12px;line-height:1.4;max-width:66%;font-weight:600}
/* a verse keeps the gold card it has everywhere else in the chapter */
.box.v{border:2px solid var(--gold);box-shadow:inset 0 0 0 2px rgba(199,154,60,.2);
 font-family:"Kedem",serif;font-weight:700;color:var(--maroon-deep);text-align:center}
.folio{position:absolute;bottom:4px;inset-inline-start:16px;font-size:10px;color:var(--muted);letter-spacing:.1em}
</style>
<h1>ראשית חיי מוחמד</h1>
<p class="sub">${M.panels.length} פאנלים · ${beats} ביטים · ${leaves.length} עמודים · דפדוף מימין לשמאל</p>
${pages}`

await writeFile(new URL('book.html', here), html)
console.log(`book.html · ${M.panels.length} panels · ${beats} beats · ${leaves.length} pages`)

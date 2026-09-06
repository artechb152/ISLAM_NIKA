/* THE MOCKUP — the chapter as it would be used.

   Rebuilt after three faults the reader named, all of them real:

   1 · TOO SMALL. A double spread on a screen halves every panel. Digital comics
       show ONE page at a time, and that is what this does now: the page fills
       the window's height, so a panel is about twice the size it was.

   2 · THE TURN WAS CROOKED, and it was my bug. `perspective` and
       `transform: scale()` sat on the SAME element, so the scale was applied
       after the 3-D projection and skewed it. Nothing is scaled now — the page
       is sized in real pixels and everything inside is proportional, so the
       rotation is a clean hinge.

   3 · THE READING ORDER WAS NOT LEGIBLE. The grid order was right and stacking
       the captions helped, but neither TELLS the reader anything. Every panel
       now carries its number on the reading edge. An instructional comic may
       say plainly what a trade comic leaves implicit.

   Content comes only from beats.json + panels75.json + art/. */
import { readFile, writeFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const M = JSON.parse(await readFile(new URL('panels75.json', here), 'utf8'))
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

/* LANDSCAPE PAGES. A portrait page cut in half across is two wide pages, and
   twice as many of them. Each holds one or two panels instead of three or four,
   so a panel is markedly larger even though the spread is the same width. */
const T = {
  duo: { n: 2, css: 'grid-template-columns:1fr 1fr;grid-template-rows:1fr;',
         areas: ['1/1/2/2', '1/2/2/3'] },
  wide2: { n: 2, css: 'grid-template-columns:1.5fr 1fr;grid-template-rows:1fr;',
           areas: ['1/1/2/2', '1/2/2/3'] },
  stack3: { n: 3, css: 'grid-template-columns:1.4fr 1fr;grid-template-rows:1fr 1fr;',
            areas: ['1/1/3/2', '1/2/2/3', '2/2/3/3'] },
  /* the epilogue keeps its rigid, unemphasised shape — now three across */
  rigid3: { n: 3, css: 'grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr;',
            areas: ['1/1/2/2', '1/2/2/3', '1/3/2/4'] },
  splash: { n: 1, css: 'grid-template-columns:1fr;grid-template-rows:1fr;', areas: ['1/1/2/2'] },
}

const leaves = []
let i = 0
const rotation = ['duo', 'wide2', 'stack3', 'duo', 'wide2', 'duo']
let r = 0
while (i < M.panels.length) {
  const p = M.panels[i]
  if (p.grid === 'splash') { leaves.push({ t: 'splash', ps: [p] }); i++; continue }
  if (p.epilogue) {
    const run = []
    while (i < M.panels.length && M.panels[i].epilogue) run.push(M.panels[i++])
    for (let k = 0; k < run.length; k += 3) leaves.push({ t: 'rigid3', ps: run.slice(k, k + 3) })
    continue
  }
  let name = rotation[r++ % rotation.length]
  const run = []
  while (run.length < T[name].n && i < M.panels.length &&
         M.panels[i].grid !== 'splash' && !M.panels[i].epilogue) run.push(M.panels[i++])
  if (run.length < T[name].n) name = run.length >= 2 ? 'duo' : 'splash'
  leaves.push({ t: name, ps: run })
}

const panelHtml = (p, area, n) => {
  const boxes = p.beats.map((b) =>
    `<div class="box${b.v ? ' v' : ''}">${esc(b.t)}</div>`).join('')
  return `<figure class="pn" style="grid-area:${area}">` +
    `<img src="art/${p.assetId}.jpg" alt="" loading="lazy">` +
    `<span class="num">${n}</span><div class="boxes">${boxes}</div></figure>`
}
/* ⚠ THE NUMBER IS THE PANEL'S PLACE IN THE STORY, never its place in the build.
   A running counter incremented inside leafHtml numbered whatever was rendered
   first — and the paginator builds page 2 (the cover's back) before page 1, so
   the right-hand page came out numbered 3 and 4 while the left read 1 and 2. */
const ORDER = new Map(M.panels.map((p, k) => [p.id, k + 1]))
const leafHtml = (leaf, folio) => {
  const tpl = T[leaf.t]
  const one = new Set(leaf.ps.map((p) => p.part)).size === 1
  return `<div class="pagebody"><div class="grid ${one ? 'tight' : 'loose'}" style="${tpl.css}">` +
    leaf.ps.map((p, k) => panelHtml(p, tpl.areas[k], ORDER.get(p.id))).join('') +
    `</div><span class="folio">${folio}</span></div>`
}

const COVER = `<div class="cover"><img src="art/cover.jpg" alt="">
  <div class="type"><div class="eyebrow">פרק שלישי</div><h1>ראשית חיי מוחמד</h1>
  <div class="rule"></div></div><div class="foot">אסלאם · דת ותרבות</div></div>`
const BLANK = '<div class="pagebody blank"></div>'
const page = (n) => (leaves[n] ? leafHtml(leaves[n], n + 1) : BLANK)

/* A SHEET HAS TWO FACES, and the pagination is what removes the blank.
   After n turns the reader sees sheet[n-1].BACK on the left and sheet[n].FRONT
   on the right, and in an RTL book the right page is the earlier one. So:
       right of the first spread = page 1  →  sheets[1].front = leaf 0
       left  of the first spread = page 2  →  sheets[0].back  = leaf 1
   Page 2 therefore lives on the back of the COVER, which is what the inside
   front cover is for. Nothing is blank and no title page was invented — the
   comic starts on both halves at once. */
const sheets = [{ f: COVER, b: page(1) }]
for (let k = 1; k * 2 - 2 < leaves.length; k++) {
  sheets.push({ f: page(2 * k - 2), b: page(2 * k + 1) })
}

const html = `<meta charset="utf-8">
<title>פרק 3 · ראשית חיי מוחמד</title>
<style>
@font-face{font-family:"Kedem";src:url("../../web/public/assets/fonts/kedem-bold-aaa.otf") format("opentype");font-weight:700}
@font-face{font-family:"Kedem";src:url("../../web/public/assets/fonts/kedem-black-aaa.otf") format("opentype");font-weight:900}
@font-face{font-family:"Ploni";src:url("../../web/public/assets/fonts/ploni-regular-aaa.otf") format("opentype");font-weight:400}
@font-face{font-family:"Ploni";src:url("../../web/public/assets/fonts/ploni-demibold-aaa.otf") format("opentype");font-weight:600}
:root{--paper:#EDE4D0;--panel:#f3ead6;--surface:#faf4e6;--edge:#d8c7a3;--maroon:#8a2733;
 --maroon-deep:#571820;--cream:#f5ecd6;--ink:#3c2c1d;--muted:#6f5c43;--gold:#c79a3c;
 --gold-soft:#d9b45b;--line:#4a3826;--header-height:56px}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:var(--panel);color:var(--ink);direction:rtl;
 font-family:"Ploni",Arial,sans-serif;overflow:hidden}
.masthead{background:var(--maroon-deep);color:var(--cream);height:var(--header-height);
 display:flex;align-items:center;justify-content:space-between;padding:0 26px;
 font-family:"Kedem",serif;font-weight:700;font-size:18px;letter-spacing:.04em;z-index:30;position:relative}
.masthead .back{font-family:"Ploni";font-size:14px;font-weight:600;opacity:.85}

.stage{height:calc(100vh - var(--header-height));display:grid;place-items:center;
 background:radial-gradient(circle at 50% 44%,#f7f1e1,var(--panel) 66%)}
/* PERSPECTIVE LIVES HERE AND NOTHING ELSE DOES. perspective and a scale on one
   element means the scale is applied after the 3-D projection, which skews it —
   that is exactly why the turn looked crooked. The book is never scaled; it is
   sized in real pixels and everything inside it is proportional. */
.book{position:relative;perspective:2600px;--u:1;transition:width .45s ease .15s}
.book::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:20;
 box-shadow:0 24px 58px rgba(60,35,18,.26)}
/* the two halves under the sheets: what you have already turned past, and what
   is still to come */
.under{position:absolute;inset:0;display:flex;transition:opacity .35s ease .25s}
.book.closed .under{opacity:0}
.half{width:50%;height:100%;background:var(--surface)}
.half.l{background:linear-gradient(to left,rgba(0,0,0,.085),transparent 12%),var(--surface)}
.half.r{background:linear-gradient(to right,rgba(0,0,0,.085),transparent 12%),var(--surface)}

/* each sheet is the RIGHT leaf, hinged on the spine — its own left edge */
.sheet{position:absolute;top:0;inset-inline-start:0;width:50%;height:100%;
 transform-origin:left center;transform-style:preserve-3d;cursor:pointer;
 transition:transform .8s cubic-bezier(.36,.05,.24,1)}
.book.closed .sheet{width:100%}
.sheet .face{position:absolute;inset:0;backface-visibility:hidden;overflow:hidden;
 background:var(--surface);box-shadow:0 0 0 1px var(--edge)}
.sheet .face.back{transform:rotateY(180deg)}
.sheet.turned{transform:rotateY(-180deg)}

.pagebody{width:100%;height:100%;padding:2.6%;position:relative;background:var(--surface)}
.grid{display:grid;height:100%;gap:1%}
.grid.loose{gap:2.2%}
.pn{position:relative;border:3px solid var(--line);overflow:hidden;background:var(--paper);min-height:0}
.pn img{display:block;width:100%;height:100%;object-fit:cover}
/* THE PANEL NUMBER. The grid order was already right and stacked captions
   helped, but neither states the order. An instructional comic may. */
.num{position:absolute;top:0;inset-inline-start:0;z-index:3;
 min-width:calc(27px * var(--u));height:calc(27px * var(--u));display:grid;place-items:center;
 padding:0 calc(7px * var(--u));
 background:var(--maroon-deep);color:var(--cream);
 font-family:"Kedem",serif;font-weight:700;font-size:calc(14px * var(--u));font-variant-numeric:tabular-nums}
/* THE BOXES OPEN OUT THE MIDDLE OF THE PANEL.
   Stacked tight at the top they read in order but they also sat as one slab
   over the picture, and on a big landscape panel that slab covered the subject.
   Spread along the reading edge — first at the top, last at the bottom — the
   order is still top-to-bottom on one edge, which is what made it legible, and
   the centre of the picture is free. Narrower too: 46% instead of 72%. */
.boxes{position:absolute;z-index:2;
 top:calc(33px * var(--u));bottom:calc(10px * var(--u));
 inset-inline-start:calc(9px * var(--u));
 display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;
 gap:calc(8px * var(--u));max-width:46%;pointer-events:none}
.box{background:var(--surface);border:1.5px solid var(--line);
 padding:calc(6px * var(--u)) calc(11px * var(--u));
 font-size:calc(15px * var(--u));line-height:1.4;font-weight:600}
.box.v{border:2px solid var(--gold);box-shadow:inset 0 0 0 2px rgba(199,154,60,.2);
 font-family:"Kedem",serif;font-weight:700;color:var(--maroon-deep);text-align:center}
.folio{position:absolute;bottom:8px;inset-inline-start:20px;font-size:11px;color:var(--muted);letter-spacing:.1em}

.cover{width:100%;height:100%;position:relative;overflow:hidden;background:var(--maroon-deep)}
.cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cover::after{content:"";position:absolute;inset:0;
 background:linear-gradient(to bottom,rgba(24,14,6,.6) 0%,rgba(24,14,6,.16) 42%,transparent 64%)}
.cover .type{position:absolute;inset-inline:0;top:6%;z-index:2;text-align:center;padding:0 8%}
.cover .eyebrow{font-size:14px;letter-spacing:.34em;color:var(--gold-soft);font-weight:600;margin-bottom:16px}
.cover h1{font-family:"Kedem",serif;font-weight:900;font-size:54px;color:var(--cream);
 line-height:1.05;text-shadow:0 3px 22px rgba(20,10,4,.72)}
.cover .rule{width:88px;height:2px;background:var(--gold);margin:20px auto 0;opacity:.9}
.cover .foot{position:absolute;inset-inline:0;bottom:4%;z-index:2;text-align:center;
 font-size:13px;letter-spacing:.22em;color:rgba(245,236,214,.74)}

/* THE CONTROLS SIT AT THE WINDOW'S EDGES, off the page entirely. A button bar
   under the page crowded it and read as a toolbar bolted onto a book. */
.arrow{position:fixed;top:50%;transform:translateY(-50%);z-index:30;
 width:54px;height:104px;border:0;cursor:pointer;background:none;
 font-family:"Kedem",serif;font-size:46px;line-height:1;color:var(--maroon);
 opacity:.4;transition:opacity .2s ease}
.arrow:hover{opacity:1}
.arrow:disabled{opacity:.1;cursor:default}
.arrow.next{inset-inline-start:16px}
.arrow.prev{inset-inline-end:16px}
.count{position:fixed;bottom:14px;inset-inline:0;text-align:center;z-index:30;
 font-size:13px;color:var(--muted);letter-spacing:.14em;font-variant-numeric:tabular-nums}
.hint{position:fixed;top:calc(var(--header-height) + 12px);inset-inline-end:20px;z-index:30;
 font-size:12px;color:var(--muted)}
</style>

<div class="masthead"><span>אסלאם · דת ותרבות</span><span class="back">03 · ראשית חיי מוחמד</span></div>
<div class="stage"><div class="book" id="book"></div></div>
<div class="hint">← → לדפדוף · לחיצה על העמוד</div>
<button class="arrow next" id="next" aria-label="העמוד הבא">‹</button>
<button class="arrow prev" id="prev" aria-label="העמוד הקודם">›</button>
<span class="count" id="count"></span>

<script>
const SHEETS = ${JSON.stringify(sheets)};
const PAGES = ${leaves.length};
const book = document.getElementById('book');
const count = document.getElementById('count');
const els = [];

const under = document.createElement('div');
under.className = 'under';
under.innerHTML = '<div class="half l"></div><div class="half r"></div>';
book.appendChild(under);

SHEETS.forEach((s) => {
  const el = document.createElement('div');
  el.className = 'sheet';
  el.innerHTML = '<div class="face front">' + s.f + '</div>' +
                 '<div class="face back">' + s.b + '</div>';
  el.addEventListener('click', () => turn(1));
  book.appendChild(el);
  els.push(el);
});

/* sized in real pixels to whatever the window leaves, at the page's own
   500:690 proportion. Nothing is transform-scaled. */
/* THE PAGE IS SCREEN-SHAPED, NOT BOOK-SHAPED. At a paper proportion of 500:690
   it filled 76% of the window's height and 34% of its width — tall, thin, and
   ringed by empty stage, which is why "one big page" did not read as big at
   all. A page made for a screen takes the screen's proportion and fills it. */
function fit() {
  const availW = innerWidth - 150;
  const availH = innerHeight - 56 - 52;
  /* two landscape pages side by side: each 690x500, so the spread is 1380x500 */
  const ASPECT = 1380 / 500;
  const w = Math.min(availW, Math.round(availH * ASPECT));
  const h = Math.round(w / ASPECT);
  book.style.width = (at === 0 ? w / 2 : w) + 'px';
  book.style.height = h + 'px';
  /* one unit for everything inside: the page's share of its design height */
  book.style.setProperty('--u', String(h / 500));
}
addEventListener('resize', fit);

let at = 0;
function render() {
  book.classList.toggle('closed', at === 0);
  fit();
  els.forEach((el, i) => {
    el.classList.toggle('turned', i < at);
    el.style.zIndex = String(i < at ? i + 1 : SHEETS.length - i);
  });
  document.getElementById('prev').disabled = at === 0;
  document.getElementById('next').disabled = at >= SHEETS.length - 1;
  count.textContent = at === 0 ? 'לחצו לפתיחה' : Math.min(at * 2, PAGES) + ' / ' + PAGES;
}
function turn(d) {
  const n = at + d;
  if (n < 0 || n > SHEETS.length - 1) return;
  at = n; render();
}
document.getElementById('next').addEventListener('click', (e) => { e.stopPropagation(); turn(1) });
document.getElementById('prev').addEventListener('click', (e) => { e.stopPropagation(); turn(-1) });
/* RTL: left is forward */
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') turn(1);
  if (e.key === 'ArrowRight') turn(-1);
});
fit(); render();
</script>`

await writeFile(new URL('mockup.html', here), html)
console.log(`mockup.html · single page · ${leaves.length} pages · ${sheets.length} sheets`)

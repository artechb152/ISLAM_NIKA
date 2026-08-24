/* Playwright visual tour of chapter 1 — screenshots of every region and every
   UI surface, rendered on the real GPU (ANGLE/D3D11), the way a player sees it.
   Diagnostic only; changes nothing. */
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const LIB = join(HERE, '..', 'src', 'lib', 'chapter1')
const OUT = join(HERE, 'tour')
const BASE = 'http://localhost:3000'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ORDER = ['yemen-heights', 'night-camp', 'border-post', 'narrow-pass', 'loading-road',
               'yathrib', 'monastery', 'mecca', 'exit']

function entries(file) {
  const src = readFileSync(join(LIB, file), 'utf8'); const out = []
  for (const b of src.split(/\n {2}\{/).slice(1)) {
    const id = /id:\s*'([^']+)'/.exec(b), region = /region:\s*'([^']+)'/.exec(b)
    const x = /\bx:\s*(-?[\d.]+)/.exec(b), z = /\bz:\s*(-?[\d.]+)/.exec(b)
    if (id && region && x && z) out.push({ id: id[1], region: region[1], x: +x[1], z: +z[1] })
  }
  return out
}
const FINDS = entries('finds.ts')
const CAST = [...readFileSync(join(LIB, 'placements.ts'), 'utf8')
  .matchAll(/who:\s*'([^']+)',\s*x:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+)/g)]
  .map((m) => ({ who: m[1], x: +m[2], z: +m[3] }))
const HOME = { envoy: 'border-post', jewish: 'yathrib', chief: 'narrow-pass',
               monk: 'monastery', merchant: 'mecca' }
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
})

for (const region of ORDER) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } })
  const pg = await ctx.newPage()
  await pg.goto(`${BASE}/chapter1?region=${region}`, { waitUntil: 'networkidle', timeout: 90000 })
  await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1') })
  await pg.reload({ waitUntil: 'networkidle' })
  await wait(1500)

  if (region === ORDER[0]) {
    // WebGL renderer string — proves hardware vs software rendering
    const gl = await pg.evaluate(() => {
      const c = document.createElement('canvas'); const g = c.getContext('webgl2')
      const ext = g.getExtension('WEBGL_debug_renderer_info')
      return ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'
    })
    console.log('GL RENDERER:', gl)
    await pg.screenshot({ path: join(OUT, `00-opening.png`) })
  }

  for (const b of await pg.$$('button')) {
    const t = await b.innerText().catch(() => '')
    if (t.includes('התחילו')) { await b.click(); break }
  }
  let alive = false
  for (let t = 0; t < 40; t++) { await wait(1000); alive = await pg.evaluate(() => !!window.__ch1Live).catch(() => false); if (alive) break }
  if (!alive) { console.log(region, 'NEVER STARTED'); await ctx.close(); continue }
  // arrival board — capture it once, then wait out
  if (region === ORDER[0]) { await wait(1200); await pg.screenshot({ path: join(OUT, `01-arrival-board.png`) }) }
  for (let t = 0; t < 25; t++) {
    const gone = await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') })
    if (gone) break; await wait(700)
  }
  await wait(2600)
  // dismiss auto narration if any
  for (let i = 0; i < 20; i++) {
    const open = await pg.evaluate(() => !!document.querySelector('.hud-dialogue'))
    if (!open) break; await pg.keyboard.press('Space'); await wait(350)
  }
  await wait(800)
  await pg.screenshot({ path: join(OUT, `${region}-1-entry.png`) })

  // walk forward a bit for a mid-region view (real keys, real frames)
  await pg.keyboard.down('KeyW'); await wait(3500); await pg.keyboard.up('KeyW'); await wait(600)
  await pg.screenshot({ path: join(OUT, `${region}-2-walk.png`) })

  // near a find
  const f = FINDS.find((x) => x.region === region)
  if (f) {
    await pg.evaluate(({ x, z }) => window.__ch1Live.player.set(x, 0, z + 2.2), { x: f.x, z: f.z })
    await wait(1500)
    await pg.screenshot({ path: join(OUT, `${region}-3-find.png`) })
    if (region === 'border-post') {
      await pg.evaluate(({ x, z }) => window.__ch1Live.player.set(x, 0, z + 0.9), { x: f.x, z: f.z })
      await wait(1200); await pg.keyboard.press('KeyF'); await wait(1200)
      await pg.screenshot({ path: join(OUT, `ui-find-card.png`) })
      await pg.keyboard.press('Space'); await wait(500)
    }
  }
  // near the region's person, open dialogue
  const p = CAST.find((c) => HOME[c.who] === region)
  if (p) {
    await pg.evaluate(({ x, z }) => window.__ch1Live.player.set(x, 0, z + 1.8), { x: p.x, z: p.z })
    await wait(1600)
    await pg.screenshot({ path: join(OUT, `${region}-4-person.png`) })
    await pg.keyboard.press('KeyE'); await wait(2500)
    await pg.screenshot({ path: join(OUT, `${region}-5-dialogue.png`) })
    for (let i = 0; i < 20; i++) {
      const open = await pg.evaluate(() => !!document.querySelector('.hud-dialogue'))
      if (!open) break; await pg.keyboard.press('Space'); await wait(300)
    }
  }
  if (region === 'mecca') {
    await pg.keyboard.press('KeyJ'); await wait(1200)
    await pg.screenshot({ path: join(OUT, `ui-notebook.png`) })
    await pg.keyboard.press('KeyJ'); await wait(400)
    await pg.keyboard.press('KeyM'); await wait(1200)
    await pg.screenshot({ path: join(OUT, `ui-worldmap.png`) })
    await pg.keyboard.press('KeyM'); await wait(300)
  }
  await ctx.close()
  console.log(region, 'done')
}
await browser.close()
console.log('tour complete →', OUT)

/* M opens the map, and nothing else.
 *
 * The model view — the camera lifting away to look down at the two travellers
 * as a diorama — belongs to the gesture that carries you between regions, and
 * to nothing else. It used to have a key as well, and a dead `live.modelView`
 * flag outlived the change: the state existed, the HUD chip that announced it
 * existed, and neither could ever turn on.
 *
 * Two separate things have to stay true, and reading the source proves neither:
 *   1. M puts the map on screen and no diorama camera with it.
 *   2. Leaving a region still lifts the camera — `riseAt` is stamped and the
 *      rise plays — so the chapter still ends the way it was staged to.
 *
 *   node scripts/check-keys.mjs
 */
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chromium } from 'playwright-core'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '..', 'scratchpad/keys')
const BASE = process.env.BASE || `http://localhost:${process.env.PORT || 3000}`
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].filter(Boolean).find((p) => existsSync(p))
if (!CHROME) { console.error('no Chrome'); process.exit(1) }
mkdirSync(OUT, { recursive: true })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const REGION = 'night-camp'
const problems = []

const br = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } })
const pg = await ctx.newPage()
await pg.goto(`${BASE}/chapter1?region=${REGION}`, { waitUntil: 'networkidle', timeout: 120000 })
await pg.evaluate((r) => {
  localStorage.setItem('ch1:intro:v1', '1')
  localStorage.setItem(`ch1:arrived:${r}:v1`, '1')
}, REGION)

const start = pg.getByRole('button', { name: /התחילו|המשיכו/ })
let live = false
for (let t = 0; t < 50; t++) {
  live = await pg.evaluate(() => !!window.__ch1Live).catch(() => false)
  if (live) break
  if (await start.isVisible().catch(() => false)) await start.click({ timeout: 2000 }).catch(() => {})
  await wait(1200)
}
if (!live) { console.error('the scene never started'); await br.close(); process.exit(1) }
for (let t = 0; t < 25; t++) {
  if (await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') })) break
  await wait(600)
}
for (let i = 0; i < 25; i++) {
  if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
  await pg.keyboard.press('Space'); await wait(300)
}

// ── 1. M ────────────────────────────────────────────────────────────────────
const before = await pg.evaluate(() => ({ rise: window.__ch1Live.riseAt || 0 }))
await pg.keyboard.press('KeyM')
await wait(1400)
const onM = await pg.evaluate(() => ({
  map: !!document.querySelector('.hud-map, .ch1-map, [class*="map"]'),
  /* the chip the old model view announced itself with, and the flag behind it */
  chip: !!document.querySelector('.ch1-model-chip'),
  modelFlag: 'modelView' in window.__ch1Live ? window.__ch1Live.modelView : 'absent',
  rise: window.__ch1Live.riseAt || 0,
}))
await pg.screenshot({ path: join(OUT, '1-after-M.png') })

if (!onM.map) problems.push('M did not put a map on screen')
if (onM.chip) problems.push('M brought up the model-view chip — it should open the map and nothing else')
if (onM.modelFlag !== 'absent') problems.push(`live.modelView still exists (${onM.modelFlag}); the model view must not hang off a key`)
if (onM.rise !== before.rise) problems.push('M changed riseAt — it is reaching the diorama camera')
console.log(`  M → map on screen: ${onM.map ? 'yes' : 'NO'} · model-view chip: ${onM.chip ? 'YES' : 'no'} · live.modelView: ${onM.modelFlag} · riseAt unchanged: ${onM.rise === before.rise ? 'yes' : 'NO'}`)

await pg.keyboard.press('Escape')
await wait(900)

// ── 1.5 שער ליבה: קדימה בלי ליבה = עצירה דיאגטית, לא מעבר ─────────────────
/* המחנה עם ליבה חסרה (rawi-intro + תכנון המסלול): כניסה לשער קדימה חייבת
   שלא לנווט, לא להרים riseAt, וכן להעלות את שורת ההסבר של ראווי. */
await pg.evaluate(() => { window.__ch1Live.player.set(0, 0, -20) })
let heldLine = null
for (let i = 0; i < 12; i++) {
  await wait(400)
  heldLine = await pg.evaluate(() => document.querySelector('.hud-dialogue .is-full')?.textContent ?? null).catch(() => null)
  if (heldLine) break
}
const heldRise = await pg.evaluate(() => window.__ch1Live?.riseAt || 0).catch(() => 0)
const heldUrl = await pg.evaluate(() => window.location.search).catch(() => '')
const heldOk = !!heldLine && heldLine.includes('עוד לא סיימנו') && heldRise === 0 && heldUrl.includes('night-camp')
console.log(`  core gate holds the forward exit: ${heldOk ? 'yes' : 'NO'} (${heldLine ? 'ראווי הסביר' : 'no line'})`)
if (!heldOk) problems.push('the forward gate let an unfinished region go — or held it silently')
/* לסגור את שורת ההסבר ולהשלים את הליבה דרך ה-store, כמו שחקן שסיים */
await pg.keyboard.press('Space'); await wait(400)
await pg.keyboard.press('Space'); await wait(400)
await pg.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('ch1:notebook:v1') ?? '{"seen":[],"entries":[],"region":"night-camp","found":[],"solved":[]}')
  if (!s.seen.includes('rawi-intro')) s.seen.push('rawi-intro')
  if (!s.entries.includes(2)) s.entries.push(2)
  if (!s.solved.includes('task-plan-route')) s.solved.push('task-plan-route')
  localStorage.setItem('ch1:notebook:v1', JSON.stringify(s))
})
await pg.reload({ waitUntil: 'networkidle' })
{
  const start2 = pg.getByRole('button', { name: /התחילו|המשיכו/ })
  for (let t = 0; t < 30; t++) {
    if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break
    if (await start2.isVisible().catch(() => false)) await start2.click({ timeout: 2000 }).catch(() => {})
    await wait(1000)
  }
  for (let i = 0; i < 10; i++) {
    if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')).catch(() => false))) break
    await pg.keyboard.press('Space'); await wait(300)
  }
  /* מחוץ לשער, כדי שהמעבר ייורה מחדש בכניסה */
  await pg.evaluate(() => { window.__ch1Live.player.set(0, 0, -10) }).catch(() => {})
  await wait(600)
}

// ── 2. the gate still lifts the camera ──────────────────────────────────────
/* Walk into the onward gate by standing on it: the transition stamps riseAt
   and the camera climbs to the diorama pose for the length of the hand-off. */
const gate = await pg.evaluate(() => {
  const l = window.__ch1Live
  return l && l.__gate ? l.__gate : null
})
await pg.evaluate(() => {
  /* the night camp's road out — the layout's own exit, read at runtime */
  const l = window.__ch1Live
  l.player.set(0, 0, -20)
})
let rose = 0
for (let i = 0; i < 30; i++) {
  await wait(400)
  rose = await pg.evaluate(() => window.__ch1Live?.riseAt || 0).catch(() => 0)
  if (rose > 0) break
}
/* The hand-off is a full document load, so from here the page may already be
   navigating — a screenshot that misses is not a failure of the thing tested. */
if (rose) await wait(700)
await pg.screenshot({ path: join(OUT, '2-at-gate.png'), timeout: 8000 }).catch(() => {})
console.log(`  leaving the region stamps riseAt: ${rose > 0 ? 'yes' : 'NO'}${gate ? '' : ''}`)
if (!rose) problems.push('walking out of the region never stamped riseAt — the model-view hand-off did not fire')

await br.close()
if (problems.length) {
  console.error('\nkey/camera check FAILED:\n')
  for (const p of problems) console.error('  ✗ ' + p)
  console.error('')
  process.exit(1)
}
console.log('\n  M opens the map only, and the region hand-off still lifts to the model view.\n')

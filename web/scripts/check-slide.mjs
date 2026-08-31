/* Do the feet keep up with the ground?
 *
 * The one question the whole locomotion fix turns on, asked of the running
 * game rather than of the source. Hold a key, sample the traveller's world
 * position and the walk clip's own playhead together, and divide: metres of
 * ground per loop of the clip. If that number is the same at a walk and at a
 * run, the feet are planted. If it climbs with speed, the character is
 * skating — which is exactly what `1.43 * sqrt(gait)` did, because a square
 * root cannot track a linear distance at more than one speed.
 *
 * Read the RATIO, not the speeds. Under SwiftShader the render loop manages a
 * couple of frames a second, and both the body and the clip only advance on a
 * rendered frame — so a 2.6 m/s walk measures as 0.09 m/s here. That is the
 * harness's renderer, not the game. Ground-per-loop divides one by the other
 * and is exactly what a slide is, at any frame rate.
 *
 * Proven against the bug it was written for: with the old `1.43·√gait` the run
 * reports 2.88 m per loop against the walk's 1.89 — a 52% skate — and with the
 * linear law both report 1.90.
 *
 * Needs a server on :3000.
 *
 *   node scripts/check-slide.mjs
 */
import { existsSync } from 'node:fs'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE || `http://localhost:${process.env.PORT || 3000}`
/* The loading road is the longest clear stretch in the chapter — 36 m of bound
   with the road running down the middle, and nothing to walk into for 50 m. */
const REGION = process.env.REGION || 'loading-road'
const SPAWN = { x: 0.8, z: 18 }
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].filter(Boolean).find((p) => existsSync(p))
if (!CHROME) { console.error('no Chrome'); process.exit(1) }

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const br = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
const ctx = await br.newContext({ viewport: { width: 1100, height: 620 } })
const pg = await ctx.newPage()
await pg.goto(`${BASE}/chapter1?region=${REGION}`, { waitUntil: 'networkidle', timeout: 120000 })
await pg.evaluate((r) => {
  localStorage.setItem('ch1:intro:v1', '1')
  localStorage.setItem(`ch1:arrived:${r}:v1`, '1')
}, REGION)

const start = pg.getByRole('button', { name: /התחילו/ })
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
/* clear anything that opened, so movement is not blocked */
for (let i = 0; i < 25; i++) {
  if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break
  await pg.keyboard.press('Space'); await wait(300)
}

/* The debug block already publishes the walk action; ask it for the playhead
   too, through the same handle the game exposes. */
const sample = () => pg.evaluate(() => {
  const l = window.__ch1Live
  const d = window.__ch1Walk
  return {
    x: l.player.x, z: l.player.z, keys: l.keys ? l.keys.size : -1,
    talking: !!document.querySelector('.hud-dialogue, .ch1-find, .ch1-task'),
    clip: d ? d.phase : null, dur: d ? d.clip : 1.042, w: d ? d.weight : null, ts: d ? d.timeScale : null,
  }
})

async function leg(label, keys, ms) {
  /* Start from where the region actually puts the traveller. Teleporting to
     the origin dropped him inside the camp's own props, and a body walking
     into a collider reports full speed while covering no ground — the first
     run of this harness measured 0.00 m/s and blamed the animation. */
  await pg.evaluate((s) => { window.__ch1Live.player.set(s.x, 0, s.z) }, SPAWN)
  await wait(600)
  for (const k of keys) await pg.keyboard.down(k)
  /* Wait for the body to actually be moving before the clock starts. A fixed
     ramp delay was not enough: the arrival plate and the region's opening line
     hold movement for a couple of seconds after the teleport, and measuring
     through that stretch reported 0.17 m/s for a 2.6 m/s walk. */
  let started = false
  for (let i = 0; i < 40; i++) {
    const p = await sample(); await wait(150); const q = await sample()
    if (Math.hypot(q.x - p.x, q.z - p.z) > 0.05) { started = true; break }
  }
  if (!started) { console.log(`  ${label}: never started moving — something is blocking input`); for (const k of keys) await pg.keyboard.up(k); return null }
  const a = await sample()
  /* A real keyboard auto-repeats, and the game leans on that: anything that
     opens a panel calls `live.keys.clear()`, so a single synthetic keydown
     leaves the traveller stopped for good while the harness still "holds" the
     key. Re-pressing at roughly the OS repeat rate is what a hand does. */
  const until = Date.now() + ms
  let stalled = 0
  while (Date.now() < until) {
    await wait(120)
    const s = await sample()
    if (s.keys === 0) { stalled++; for (const k of keys) await pg.keyboard.down(k) }
  }
  const b = await sample()
  for (const k of keys) await pg.keyboard.up(k)
  await wait(600)
  if (stalled) console.log(`     (input was cleared ${stalled}× mid-leg and re-pressed)`)
  const dist = Math.hypot(b.x - a.x, b.z - a.z)
  if (a.clip === null) { console.log(`  ${label}: moved ${dist.toFixed(2)}m — clip playhead not exposed`); return null }
  const speed = dist / (ms / 1000)
  const loops = (b.clip - a.clip) / b.dur
  const perLoop = loops > 0.01 ? dist / loops : NaN
  console.log(`  ${label.padEnd(6)} speed ${speed.toFixed(2)} m/s · timeScale ${(b.ts ?? 0).toFixed(2)} · ${loops.toFixed(2)} clip loops · ${perLoop.toFixed(2)} m per loop`)
  return perLoop
}

console.log('\nground covered per loop of the walk clip — this should not change with speed\n')
const w = await leg('walk', ['KeyW'], 3000)
const r = await leg('run', ['KeyW', 'ShiftLeft'], 3000)
if (w && r && isFinite(w) && isFinite(r)) {
  const drift = Math.abs(r - w) / w
  console.log(`\n  run differs from walk by ${(drift * 100).toFixed(0)}%`)
  console.log(drift < 0.08 ? '  ✓ the feet keep up with the ground at both speeds\n'
                           : '  ✗ the stride does not match the ground — the character is sliding\n')
}
await br.close()

/* Stand next to one person and hear them out, capturing every line.
 *
 * `explore.mjs` watches a region open; this one plays a single conversation
 * through, screenshotting each line as it lands. It is how you check that a
 * rewritten exchange actually reads as two people talking — the portrait and
 * the name in the panel change with the speaker, and that is only visible in
 * the picture.
 *
 *   node scripts/play-scene.mjs --region yathrib --who jewish [--out dir]
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chromium } from 'playwright-core'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, '..')
const arg = (f, d) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : d }
const REGION = arg('--region', 'yathrib')
const WHO = arg('--who', null)
const OUT = join(WEB, arg('--out', `scratchpad/scene-${REGION}`))
const BASE = process.env.BASE || `http://localhost:${process.env.PORT || 3000}`

const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].filter(Boolean).find((p) => existsSync(p))
if (!CHROME) { console.error('no Chrome'); process.exit(1) }
mkdirSync(OUT, { recursive: true })

/* where the cast stands, straight out of the table the game reads */
const cast = [...readFileSync(join(WEB, 'src/lib/chapter1/placements.ts'), 'utf8')
  .matchAll(/who:\s*'([^']+)',\s*x:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+)/g)]
  .map((m) => ({ who: m[1], x: +m[2], z: +m[3] }))
const target = WHO ? cast.find((c) => c.who === WHO) : null

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const br = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
})
const ctx = await br.newContext({ viewport: { width: 1440, height: 810 }, locale: 'he-IL' })
const pg = await ctx.newPage()
const errs = []
pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 180)))

await pg.goto(`${BASE}/chapter1?region=${REGION}`, { waitUntil: 'networkidle', timeout: 120000 })
await pg.evaluate((r) => {
  localStorage.setItem('ch1:intro:v1', '1')
  localStorage.setItem(`ch1:arrived:${r}:v1`, '1')
}, REGION)
/* The splash button has to be clicked after React has hydrated, and clicking it
   once is not proof it took: the first attempt landed on a button whose handler
   was not attached yet and the harness then waited a full minute at the title
   screen. Keep offering until the scene answers. */
const start = pg.getByRole('button', { name: /התחילו|המשיכו/ })
let live = false
for (let t = 0; t < 50; t++) {
  live = await pg.evaluate(() => !!window.__ch1Live).catch(() => false)
  if (live) break
  if (await start.isVisible().catch(() => false)) await start.click({ timeout: 2000 }).catch(() => {})
  await wait(1200)
}
if (!live) {
  console.error(`the scene never came up on ${BASE}/chapter1?region=${REGION} — window.__ch1Live is still undefined.`)
  console.error('errors seen: ' + (errs.join(' | ') || 'none'))
  await pg.screenshot({ path: join(OUT, 'never-started.png') })
  await br.close()
  process.exit(1)
}
for (let t = 0; t < 25; t++) {
  if (await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') })) break
  await wait(600)
}
await wait(2500)

/** read the panel: who is speaking, what they say, whose face is shown */
const panel = () => pg.evaluate(() => {
  const d = document.querySelector('.hud-dialogue')
  if (!d) return null
  const img = d.querySelector('img.hud-portrait')
  return {
    name: (d.querySelector('.hud-title')?.textContent || '').split('·')[0].trim(),
    face: img ? (img.getAttribute('src') || '').split('/').pop() : '(narrator)',
    text: (d.querySelector('p.is-full')?.textContent || '').trim(),
    choices: [...d.querySelectorAll('.hud-choices button')].map((b) => b.innerText.trim()),
    done: !!d.querySelector('.hud-dialogue-count')?.textContent?.includes('✓'),
  }
})

/* clear whatever opened on arrival before walking to the person */
for (let i = 0; i < 20 && (await panel()); i++) { await pg.keyboard.press('Space'); await wait(320) }

if (target) {
  await pg.evaluate(({ x, z }) => window.__ch1Live.player.set(x, 0, z + 1.6), target)
  for (let t = 0; t < 30; t++) { if (await pg.evaluate((w) => window.__ch1Live.nearWho === w, WHO)) break; await wait(350) }
}

const script = []
let shot = 0
for (let round = 0; round < 6; round++) {
  if (target && !(await pg.evaluate(() => window.__ch1Live.nearWho))) break
  await pg.keyboard.press(target ? 'KeyE' : 'KeyR')
  await wait(900)
  if (!(await panel())) break
  /* walk the lines one at a time, twice per line: once to finish the typing,
     once to move on — the same two presses a player makes */
  for (let step = 0; step < 40; step++) {
    const p = await panel()
    if (!p) break
    const last = script[script.length - 1]
    if (!last || last.text !== p.text) {
      script.push(p)
      await pg.screenshot({ path: join(OUT, `${String(++shot).padStart(2, '0')}-${p.name.replace(/\s/g, '')}.png`) })
    }
    if (p.choices.length) break
    await pg.keyboard.press('Space')
    await wait(520)
  }
  const p = await panel()
  if (p?.choices.length) { await pg.keyboard.press('Space'); await wait(500) }
  for (let i = 0; i < 10 && (await panel()); i++) { await pg.keyboard.press('Space'); await wait(300) }
  await wait(400)
}

console.log(`\n${REGION} — ${WHO ?? 'rawi'} · ${script.length} lines\n`)
let prev = null
for (const s of script) {
  const turn = s.name !== prev ? `\n  ${s.name}  [${s.face}]` : ''
  if (turn) console.log(turn)
  console.log(`    ${s.text}`)
  prev = s.name
}
const voices = [...new Set(script.map((s) => s.name))]
console.log(`\n  voices heard: ${voices.join(' / ')}  (${voices.length})`)
if (errs.length) console.log('  errors: ' + errs.join(' | '))
writeFileSync(join(OUT, 'script.json'), JSON.stringify(script, null, 2), 'utf8')
await br.close()

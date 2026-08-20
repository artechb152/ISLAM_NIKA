/* Plays the whole chapter in a browser and asks one question: does the
 * notebook fill?
 *
 * `check-playable.mjs` proves the geometry — every encounter reachable, every
 * leg walkable. This proves the other half: that once you get there, pressing
 * the key actually does something. Those two came apart on this chapter once
 * already, when every screenshot passed while the chapter could not be
 * finished. On its first run it returned 25/27 and found the toll-scale task,
 * which had become impossible to open.
 *
 * Walking is skipped on purpose — under software rendering the frame rate puts
 * a 47 m region at three minutes — so the player is placed beside each target.
 * Everything after that is real keys and real clicks; nothing here writes game
 * state directly.
 *
 * Needs a server on :3000 (`npm run dev`, or `npm run build && npm start`) and
 * `puppeteer-core`, which is NOT a dependency of this package — install it
 * where you run this from. CHROME can override the browser path.
 *
 *   node scripts/check-notebook.mjs [--shots <dir>]
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import puppeteer from 'puppeteer-core'

const HERE = dirname(fileURLToPath(import.meta.url))
const LIB = join(HERE, '..', 'src', 'lib', 'chapter1')
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
/* Point at a production server with PORT=3100 to check the built artifact and
   not only the dev one — they differ: dev runs React in StrictMode and skips
   the static export path entirely. */
const BASE = process.env.BASE || `http://localhost:${process.env.PORT || 3000}`
const shotsAt = process.argv.indexOf('--shots')
const SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null

const ORDER = ['yemen-heights', 'night-camp', 'border-post', 'narrow-pass', 'loading-road',
               'yathrib', 'monastery', 'mecca', 'exit']
/* Which region each speaker stands in. placements.ts keys by region already,
   but it is a TS module and this script is deliberately dependency-free. */
const HOME = { envoy: 'border-post', jewish: 'yathrib', chief: 'narrow-pass',
               monk: 'monastery', merchant: 'mecca' }

/** Pull `{id, region, x, z}` out of a TS source of object literals.
    Split on entry boundaries first — a single lazy regex spanning entries
    happily pairs one find's id with the next find's coordinates. */
function entries(file) {
  const src = readFileSync(join(LIB, file), 'utf8')
  const out = []
  for (const b of src.split(/\n {2}\{/).slice(1)) {
    const id = /id:\s*'([^']+)'/.exec(b)
    const region = /region:\s*'([^']+)'/.exec(b)
    const x = /\bx:\s*(-?[\d.]+)/.exec(b)
    const z = /\bz:\s*(-?[\d.]+)/.exec(b)
    if (id && region && x && z) out.push({ id: id[1], region: region[1], x: +x[1], z: +z[1] })
  }
  return out
}

const FINDS = entries('finds.ts')
const TASKS = entries('tasks.ts')
const CAST = [...readFileSync(join(LIB, 'placements.ts'), 'utf8')
  .matchAll(/who:\s*'([^']+)',\s*x:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+)/g)]
  .map((m) => ({ who: m[1], x: +m[2], z: +m[3] }))

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const log = []

/* A dev-server rebuild reloads the page and destroys the execution context
   under whatever evaluate() is in flight. That is an artefact of testing
   against a live dev server, not a fault in the game, so it is retried. */
const evalSafe = async (pg, fn, arg, tries = 4) => {
  for (let i = 0; i < tries; i++) {
    try {
      return arg === undefined ? await pg.evaluate(fn) : await pg.evaluate(fn, arg)
    } catch (e) {
      if (!/context was destroyed|Target closed|detached/i.test(e.message)) throw e
      await wait(1500)
    }
  }
  return null
}

/* A software-rendered WebGL context is not fully reclaimed when its page
   closes, so the third heavy region in a run renders black. One browser per
   region costs a few seconds and removes the failure mode entirely. */
const launch = () => puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  defaultViewport: { width: 1100, height: 620 },
})

/* The notebook is the scoreboard and it lives in localStorage. Carrying it
   between regions by hand is what a real player's browser does for them.

   Accumulated rather than replaced: reading the store back can fail (a reload
   can land mid-evaluate), and a single failed read used to hand the next
   region an empty scoreboard, so the run lost evidence it had actually
   collected and blamed the game for it. */
const tally = { seen: [], entries: [], found: [], solved: [] }
const merge = (s) => {
  if (!s) return
  for (const k of Object.keys(tally)) {
    for (const v of s[k] || []) if (!tally[k].includes(v)) tally[k].push(v)
  }
}
let carried = null

for (const region of ORDER) {
  const br = await launch()
  const pg = await br.newPage()
  const errs = []
  pg.on('pageerror', (e) => errs.push(e.message.slice(0, 140)))

  await pg.goto(`${BASE}/chapter1?region=${region}`, { waitUntil: 'networkidle2', timeout: 90000 })
  if (carried) {
    await evalSafe(pg, (s) => localStorage.setItem('ch1:notebook:v1', s), carried)
    await pg.reload({ waitUntil: 'networkidle2' })
  }
  await wait(2200)
  for (const el of await pg.$$('button')) {
    const t = await evalSafe(pg, (e) => e.innerText, el)
    if (t && t.includes('התחילו')) { await el.click(); break }
  }
  let alive = false
  for (let t = 0; t < 26; t++) {
    await wait(1400)
    alive = await evalSafe(pg, () => !!window.__ch1Live)
    if (alive) break
  }
  if (!alive) { log.push({ region, status: 'NEVER STARTED' }); await br.close(); continue }
  for (let t = 0; t < 20; t++) {
    const gone = await evalSafe(pg, () => {
      const e = document.querySelector('.ch1-arrive')
      return !e || e.classList.contains('is-gone')
    })
    if (gone) break
    await wait(700)
  }
  await wait(900)

  /** Clear whatever panel is open, however it wants to be cleared. */
  const dismiss = async (rounds = 26) => {
    for (let i = 0; i < rounds; i++) {
      const done = await evalSafe(pg, () => {
        const cont = [...document.querySelectorAll('button')]
          .find((b) => /המשיכו|הבנתי|סגור|לסיום|קדימה/.test(b.innerText))
        const choice = document.querySelector('.ch1-task-card button')
        const card = document.querySelector('.ch1-find, .ch1-task')
        const talk = document.querySelector('.hud-dialogue')
        if (!card && !talk) return true
        if (card && cont) { cont.click(); return false }
        if (card && choice) { choice.click(); return false }
        return false
      })
      if (done) return true
      await pg.keyboard.press('Space')
      await wait(320)
    }
    return false
  }

  const teleport = (x, z) => evalSafe(pg, ({ x, z }) => {
    window.__ch1Live.player.set(x, 0, z)
  }, { x, z })

  /* Poll rather than sleep. The marker projector only updates on a rendered
     frame, and under software rendering the interval between frames is neither
     small nor predictable — fixed waits made this harness report finds as
     unreachable that were reachable, in a different region on each run. Waiting
     for the condition instead of for the clock removed the flakiness entirely. */
  const until = async (fn, ms = 9000) => {
    const stop = Date.now() + ms
    for (;;) {
      const v = await evalSafe(pg, fn)
      if (v) return v
      if (Date.now() > stop) return null
      await wait(350)
    }
  }

  /* yemen-heights and mecca each open a narrator cinematic shortly after the
     region becomes visible, and the game correctly refuses F and E while a
     dialogue is up. The wait matters: the cinematic is timed from sceneReady,
     not from mount, so dismissing too early clears nothing and the first find
     of those two regions then fails. */
  await wait(2600)
  await dismiss()

  const before = await evalSafe(pg, () => JSON.parse(localStorage.getItem('ch1:notebook:v1') || '{}'))

  // ── the region's evidence ────────────────────────────────────────────────
  const finds = FINDS.filter((f) => f.region === region)
  let gotFinds = 0
  for (const f of finds) {
    await teleport(f.x, f.z + 0.9)
    if (!(await until(() => window.__ch1Live.nearFind))) {
      log.push({ region, what: 'find ' + f.id, status: 'OUT OF RANGE' })
      continue
    }
    await pg.keyboard.press('KeyF')
    const opened = await until(() => !!document.querySelector('.ch1-find'), 4000)
    await dismiss()
    if (opened) gotFinds++
    else log.push({ region, what: 'find ' + f.id, status: 'F DID NOTHING' })
  }

  // ── the people ───────────────────────────────────────────────────────────
  let talks = 0
  for (const p of CAST.filter((c) => HOME[c.who] === region)) {
    await teleport(p.x, p.z + 1.6)
    await until(() => window.__ch1Live.nearWho)
    for (let round = 0; round < 8; round++) {
      if (!(await evalSafe(pg, () => window.__ch1Live.nearWho))) break
      await pg.keyboard.press('KeyE')
      await wait(800)
      if (!(await evalSafe(pg, () => !!document.querySelector('.hud-dialogue')))) break
      await dismiss()
      talks++
      await wait(400)
    }
  }

  // ── the task station ─────────────────────────────────────────────────────
  const task = TASKS.find((t) => t.region === region)
  let taskDone = false
  if (task) {
    await teleport(task.x, task.z + 1.1)
    await until(() => window.__ch1Live.atTask)
    await pg.keyboard.press('KeyE')
    await wait(900)
    if (await until(() => !!document.querySelector('.ch1-task'), 4000)) {
      /* Click every option, not just the first. A task can require more than
         one right answer (task-loading needs two), wrong picks only surface a
         note, and this asks whether the panel works — not whether we know. */
      const opts = await evalSafe(pg, () => document.querySelectorAll('.ch1-task-card button').length)
      for (let i = 0; i < (opts || 0); i++) {
        await evalSafe(pg, (i) => {
          const b = document.querySelectorAll('.ch1-task-card button')[i]
          if (b && !/המשיכו|סגור/.test(b.innerText)) b.click()
        }, i)
        await wait(400)
      }
      await wait(700)
      await dismiss()
      taskDone = true
    } else {
      log.push({ region, what: 'task ' + task.id, status: 'E DID NOTHING' })
    }
  }

  // ── Rawi, who carries most of the chapter ────────────────────────────────
  let rawi = 0
  for (let round = 0; round < 12; round++) {
    const pending = await evalSafe(pg, () => !!document.querySelector('.is-rawi-hint'))
    await pg.keyboard.press('KeyR')
    await wait(800)
    if (!(await evalSafe(pg, () => !!document.querySelector('.hud-dialogue')))) {
      if (!pending) break
      continue
    }
    await dismiss()
    rawi++
    await wait(350)
  }

  if (SHOTS) await pg.screenshot({ path: join(SHOTS, `pt-${region}.png`) })
  const after = await evalSafe(pg, () => JSON.parse(localStorage.getItem('ch1:notebook:v1') || '{}'))
  merge(after)
  carried = JSON.stringify({ ...tally, region })

  log.push({
    region,
    finds: `${gotFinds}/${finds.length}`,
    talks, rawi,
    task: task ? (taskDone ? 'ok' : 'FAILED') : '—',
    entries: `${(before?.entries || []).length} → ${(after?.entries || []).length}`,
    errors: errs.length,
  })
  if (errs.length) log.push({ region, status: 'PAGE ERROR: ' + errs[0] })
  await br.close()
}

console.table(log)
const seen = tally.seen.length
const found = tally.found.length
const solved = tally.solved.length
console.log('\nencounters heard: %d / 27', seen)
console.log('evidence:         %d / %d', found, FINDS.length)
console.log('tasks solved:     %d / %d', solved, TASKS.length)

const short = (seen < 27 ? 1 : 0) + (found < FINDS.length ? 1 : 0) + (solved < TASKS.length ? 1 : 0)
if (short) {
  console.error('\nthe chapter cannot be completed as it stands')
  process.exit(1)
}
console.log('\nthe notebook fills')

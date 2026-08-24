/* Which find does the game actually write down when the harness presses F?
   Per region, fresh notebook, no carrying: teleport to each find, report the
   id the game believes is nearest, then read `found` straight back. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import puppeteer from 'puppeteer-core'

const HERE = dirname(fileURLToPath(import.meta.url))
const LIB = join(HERE, '..', 'src', 'lib', 'chapter1')
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = `http://localhost:${process.env.PORT || 3000}`
const ORDER = process.env.ONLY ? [process.env.ONLY]
  : ['yemen-heights', 'night-camp', 'border-post', 'narrow-pass', 'loading-road',
     'yathrib', 'monastery', 'mecca', 'exit']

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
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const evalSafe = async (pg, fn, arg, tries = 4) => {
  for (let i = 0; i < tries; i++) {
    try { return arg === undefined ? await pg.evaluate(fn) : await pg.evaluate(fn, arg) }
    catch (e) { if (!/context was destroyed|Target closed|detached/i.test(e.message)) throw e; await wait(1500) }
  }
  return null
}
const launch = () => puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
  defaultViewport: { width: 1100, height: 620 },
})

const rows = []
for (const region of ORDER) {
  const finds = FINDS.filter((f) => f.region === region)
  if (!finds.length) continue
  const br = await launch()
  const pg = await br.newPage()
  await pg.goto(`${BASE}/chapter1?region=${region}`, { waitUntil: 'networkidle2', timeout: 90000 })
  await evalSafe(pg, () => localStorage.removeItem('ch1:notebook:v1'))
  await pg.reload({ waitUntil: 'networkidle2' })
  await wait(2200)
  for (const el of await pg.$$('button')) {
    const t = await evalSafe(pg, (e) => e.innerText, el)
    if (t && t.includes('התחילו')) { await el.click(); break }
  }
  let alive = false
  for (let t = 0; t < 26; t++) { await wait(1400); alive = await evalSafe(pg, () => !!window.__ch1Live); if (alive) break }
  if (!alive) { rows.push({ region, target: '—', status: 'NEVER STARTED' }); await br.close(); continue }
  for (let t = 0; t < 20; t++) {
    const gone = await evalSafe(pg, () => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') })
    if (gone) break
    await wait(700)
  }
  const dismiss = async (rounds = 26) => {
    for (let i = 0; i < rounds; i++) {
      const done = await evalSafe(pg, () => {
        const cont = [...document.querySelectorAll('button')].find((b) => /המשיכו|הבנתי|סגור|לסיום|קדימה/.test(b.innerText))
        const card = document.querySelector('.ch1-find, .ch1-task')
        const talk = document.querySelector('.hud-dialogue')
        if (!card && !talk) return true
        if (card && cont) { cont.click(); return false }
        return false
      })
      if (done) return true
      await pg.keyboard.press('Space'); await wait(320)
    }
    return false
  }
  const until = async (fn, ms = 9000) => {
    const stop = Date.now() + ms
    for (;;) { const v = await evalSafe(pg, fn); if (v) return v; if (Date.now() > stop) return null; await wait(350) }
  }
  await wait(2600); await dismiss()

  for (const f of finds) {
    await evalSafe(pg, ({ x, z }) => window.__ch1Live.player.set(x, 0, z), { x: f.x, z: f.z + 0.9 })
    /* Wait for the projector to name THIS find, not merely to name something:
       nearFind keeps its previous value until a frame renders, so a plain
       truthy check reads the find we just collected and presses F on that. */
    await evalSafe(pg, (t) => { window.__TARGET = t }, f.id)
    const near = await until(() => (window.__ch1Live.nearFind === window.__TARGET ? window.__TARGET : null), 15000)
    const seenNear = await evalSafe(pg, () => window.__ch1Live.nearFind)
    const at = await evalSafe(pg, () => ({ x: +window.__ch1Live.player.x.toFixed(1), z: +window.__ch1Live.player.z.toFixed(1) }))
    if (!near) { rows.push({ region, target: f.id, near: seenNear + ' @' + at.x + ',' + at.z, opened: false, recorded: '', status: 'NEVER NAMED' }); continue }
    const beforeArr = await evalSafe(pg, () => (JSON.parse(localStorage.getItem('ch1:notebook:v1') || '{}').found || []))
    await pg.keyboard.press('KeyF')
    const opened = !!(await until(() => !!document.querySelector('.ch1-find'), 4000))
    await dismiss()
    const afterArr = await evalSafe(pg, () => (JSON.parse(localStorage.getItem('ch1:notebook:v1') || '{}').found || [])) || []
    const added = afterArr.filter((x) => !(beforeArr || []).includes(x))
    rows.push({ region, target: f.id, near, opened, recorded: added.join(',') || '(none)',
                status: added.includes(f.id) ? 'ok' : 'MISMATCH' })
  }
  const finalArr = await evalSafe(pg, () => (JSON.parse(localStorage.getItem('ch1:notebook:v1') || '{}').found || [])) || []
  rows.push({ region, target: `TOTAL ${finalArr.length}/${finds.length}`, near: '', opened: '', recorded: finalArr.join(','), status: '' })
  await br.close()
}
console.table(rows)

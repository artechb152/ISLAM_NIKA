/* Play the chapter and write down what a first-time player actually sees.
 *
 * Not a gate — it asserts nothing and never fails. `check-playable` proves the
 * geometry and `check-notebook` proves the notebook fills; both answer yes/no.
 * Neither can tell you that the film plays in a 300-pixel box, that four
 * regions open with the same camera on the same road, or that the guide starts
 * talking before the player knows who he is.
 *
 * So this walks the journey and records it: a screenshot at every beat, the
 * exact text of every panel that opens, the size of every video, and how long
 * each stretch takes. The output is a folder of images and one JSON transcript
 * to read next to them.
 *
 *   node scripts/explore.mjs [--region <id>] [--out <dir>] [--headed]
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chromium } from 'playwright-core'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, '..')
const argv = process.argv
const argOf = (flag, dflt) => { const i = argv.indexOf(flag); return i > 0 ? argv[i + 1] : dflt }
const OUT = join(WEB, argOf('--out', 'scratchpad/explore'))
const ONLY = argOf('--region', null)
const HEADED = argv.includes('--headed')
const BASE = process.env.BASE || `http://localhost:${process.env.PORT || 3000}`

const CHROME = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean).find((p) => existsSync(p))
if (!CHROME) { console.error('no Chrome found; set CHROME'); process.exit(1) }

mkdirSync(OUT, { recursive: true })

const REGIONS = ['yemen-heights', 'night-camp', 'border-post', 'narrow-pass', 'loading-road',
                 'yathrib', 'monastery', 'mecca', 'exit']
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const transcript = []
let shotN = 0

async function shoot(pg, region, tag) {
  const name = `${String(++shotN).padStart(3, '0')}-${region}-${tag}.png`
  /* A heavy region under software rendering can take longer than Playwright's
     default 30 s to produce one frame. That is the renderer, not the game, and
     a missed picture must not abort a nine-region run — the border post used to
     kill the whole sweep two regions in. */
  const ok = await pg.screenshot({ path: join(OUT, name), timeout: 20000 })
    .then(() => true).catch(() => false)
  if (!ok) { console.log(`  (no frame for ${region}/${tag} within 20s)`); return null }
  return name
}

/** Everything the player can currently read, and how big the media is. */
async function surface(pg) {
  return pg.evaluate(() => {
    const txt = (el) => (el?.innerText || '').trim().replace(/\s+\n/g, '\n')
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) } }
    const vids = [...document.querySelectorAll('video')].map((v) => ({
      src: (v.currentSrc || v.getAttribute('src') || '').split('/').pop(),
      shown: box(v),
      natural: { w: v.videoWidth, h: v.videoHeight },
      visible: !!(v.offsetWidth || v.offsetHeight),
    }))
    const dlg = document.querySelector('.hud-dialogue')
    return {
      viewport: { w: innerWidth, h: innerHeight },
      dialogue: dlg ? { text: txt(dlg), box: box(dlg), hasFilm: dlg.classList.contains('has-film') } : null,
      find: txt(document.querySelector('.ch1-find')) || null,
      task: txt(document.querySelector('.ch1-task')) || null,
      arrive: txt(document.querySelector('.ch1-arrive:not(.is-gone)')) || null,
      buttons: [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => b.innerText.trim()).filter(Boolean),
      videos: vids,
      notebook: JSON.parse(localStorage.getItem('ch1:notebook:v1') || '{}'),
      live: window.__ch1Live ? {
        nearFind: window.__ch1Live.nearFind ?? null,
        nearWho: window.__ch1Live.nearWho ?? null,
        atTask: window.__ch1Live.atTask ?? null,
        yaw: +(window.__ch1Live.yaw ?? 0).toFixed(2),
        pos: { x: +(window.__ch1Live.player?.x ?? 0).toFixed(1), z: +(window.__ch1Live.player?.z ?? 0).toFixed(1) },
      } : null,
    }
  })
}

const br = await chromium.launch({
  executablePath: CHROME,
  headless: !HEADED,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
})

for (const region of (ONLY ? [ONLY] : REGIONS)) {
  const ctx = await br.newContext({ viewport: { width: 1440, height: 810 }, locale: 'he-IL' })
  const pg = await ctx.newPage()
  const errors = []
  pg.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)))
  pg.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)) })

  const beats = []
  const t0 = Date.now()
  await pg.goto(`${BASE}/chapter1?region=${region}`, { waitUntil: 'networkidle', timeout: 120000 })

  /* The very first region is the only place the intro can be seen, so it is
     deliberately NOT opted out of here — the point is to watch it. */
  beats.push({ at: Date.now() - t0, tag: 'loaded', shot: await shoot(pg, region, 'loaded'), ...(await surface(pg)) })

  for (const b of await pg.$$('button')) {
    const t = (await b.innerText().catch(() => '')) || ''
    if (t.includes('התחילו')) { await b.click().catch(() => {}); break }
  }

  /* wait for the scene, then watch the opening minute beat by beat */
  for (let t = 0; t < 40; t++) {
    if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break
    await wait(1200)
  }
  for (const at of [2000, 5000, 9000, 14000, 20000, 28000]) {
    await wait(at - (Date.now() - t0) > 0 ? at - (Date.now() - t0) : 250)
    beats.push({ at: Date.now() - t0, tag: 'open+' + at, shot: await shoot(pg, region, 'open' + at), ...(await surface(pg)) })
  }

  transcript.push({ region, errors: [...new Set(errors)], beats })
  console.log(`${region.padEnd(14)} ${beats.length} beats, ${errors.length} errors`)
  await ctx.close()
}

await br.close()
writeFileSync(join(OUT, 'transcript.json'), JSON.stringify(transcript, null, 2), 'utf8')
console.log(`\nwrote ${shotN} screenshots and transcript.json to ${OUT}\n`)

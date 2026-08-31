import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const src = readFileSync('src/lib/chapter1/finds.ts', 'utf8')
const b = src.split(/\n {2}\{/).find((x) => x.includes("'find-scroll-case'"))
const fx = +/\bx:\s*(-?[\d.]+)/.exec(b)[1], fz = +/\bz:\s*(-?[\d.]+)/.exec(b)[1]
console.log('find at', fx, fz)
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const pg = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage()
pg.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERR:', m.text().slice(0, 240)) })
pg.on('pageerror', (e) => console.log('PAGE EXC:', String(e).slice(0, 240)))
await pg.goto('http://localhost:3000/chapter1?region=yathrib', { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1'); localStorage.setItem('ch1:intro:v1', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const bt of await pg.$$('button')) { const t = await bt.innerText().catch(() => ''); if (t.includes('התחילו')) { await bt.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
await wait(4000)
for (let i = 0; i < 20; i++) { if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break; await pg.keyboard.press('Space'); await wait(350) }
await pg.evaluate(({ x, z }) => window.__ch1Live.player.set(x, 0, z + 0.9), { x: fx, z: fz })
await wait(2500)
const st = await pg.evaluate(() => ({
  nearFind: window.__ch1Live.nearFind,
  t1: window.__ch1Live.markerEls.get('find:find-scroll-case')?.style.transform?.slice(0, 60),
  disp: window.__ch1Live.markerEls.get('find:find-scroll-case')?.style.display,
}))
await pg.evaluate(() => window.__ch1Live.player.set(window.__ch1Live.player.x + 0.5, 0, window.__ch1Live.player.z))
await wait(1200)
const st2 = await pg.evaluate(() => ({
  t2: window.__ch1Live.markerEls.get('find:find-scroll-case')?.style.transform?.slice(0, 60),
  nearFind: window.__ch1Live.nearFind,
}))
console.log(JSON.stringify(st2))
console.log(JSON.stringify(st))
await pg.screenshot({ path: 'scratchpad/tour/scrolldebug.png' })
await browser.close()

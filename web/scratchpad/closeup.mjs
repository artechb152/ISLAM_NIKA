/* Close-up of the player walking — the robe under scrutiny. */
import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const INIT = `
window.__lab = { hooks: [] }
window.__THREE_DEVTOOLS__ = { dispatchEvent(ev) { const d = ev.detail
  if (d && d.isWebGLRenderer && !d.__w) { d.__w = true; const orig = d.render.bind(d)
    d.render = (s, c) => { for (const h of window.__lab.hooks) { try { h(s, c) } catch (e) {} } orig(s, c) } } } }`
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: 'scratchpad/tour', size: { width: 1280, height: 800 } } })
await ctx.addInitScript(INIT)
const pg = await ctx.newPage()
await pg.goto('http://localhost:3000/chapter1?region=yemen-heights', { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1'); localStorage.setItem('ch1:intro:v1', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const b of await pg.$$('button')) { const t = await b.innerText().catch(() => ''); if (t.includes('התחילו')) { await b.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
for (let t = 0; t < 25; t++) { const gone = await pg.evaluate(() => { const e = document.querySelector('.ch1-arrive'); return !e || e.classList.contains('is-gone') }); if (gone) break; await wait(700) }
await wait(2500)
for (let i = 0; i < 20; i++) { if (!(await pg.evaluate(() => !!document.querySelector('.hud-dialogue')))) break; await pg.keyboard.press('Space'); await wait(350) }
// close-up side camera on the player
await pg.evaluate(() => {
  window.__lab.hooks.push((scene, camera) => {
    const p = window.__ch1Live.player
    camera.position.set(p.x + 2.6, 1.1, p.z + 0.4)
    camera.lookAt(p.x, 1.0, p.z)
    if (camera.fov !== 40) { camera.fov = 40; camera.updateProjectionMatrix() }
  })
})
await wait(600)
await pg.keyboard.down('KeyW'); await wait(5000); await pg.keyboard.up('KeyW')
await wait(600)
await ctx.close(); await browser.close()
console.log('recorded')

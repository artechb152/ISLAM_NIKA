/* The staged opening, as a first-time player sees it. */
import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, recordVideo: { dir: 'scratchpad/tour', size: { width: 960, height: 540 } } })
const pg = await ctx.newPage()
await pg.goto('http://localhost:3000/chapter1?region=yemen-heights', { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.clear(); localStorage.setItem('ch1:muted', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const b of await pg.$$('button')) { const t = await b.innerText().catch(() => ''); if (t.includes('התחילו')) { await b.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
// wait for the narrator film dialogue
for (let t = 0; t < 20; t++) { await wait(600); if (await pg.evaluate(() => !!document.querySelector('.hud-dialogue.has-film'))) break }
await wait(2500)
await pg.screenshot({ path: 'scratchpad/tour/intro-film.png' })
// advance through the narrator's two lines
for (let i = 0; i < 8; i++) {
  const done = await pg.evaluate(() => !document.querySelector('.hud-dialogue'))
  if (done) break
  await pg.keyboard.press('Space'); await wait(900)
}
// Rawi should open his greeting shortly
for (let t = 0; t < 15; t++) { await wait(600); if (await pg.evaluate(() => !!document.querySelector('.hud-dialogue'))) break }
await wait(2000)
await pg.screenshot({ path: 'scratchpad/tour/intro-greet-1.png' })
// advance to the end of his 4 lines → choices should appear
for (let i = 0; i < 10; i++) {
  const choices = await pg.evaluate(() => !!document.querySelector('.hud-choices'))
  if (choices) break
  await pg.keyboard.press('Space'); await wait(800)
}
await wait(600)
await pg.screenshot({ path: 'scratchpad/tour/intro-greet-choices.png' })
// pick the first question
const btn = await pg.$('.hud-choices .hud-card-btn')
if (btn) { await btn.click(); await wait(2500); await pg.screenshot({ path: 'scratchpad/tour/intro-answer.png' }) }
const state = await pg.evaluate(() => ({
  notebook: JSON.parse(localStorage.getItem('ch1:notebook:v1') || '{}'),
  introFlag: localStorage.getItem('ch1:intro:v1'),
}))
console.log('after intro:', JSON.stringify(state))
await ctx.close(); await browser.close()
console.log('done')

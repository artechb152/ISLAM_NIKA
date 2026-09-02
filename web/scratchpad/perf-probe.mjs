// Phase 0 probe: real Chrome (GPU), first-time load of region 1.
// Measures: time-to-first-controllable-frame, transferred bytes, console errors,
// long tasks, and whether the screen goes blank (the reported freeze).
import { chromium } from 'playwright-core'

const URL = process.argv[2] ?? 'http://localhost:3000/chapter1'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
const page = await ctx.newPage()

let bytes = 0
const errors = []
page.on('response', async (r) => { try { const b = await r.body(); bytes += b.length } catch {} })
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.addInitScript(() => {
  try { localStorage.clear() } catch {}
  window.__longTasks = []
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__longTasks.push(Math.round(e.duration))
  }).observe({ entryTypes: ['longtask'] })
})

const t0 = Date.now()
await page.goto(URL, { waitUntil: 'domcontentloaded' })
const tDom = Date.now() - t0

// Title screen -> start
const startBtn = page.locator('button, a').filter({ hasText: /התחילו|התחל/ }).first()
await startBtn.waitFor({ timeout: 20000 })
const tTitle = Date.now() - t0
await startBtn.click()
const tClick = Date.now()

// Blank-screen watch: sample every 250ms whether the canvas has drawn anything
// (real GPU canvas readback is cheap at 8x8) and whether sceneReady-ish HUD exists.
let firstCanvas = null, firstHud = null
for (let i = 0; i < 240; i++) {
  const s = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    let drawn = false
    if (c) {
      try {
        const t = document.createElement('canvas'); t.width = 8; t.height = 8
        t.getContext('2d').drawImage(c, 0, 0, 8, 8)
        const d = t.getContext('2d').getImageData(0, 0, 8, 8).data
        for (let j = 0; j < d.length; j += 4) if (d[j] + d[j+1] + d[j+2] > 24) { drawn = true; break }
      } catch {}
    }
    return { drawn, hud: !!document.querySelector('.hud-goal, .hud-controls, .ch1-travel, .hud-dialogue') }
  })
  if (s.drawn && firstCanvas == null) firstCanvas = Date.now() - tClick
  if (s.hud && firstHud == null) firstHud = Date.now() - tClick
  if (firstCanvas != null && firstHud != null) break
  await page.waitForTimeout(250)
}

// Try to move: is the player controllable?
const before = await page.evaluate(() => window.__ch1Live ? { x: window.__ch1Live.player.x, z: window.__ch1Live.player.z } : null)
await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW')
const after = await page.evaluate(() => window.__ch1Live ? { x: window.__ch1Live.player.x, z: window.__ch1Live.player.z } : null)
const moved = before && after ? Math.hypot(after.x - before.x, after.z - before.z) : -1

const longTasks = await page.evaluate(() => window.__longTasks ?? [])
const fps = await page.evaluate(() => new Promise((res) => {
  let n = 0; const s = performance.now()
  const loop = () => { n++; if (performance.now() - s < 2000) requestAnimationFrame(loop); else res(Math.round(n / 2)) }
  requestAnimationFrame(loop)
}))

console.log(JSON.stringify({
  tDom, tTitle,
  msToFirstCanvasPixels: firstCanvas, msToHud: firstHud,
  movedMeters: +moved.toFixed(2), fps,
  transferredMB: +(bytes / 1048576).toFixed(1),
  longTasksOver200ms: longTasks.filter((d) => d > 200),
  consoleErrors: errors.slice(0, 10),
}, null, 2))
await browser.close()

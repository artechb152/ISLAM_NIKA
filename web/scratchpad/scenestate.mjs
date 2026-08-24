import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const region = process.argv[2] || 'yathrib'
const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const pg = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage()
await pg.goto(`http://localhost:3000/chapter1?region=${region}`, { waitUntil: 'networkidle', timeout: 90000 })
await pg.evaluate(() => { localStorage.removeItem('ch1:notebook:v1'); localStorage.setItem('ch1:muted', '1') })
await pg.reload({ waitUntil: 'networkidle' })
await wait(1500)
for (const bt of await pg.$$('button')) { const t = await bt.innerText().catch(() => ''); if (t.includes('התחילו')) { await bt.click(); break } }
for (let t = 0; t < 40; t++) { await wait(1000); if (await pg.evaluate(() => !!window.__ch1Live).catch(() => false)) break }
await wait(8000)
const st = await pg.evaluate(() => ({
  gl: !!window.__ch1Gl, scene: !!window.__ch1Scene,
  children: window.__ch1Scene ? window.__ch1Scene.children.length : -1,
  meshes: (() => { let n = 0; window.__ch1Scene?.traverse((o) => { if (o.isMesh) n++ }); return n })(),
  arrive: document.querySelector('.ch1-arrive')?.className,
}))
console.log(region, JSON.stringify(st))
await browser.close()

/* כל סרטון בפועל: videoWidth/Height, התקדמות זמן, poster, נתיב תחת basePath. */
import fs from 'node:fs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT = '/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const vids = ['opening.mp4','scene2.mp4','abraha.mp4','ch1-summary.mp4']
const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport:{width:900,height:520} })
const lines = []
await page.goto('http://localhost:3000/chapter1?region=exit', { waitUntil:'domcontentloaded' })
for (const v of vids) {
  const res = await page.evaluate(async (src) => {
    const el = document.createElement('video'); el.muted = true; el.playsInline = true; el.src = '/assets/anim-video/' + src
    document.body.appendChild(el)
    const t0 = Date.now()
    const ok = await new Promise(res => { el.addEventListener('loadeddata', ()=>res(true)); el.addEventListener('error', ()=>res(false)); setTimeout(()=>res(false), 15000) })
    let t1 = 0, t2 = 0
    if (ok) { await el.play().catch(()=>{}); await new Promise(r=>setTimeout(r,1500)); t1 = el.currentTime; await new Promise(r=>setTimeout(r,1500)); t2 = el.currentTime }
    /* פריים אמיתי: מציירים לקנבס ובודקים שאינו שחור לגמרי */
    let lum = -1
    try { const c = document.createElement('canvas'); c.width = 64; c.height = 36; const g = c.getContext('2d'); g.drawImage(el, 0, 0, 64, 36)
      const d = g.getImageData(0,0,64,36).data; let s=0; for (let i=0;i<d.length;i+=4) s += d[i]+d[i+1]+d[i+2]; lum = Math.round(s/(d.length/4)/3) } catch (e) { lum = -2 }
    const r = { src, ok, w: el.videoWidth, h: el.videoHeight, dur: +el.duration.toFixed(1), t1: +t1.toFixed(2), t2: +t2.toFixed(2), lum, err: el.error?.code ?? null, ms: Date.now()-t0 }
    el.remove(); return r
  }, v)
  const line = `${v}: ${res.ok?'נטען':'לא נטען'} · ${res.w}×${res.h} · משך ${res.dur}s · זמן ${res.t1}→${res.t2} · בהירות פריים ${res.lum} · שגיאה ${res.err} · ${res.ms}ms`
  console.log(line); lines.push(line)
}
/* posters + vtt */
for (const p of ['opening-poster.jpg','scene2-poster.jpg','abraha-poster.jpg','ch1-summary-poster.jpg','ch1-summary.he.vtt']) {
  const st = await page.evaluate(async (p) => { const r = await fetch('/assets/anim-video/'+p); return r.status }, p)
  const line = `${p}: HTTP ${st}`; console.log(line); lines.push(line)
}
fs.writeFileSync(`${OUT}/logs/videos.log`, lines.join('\n')+'\n')
await browser.close()

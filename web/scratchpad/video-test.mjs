/* בודק שכל סרטון באמת מפיק פריימים — לא רק שהוא נטען. */
import { chromium } from 'playwright-core'
const files = ['opening.mp4','abraha.mp4','scene2.mp4','ch1-summary.mp4']
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--autoplay-policy=no-user-gesture-required'] })
const page = await (await browser.newContext()).newPage()
await page.goto('http://localhost:3000/chapter1', { waitUntil:'domcontentloaded' })
for (const f of files) {
  const r = await page.evaluate(async (name) => {
    const v = document.createElement('video')
    v.src = `/assets/anim-video/${name}`
    v.muted = true; v.playsInline = true
    document.body.appendChild(v)
    const t0 = performance.now()
    await v.play().catch(()=>{})
    await new Promise((res)=>setTimeout(res, 3500))
    const out = {
      w: v.videoWidth, h: v.videoHeight, t: +v.currentTime.toFixed(2),
      dur: Number.isFinite(v.duration) ? +v.duration.toFixed(1) : null,
      readyState: v.readyState, err: v.error ? v.error.code : null,
      ms: Math.round(performance.now()-t0),
    }
    // האם באמת יש פיקסלים? מציירים פריים לקנבס ובודקים שהוא לא שחור אחיד
    try {
      const c = document.createElement('canvas'); c.width = 64; c.height = 36
      const g = c.getContext('2d'); g.drawImage(v, 0, 0, 64, 36)
      const d = g.getImageData(0,0,64,36).data
      let sum = 0, max = 0
      for (let i=0;i<d.length;i+=4){ const l=(d[i]+d[i+1]+d[i+2])/3; sum+=l; if(l>max)max=l }
      out.avgLuma = Math.round(sum/(d.length/4)); out.maxLuma = max
    } catch (e) { out.draw = String(e).slice(0,40) }
    v.remove()
    return out
  }, f)
  const ok = r.w > 0 && r.h > 0 && r.maxLuma > 8
  console.log(`${ok?'✓':'✗'} ${f.padEnd(18)} ${r.w}x${r.h} t=${r.t}/${r.dur} ready=${r.readyState} err=${r.err} luma avg=${r.avgLuma} max=${r.maxLuma}`)
}
await browser.close()

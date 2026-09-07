/* התשובה החותכת: מה הפריים באמת מראה כשהמצלמה "בתוך" הגוף.
   מצלמה שנמצאת בתוך גיאומטריה מציירת מסגרת של מרקם אחיד — שונות
   נמוכה מאוד. מודד את השונות בפועל, ומצלם. */
import { open } from './lib-probe.mjs'
const [region, xs, zs] = process.argv.slice(2)
const { browser, page } = await open(region, { w: 900, h: 560 })
await page.waitForFunction(()=>window.__ch1Live, null, { timeout: 120000 })
await page.waitForTimeout(4000)
await page.evaluate(({x,z})=>{ const L=window.__ch1Live; L.player.x=+x; L.player.z=+z; L.lastDrag=performance.now() }, {x:xs,z:zs})
// לצעוד קצת, כדי שהמצלמה תתמקם באמת ולא תיזרק לשם
for (const k of ['KeyW','KeyS','KeyW']) { await page.keyboard.down(k); await page.waitForTimeout(700); await page.keyboard.up(k); await page.waitForTimeout(400) }
await page.waitForTimeout(1800)
const v = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const g = document.createElement('canvas'); g.width=80; g.height=50
  g.getContext('2d').drawImage(c, 0, 0, 80, 50)
  const d = g.getContext('2d').getImageData(0,0,80,50).data
  let s=0, s2=0, n=0
  for (let i=0;i<d.length;i+=4){ const l=(d[i]+d[i+1]+d[i+2])/3; s+=l; s2+=l*l; n++ }
  const mean=s/n
  return { mean: Math.round(mean), sd: Math.round(Math.sqrt(s2/n - mean*mean)) }
})
console.log(`${region} @ ${xs},${zs} — בהירות ממוצעת ${v.mean}, סטיית תקן ${v.sd}`)
console.log(v.sd < 12 ? '   ✗ הפריים כמעט אחיד — המצלמה בתוך גוף' : '   ✓ הפריים מראה סצנה, לא מרקם אחיד')
await page.screenshot({ path: `scratchpad/shots/inspect/cam-${region}.png` })
await browser.close()

/* Does the player walk where they are pointed?
 *
 * The camera steers itself toward the direction of travel when nobody is
 * dragging it, which means a sign error there silently drags the player off
 * their own heading. One shipped: the relation is `heading = π − yaw`, it was
 * written as `yaw + π`, and the correction pulled yaw toward zero instead of
 * toward the walk. The first test of it passed anyway, because it started at
 * yaw 0 — the single value where the bug is invisible — and because all nine
 * regions are laid out along the −Z axis, so the main road runs straight
 * through the wrong attractor.
 *
 * So this one starts off-axis, four times, and asks whether the player ends up
 * where they were pointed.
 *
 * Needs a server on :3000 and `puppeteer-core`, which is NOT a dependency of
 * this package — install it where you run this from. CHROME overrides the
 * browser path.
 *
 *   node scripts/check-yaw.mjs
 */
import puppeteer from 'puppeteer-core'
let bad = 0
const br = await puppeteer.launch({executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless:'new',args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
  defaultViewport:{width:900,height:520}})
const pg = await br.newPage()
const BASE = process.env.BASE || `http://localhost:${process.env.PORT || 3000}`
await pg.goto(`${BASE}/chapter1?region=night-camp`, { waitUntil: 'networkidle2', timeout: 90000 })
  /* ברכת ההיכרות של ראאווי מיועדת לשחקן ראשון — לא לרתמה: היא חוסמת
     F והליכה לרגע, והרתמה בודקת את הפרק, לא את הפתיחה. */
  await pg.evaluate(() => localStorage.setItem('ch1:intro:v1', '1'))
await new Promise(r=>setTimeout(r,2500))
for(const el of await pg.$$('button')){const t=await pg.evaluate(e=>e.innerText,el); if(t.includes('התחילו')){await el.click();break}}
for(let t=0;t<26;t++){ await new Promise(r=>setTimeout(r,1400)); if(await pg.evaluate(()=>!!window.__ch1Live)) break }
for(let t=0;t<20;t++){ if(await pg.evaluate(()=>{const e=document.querySelector('.ch1-arrive');return !e||e.classList.contains('is-gone')})) break; await new Promise(r=>setTimeout(r,700)) }
const read = () => pg.evaluate(()=>({yaw:+window.__ch1Live.yaw.toFixed(3), x:+window.__ch1Live.player.x.toFixed(2), z:+window.__ch1Live.player.z.toFixed(2)}))

for (const startYaw of [2.117, -1.2, Math.PI, -2.8]) {
  await pg.evaluate((y)=>{ const l=window.__ch1Live; l.player.set(0,0,0); l.yaw=y; l.lastDrag=0 }, startYaw)
  await new Promise(r=>setTimeout(r,600))
  const a = await read()
  await pg.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,3000)); await pg.keyboard.up('KeyW')
  await new Promise(r=>setTimeout(r,500))
  const b = await read()
  // where SHOULD they have gone? heading = pi - yaw, so travel dir = (sin h, cos h)
  const h = Math.PI - startYaw
  const wantX = Math.sin(h), wantZ = Math.cos(h)
  const gotLen = Math.hypot(b.x-a.x, b.z-a.z)
  const dot = gotLen > 0.05 ? ((b.x-a.x)*wantX + (b.z-a.z)*wantZ)/gotLen : null
  console.log('yaw', startYaw.toFixed(3),
    '→ moved', gotLen.toFixed(2)+'m',
    'alignment with intended heading:', dot === null ? 'n/a' : dot.toFixed(3),
    '| yaw drift', (b.yaw-a.yaw).toFixed(3),
    dot === null ? (bad++, '✗ DID NOT MOVE — blocked?') : dot > 0.9 ? '✓' : (bad++, '✗ WRONG DIRECTION'))
}
await br.close()
if (bad) { console.error('camera auto-align is steering the player off their heading'); process.exit(1) }

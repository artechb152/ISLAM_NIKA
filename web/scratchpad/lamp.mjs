import { open } from './lib-probe.mjs'
const { browser, page, errors } = await open('yemen-heights', { w: 1200, h: 750 })
const T = { x: -7.4, z: 11.0 }
// לעמוד מול המצבה
await page.evaluate((t) => { const a=Math.atan2(t.x,t.z); window.__ch1Live.player.set(t.x-Math.sin(a)*4,0,t.z-Math.cos(a)*4); window.__ch1Live.yaw=a; window.__ch1Live.lastDrag=performance.now() }, T)
await page.waitForTimeout(2000)
await page.screenshot({ path: 'scratchpad/shots/yemen-lamp-1-before.png' })
// E לפני חשיפה — אמור לסרב ולהסביר
await page.keyboard.press('KeyE'); await page.waitForTimeout(1000)
const gated = await page.evaluate(() => ({ panel: !!document.querySelector('.ch1-task'), note: document.querySelector('.ch1-tasknote,.hud-tasknote,[class*=tasknote]')?.innerText?.slice(0,60) ?? document.body.innerText.match(/האבן בצל[^\n]*/)?.[0] ?? null }))
console.log('E before reveal ->', JSON.stringify(gated))
await page.screenshot({ path: 'scratchpad/shots/yemen-lamp-2-gated.png' })
// למצוא את הלפיד על המסך ולגרור אותו אל האבן
const sc = async (x,z,y=0.6) => page.evaluate(([X,Z,Y]) => {
  const s=window.__ch1Scene; const cam=s.getObjectByProperty('isCamera',true) ?? null
  return null
}, [x,z,y])
const drag = await page.evaluate(async ([tx,tz]) => {
  // מיקום הלפיד על המסך דרך אותה השלכה שהמשחק עושה
  const g = window.__ch1Scene?.getObjectByName('task:lamp')
  if (!g) return 'NO LAMP'
  return { lamp: [+g.position.x.toFixed(2), +g.position.z.toFixed(2)] }
}, [T.x,T.z])
console.log('lamp in scene:', JSON.stringify(drag))
await browser.close()
console.log('errors:', errors.length ? errors : 'none')

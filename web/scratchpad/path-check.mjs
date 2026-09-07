/* האם הקו מנקודת הכניסה אל הדמות חסום, וכמה רחב המעבר בפועל.
   בודק את הקו הישיר מול הקוליידרים, ואז מחפש את המסלול הפנוי הרחב
   ביותר בזווית סבירה. */
import { open } from './lib-probe.mjs'
const region = process.argv[2]
const { browser, page } = await open(region, { w: 640, h: 400 })
await page.waitForFunction(()=>window.__ch1Where && window.__ch1Statics, null, { timeout:120000 })
await page.waitForTimeout(4000)
const out = await page.evaluate(() => {
  const W = window.__ch1Where, C = window.__ch1Statics, L = window.__ch1Live
  const R = 0.45 /* PLAYER_R */
  const from = { x: L.player.x, z: L.player.z }
  const targets = [...W.cast.map(c=>({ name:c.who, x:c.x, z:c.z })),
                   ...(W.task ? [{ name:'task', x:W.task.x, z:W.task.z }] : [])]
  const blockers = (a, b) => {
    const dx=b.x-a.x, dz=b.z-a.z, len=Math.hypot(dx,dz)
    const ux=dx/len, uz=dz/len
    const hit=[]
    for (const c of C) {
      const px=c.x-a.x, pz=c.z-a.z
      const t=px*ux+pz*uz
      if (t<0 || t>len) continue
      const perp=Math.hypot(px-ux*t, pz-uz*t)
      if (perp < c.r + R) hit.push({ at:+t.toFixed(1), r:c.r, gap:+(perp-c.r-R).toFixed(2), x:+c.x.toFixed(1), z:+c.z.toFixed(1) })
    }
    return hit
  }
  return targets.map(t => ({ name:t.name, dist:+Math.hypot(t.x-from.x, t.z-from.z).toFixed(1), blocked: blockers(from, t) }))
})
console.log(`${region}: מנקודת הכניסה`)
for (const t of out) {
  console.log(`   → ${t.name} (${t.dist} מ'): ${t.blocked.length ? t.blocked.length + ' חוסמים' : 'קו פנוי'}`)
  for (const b of t.blocked.slice(0,4)) console.log(`        במרחק ${b.at} מ' · רדיוס ${b.r} · חדירה ${(-b.gap).toFixed(2)} מ' · ב-${b.x},${b.z}`)
}
await browser.close()

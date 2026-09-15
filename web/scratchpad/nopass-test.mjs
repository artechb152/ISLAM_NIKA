/* בקרה: האם ההחלקה מאפשרת לעבור דרך מכשול? נבדק רק על קוליידרים
   מבודדים (בלי חפיפה עם אחר), כדי שהמדידה תהיה נקייה. */
import { layouts, ORDER, collidersOf } from '../scripts/route-sim.mjs'
const PLAYER_R = 0.45, SPEED = 2.6, DT = 1/60
function depen(px, pz, cols, passes, acc) {
  for (let pass = 0; pass < passes; pass++) { let t = false
    for (const c of cols) { const dx=px-c.x, dz=pz-c.z, d=Math.hypot(dx,dz), min=c.r+PLAYER_R
      if (d < min) { t = true
        if (d < 1e-4) px = c.x + min
        else { if (acc) { acc.x += (dx/d)*(min-d); acc.z += (dz/d)*(min-d) } ; px = c.x+(dx/d)*min; pz = c.z+(dz/d)*min } } }
    if (!t) break }
  return [px, pz]
}
function stepGlide(x, z, dx, dz, cols) {
  const sx=x, sz=z; x+=dx; z+=dz
  const acc={x:0,z:0}; [x,z]=depen(x,z,cols,4,acc)
  const len=Math.hypot(dx,dz)||1e-9, ux=dx/len, uz=dz/len
  const got=(x-sx)*ux+(z-sz)*uz, nl=Math.hypot(acc.x,acc.z)
  if (nl>1e-6 && got<len*0.6) {
    const nx=acc.x/nl, nz=acc.z/nl
    let tx=-nz, tz=nx; if (tx*ux+tz*uz<0){tx=-tx;tz=-tz}
    const give=(len-Math.max(0,got))*0.85
    x+=tx*give; z+=tz*give; [x,z]=depen(x,z,cols,4,null)
    const mx=x-sx, mz=z-sz, ml=Math.hypot(mx,mz)
    if (ml>len){ x=sx+mx/ml*len; z=sz+mz/ml*len; [x,z]=depen(x,z,cols,4,null) }
  }
  return [x,z]
}
const MODE = process.argv[2] || 'glide'
const stepPlain = (x,z,dx,dz,cols) => depen(x+dx, z+dz, cols, 2, null)
const STEP = MODE === 'plain' ? stepPlain : stepGlide
let crossed=0, tested=0, minClear=99, isolated=0
for (const id of ORDER) {
  const L=layouts[id], cols=collidersOf(L), bound=(L.bound??24)-0.5
  for (const c of cols) {
    if (c.r < 0.5) continue
    /* מבודד: אף קוליידר אחר אינו חופף אותו ואינו בטווח 1.5 מ׳ ממנו */
    const lone = cols.every(o => o===c || Math.hypot(o.x-c.x,o.z-c.z) > c.r+o.r+1.5)
    if (!lone) continue
    isolated++
    for (let a=0; a<16; a++) {
      const th=a*Math.PI/8, dir={x:Math.sin(th),z:Math.cos(th)}
      let x=c.x-dir.x*3, z=c.z-dir.z*3
      if (Math.hypot(x,z)>bound) continue
      tested++
      const side0 = Math.sign((x-c.x)*dir.x + (z-c.z)*dir.z)   /* שלילי = לפני המכשול */
      let closest = 99
      for (let i=0;i<400;i++){
        ;[x,z]=STEP(x,z,dir.x*SPEED*DT,dir.z*SPEED*DT,cols)
        const d=Math.hypot(x,z); if (d>bound){x*=bound/d;z*=bound/d}
        /* „לעבור דרך" = מרכז השחקן נכנס אל תוך גוף המכשול עצמו (c.r),
           ולא רק שפשף את ריפוד הרדיוס שלו. */
        const gap = Math.hypot(x-c.x,z-c.z) - c.r
        if (gap < closest) closest = gap
      }
      const side1 = Math.sign((x-c.x)*dir.x + (z-c.z)*dir.z)
      if (side1 > 0 && side0 < 0 && Math.hypot(x-c.x,z-c.z) < c.r + 6) {
        /* עבר לצד השני — אבל אולי הקיף אותו. עוקף לגיטימי אם המרחק
           המזערי מן המרכז מעולם לא ירד מתחת לרדיוס. */
        if (closest < 0) crossed++
      }
      if (closest < minClear) minClear = closest
    }
  }
}
console.log(`מצב: ${MODE}`)
console.log(`מכשולים מבודדים: ${isolated} · מסלולים: ${tested}`)
console.log(`פריצות דרך מכשול: ${crossed}`)
console.log(`המרחק המזערי מגוף המכשול לאורך כל המסלולים: ${minClear.toFixed(4)} מ׳ (שלילי = חדירה)`)

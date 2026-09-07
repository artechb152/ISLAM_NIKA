/* ריצה נקייה אחת, סדרתית: מצלמה → הפרדה → ביקורת → סקירה.
   שום עריכה במקביל, ושום שני דפדפנים בו-זמנית. */
import { execFileSync } from 'node:child_process'
const R = ['yemen-heights','night-camp','border-post','narrow-pass','loading-road','yathrib','monastery','mecca','exit']
const run = (s, a, t = 420000) => {
  try { return execFileSync(process.execPath, [s, ...a], { encoding: 'utf8', timeout: t }) }
  catch (e) { return (e.stdout ?? '') + '\n[ERR] ' + String(e.message).slice(0, 80) }
}
console.log('\n### 2. הפרדה עד התייצבות, אזור אחרי אזור')
for (const r of R) {
  for (let p = 0; p < 3; p++) {
    const o = run('scratchpad/separate.mjs', [r])
    if (/— clean/.test(o) || /0 props moved/.test(o)) break
  }
}

console.log('\n### 3. ביקורת החפיפות — עולם טעון במלואו')
let total = 0
for (const r of R) {
  const a = run('scratchpad/unapproved.mjs', [r])
  const m = /UNAPPROVED=(\d+)\s+offGround=(\d+)/.exec(a)
  const c = /contacts=\s*(\d+)/.exec(a)
  const n = m ? +m[1] : -1
  total += Math.max(0, n)
  console.log(`${r.padEnd(15)} contacts=${(c ? c[1] : '?').padStart(3)}  UNAPPROVED=${n}  floating=${m ? m[2] : '?'}`)
  for (const l of a.split('\n').filter((l) => /^\s+(prop|cast|task):/.test(l)).slice(0, 5)) console.log(l)
}
console.log('\nTOTAL UNAPPROVED:', total)

console.log('\n### 4. סקירה משלוש זוויות')
process.stdout.write(run('scratchpad/sweep.mjs', ['after', ...R], 900000))

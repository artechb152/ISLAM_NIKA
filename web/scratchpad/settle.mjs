/* מפריד ומודד לסירוגין עד שהמספר מפסיק לרדת, אזור אחרי אזור,
   בלי שני דפדפנים שרצים במקביל ומרעיבים זה את זה. */
import { execFileSync } from 'node:child_process'
const regions = ['yemen-heights','night-camp','border-post','narrow-pass','loading-road','yathrib','monastery','mecca','exit']
const run = (script, args) => {
  try { return execFileSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 300000 }) }
  catch (e) { return (e.stdout ?? '') + '\n[ERR] ' + String(e.message).slice(0, 90) }
}
const final = {}
for (const r of regions) {
  for (let pass = 0; pass < 3; pass++) {
    const out = run('scratchpad/separate.mjs', [r])
    if (/— clean/.test(out) || /0 props moved/.test(out)) break
  }
  const a = run('scratchpad/unapproved.mjs', [r])
  const m = /UNAPPROVED=(\d+)\s+offGround=(\d+)/.exec(a)
  const c = /contacts=\s*(\d+)/.exec(a)
  final[r] = { contacts: c ? +c[1] : -1, unapproved: m ? +m[1] : -1, floating: m ? +m[2] : -1 }
  const lines = a.split('\n').filter((l) => /^\s+(prop|cast|task):/.test(l))
  console.log(`${r.padEnd(15)} contacts=${String(final[r].contacts).padStart(3)}  UNAPPROVED=${final[r].unapproved}  floating=${final[r].floating}`)
  for (const l of lines.slice(0, 4)) console.log(l)
}
const tot = Object.values(final).reduce((s, v) => s + Math.max(0, v.unapproved), 0)
console.log('\nTOTAL UNAPPROVED:', tot)

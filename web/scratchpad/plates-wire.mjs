import fs from 'node:fs'
const p = 'src/components/Chapter4.tsx'
let s = fs.readFileSync(p, 'utf8')
const I = ' '.repeat(16)
const after = (anchor, plate) => {
  if (!s.includes(anchor)) throw new Error('anchor missing: ' + anchor.trim().slice(0, 50))
  s = s.replace(anchor, anchor + '\n' + I + `<Plate src="${plate}" />`)
}
/* every plate sits under the sentence that describes the place it shows */
after(`${I}<T r="§1.b" className="ch4-body" reveal />\n${I}<Journey />`, 'yathrib-oasis')
after(`${I}<T r="§17.a" className="ch4-body" reveal />`, 'uhud-mount')
after(`${I}<T r="§28.a" className="ch4-body" reveal />`, 'hudaybiyyah-plain')
after(`${I}<T r="§49.b" className="ch4-body" reveal />`, 'kaaba-precinct')
after(`${I}<T r="§50.a" className="ch4-body" reveal />`, 'medina-dusk')
fs.writeFileSync(p, s)
console.log('plates in article:', (s.match(/<Plate src=/g) || []).length)

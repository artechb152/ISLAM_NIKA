import fs from 'node:fs'
let b = fs.readFileSync(process.argv[2], 'utf8').trim()
b = b.replace(/^פרק שבעה עשר: מילון מונחים קצר \(לפי סדר א-ב\)\s*/, '')
const FIX = [
  ["(מ' ,)1966", "(מ' 1966),"], ["()632-661", "(632-661)"], ["ב- ,1918", "ב-1918,"],
  ["משנת .874", "משנת 874."], ["(קוראן .)12:53", "(קוראן 12:53)."], ["(.)3:169", "(3:169)."],
  ["(מ' )2022", "(מ' 2022)"], ["(מתן ).", "(מתן)."], ["(שנת 874 ).", "(שנת 874)."],
  ["כ- 200", "כ-200"], ["כ23-", "כ-23"], ["א ָמאם", "אָמאם"], ["ר ָבאט", "רָבאט"],
  ["הטרום- אסלאמית", "הטרום-אסלאמית"], ["דתית- קיצונית", "דתית-קיצונית"],
]
for (const [a, c] of FIX) { if (!b.includes(a)) throw new Error('fix missing: ' + a); b = b.split(a).join(c) }
b = b.replace(/ \./g, '.')
const HEAD = ["אהל אל-בית","אייתולה","אָמאם (וגם השיעה האמאמית)","אסלאם","אסלאמיזם (או אסלאם פוליטי)","ג'אהליה","ג'יהאד","ג'יהאד סלפי","ג'זיה","דאר אל-אסלאם ואל-חרב","דעוה","היג'רה","ולאיה אל-פקיה","וסטיה","חדית'ים","חודיביה (הסכם)","ח'ליפה (ח'ליף)","חמש מצוות היסוד","מהדי","מואזין","מסגד","סונה","סלפיה","פתוא","צופיות (המסדרים הצופיים)","צחאבה","קאדי","קבלה","קוראן","רָבאט","שהיד","שיעה","שריעה ו- פקה","תכפיר","תפסיר","תקיה"]
const out = []; let rest = b
for (let i = 0; i < HEAD.length; i++) {
  const h = HEAD[i] + ' - '
  if (!rest.startsWith(h)) throw new Error('expected head ' + HEAD[i] + ' at: ' + rest.slice(0, 60))
  rest = rest.slice(h.length)
  const next = HEAD[i + 1] ? rest.indexOf(' ' + HEAD[i + 1] + ' - ') : -1
  const text = next < 0 ? rest : rest.slice(0, next)
  rest = next < 0 ? '' : rest.slice(next + 1)
  out.push({ id: `g${String(i + 1).padStart(2, '0')}`, term: HEAD[i], text: text.trim() })
}
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 2) + '\n')
console.log(out.length, 'entries;', out.map(e => e.text.length).join(' '))

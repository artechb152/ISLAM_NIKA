import fs from 'node:fs'

/* ההדגשות: כל ביטוי חייב להתקיים בקטע שהוא מסומן בו. הסקריפט נופל אם לא —
   הדגשה שלא נמצאת בטקסט היא מילה שהמצאתי, וזה בדיוק מה שאסור. */
const EM = {
  '§1.a': ["ית'רב"],
  '§3.a': ['אלאנצאר'],
  '§5.a': ["אלהג'רה"],
  '§8.a': ['פתנה'],
  '§11.a': ["אבו ג'הל"],
  '§13.b': ['יום הישועה'],
  '§16.echo': ['מערכת בדר'],
  '§17.a': ['שבט קוריש'],
  '§19.c': ['חמזה'],
  '§21.b': ['השהידים'],
  '§22.echo': ['אבטאל'],
  '§24.trench': ['סלמאן אלפראסי'],
  '§25.a': ['אלאחזאב'],
  '§26.a': ['בני קוריזה'],
  '§27.a': ['עמרה'],
  '§34.b': ['המצלחה'],
  '§37.b': ['צלח'],
  '§41.qaynuqa': ['בני קינוקאע'],
  '§41.nadir': ['בני נדיר'],
  '§46.a': ['עלי'],
  '§49.b': ['אבו סופיאן'],
}

const d = JSON.parse(fs.readFileSync('src/lib/chapter4/passages.json', 'utf8'))
const textOf = (ref) => {
  const [sec, id] = ref.split('.')
  const f = d.passages[sec]?.find((x) => x.id === id)
  if (!f) throw new Error('אין קטע ' + ref)
  return f.list ? f.list.join(' ') : f.text
}
for (const [ref, phrases] of Object.entries(EM)) {
  for (const ph of phrases) {
    if (!textOf(ref).includes(ph)) throw new Error(`"${ph}" אינו ב-${ref}`)
  }
}

const p = 'src/components/Chapter4.tsx'
let s = fs.readFileSync(p, 'utf8')
let hit = 0
for (const [ref, phrases] of Object.entries(EM)) {
  const list = phrases.map((x) => `'${x}'`).join(', ')
  const re = new RegExp(`<T r="\\${ref}"( className="[^"]*")?( reveal)? />`, 'g')
  const before = s
  s = s.replace(re, (m, cls = '', rev = '') => `<T r="${ref}"${cls} em={[${list}]}${rev} />`)
  if (s !== before) hit++
  else console.log('  לא נמצא ב-JSX:', ref)
}
fs.writeFileSync(p, s)
console.log(`הודגשו ${hit} מתוך ${Object.keys(EM).length}`)

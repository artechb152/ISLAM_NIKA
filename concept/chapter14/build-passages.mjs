/* Builds web/src/lib/chapter14/passages.json from SOURCE-TEXT.md.
   Each § is cut into fragments at the START strings below (in order). The cut never adds
   or drops a character: verify-chapter14.mjs re-joins the fragments of every § and
   compares them to the § itself. em = maroon emphasis, tr = gold transliteration — both
   must be substrings of their own fragment. Run: node concept/chapter14/build-passages.mjs */
import { readFile, writeFile, mkdir } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const body = src.slice(src.indexOf('## פרק ארבעה עשר'), src.indexOf('## הערות עריכה'))
const secs = {}
for (const m of body.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---|$)/gm)) secs[m[1]] = m[2].trim()

/* Every § is cut at its sentences (round 4, „compare with the finished chapters"): chapter 14
   averaged 49 words a paragraph, the longest 124, against 21–30 and ≤62 in chapters 2, 5, 6,
   8, 9 and 10. Chapter 10's method — sentence fragments, joined back into short paragraphs by
   layout.json. One fragment ('a') where the § is already one short sentence. */
const CUT = {
  '§0': [['a', 'גיבוש'], ['b', 'עם התפתחות'], ['c', 'האתגר הפך']],
  '§3': [['a', 'האסלאם עשוי'], ['b', 'הדברים מכוונים'], ['c', 'האחריות היא']],
  '§5': [['intro', 'שתי הערות חשובות'], ['one', 'האחת'], ['two', 'השנייה']],
  '§6': [['a', 'בתאריך'], ['b', 'המפקד הצבאי']],
  '§7': [['a', 'בציון שנה'], ['b', 'בדרשה, שנשא'], ['c', 'פסוק זה ירד'], ['d', 'מלחמה זו'], ['e', 'אלשרע המשיך']],
  '§8': [['a', 'אלשרע בחר'], ['b', 'ע"פ המסורת'], ['c', 'בהמשך נאומו'], ['d', 'אלשרע אמר'], ['e', 'קרעי הכיסוי']],
  '§10': [['a', 'א. פסוקי'], ['b', 'אלשרע קישר']],
  '§11': [['a', 'ב. קיום'], ['b', 'אלשרע יכול']],
  '§12': [['a', 'ג. המסגד'], ['b', 'בנוסף, בנו'], ['c', 'יתכן שאלשרע']],
  '§13': [['a', 'ד. מיקום'], ['b', 'המנבר במסגד'], ['c', 'צלאח א-דין קבור']],
  '§14': [['a', 'ה. הנסיעה'], ['b', 'הבחירה מראה']],
  '§18': [['a', 'ביום השני'], ['b', 'נעים קאסם חילק']],
  '§21': [['a', 'חשוב לציין כי מורשת'], ['b', 'בתקופת חוסיין'], ['c', 'במלחמה בין'], ['d', 'קאסם מציין בנאום'], ['e', 'חשוב לציין, כי']],
  '§23': [['a', 'חשוב לציין שחזבאללה'], ['b', 'חזבאללה רואה'], ['c', 'נעים קאסם מתייחס'], ['d', 'נעים קאסם מציין בנוסף']],
  '§24': [['a', 'ג. האמונה'], ['b', 'קאסם אומר כי'], ['c', 'האמונה, הוא אומר'], ['d', 'קאסם מצטט']],
}

/* emphasis in almost every paragraph (rule 49) */
const EM = {
  '§0.a': ['להצליב ולהעלות את רמת הסמך'],
  '§0.b': ['בכף ידו של כל אחד ואחת מאיתנו'],
  '§0.c': ['לסינון מידע לא ערכי'],
  '§1.a': ['מצויים למכביר'],
  '§2.a': ['תמונה לא מלאה', 'האויב חושב, מתנהג ופועל "אסלאמית"'],
  '§3.a': ['להיות עירניים לתוכן'],
  '§3.c': ['האחריות היא על כל בעל תפקיד בשווה'],
  '§4.a': ['כיצד ניתן לחלץ תוכן אסלאמי מהתווך הגלוי'],
  '§5.one': ['הינו רנדומלי'],
  '§5.two': ['לפי מדינה או ארגון טרור'],
  '§6.a': ['8 בדצמבר 2024'],
  '§6.b': ['תפס את השלטון במדינה'],
  '§7.a': ['לתפילת השחר'],
  '§7.b': ['שנשא עם מדי לוחם'],
  '§7.c': ['קרב בדר'],
  '§7.d': ['סמל לניצחון האסלאם על האויב הכופר'],
  '§7.e': ['ללא חת'],
  '§8.a': ['העתיק ביותר בדמשק'],
  '§8.c': ['להתפלל בכעבה'],
  '§8.d': ['קרעים מהכיסוי של הכעבה'],
  '§10.b': ['על הכופרים העלווים בסוריה'],
  '§11.b': ['בחר בדווקא את שעת התפילה במסגד'],
  '§12.b': ['יזיד בן מעאויה'],
  '§12.c': ['לאסלאם הסלפי'],
  '§13.b': ['צלאח א-דין אלאיובי'],
  '§13.c': ['קבור בחצר המסגד האומיי'],
  '§14.b': ['עד כמה אלשרע אדוק בדתו'],
  '§15.a': ['לבוש במדי לוחם!'],
  '§16.a': ['חייב להיות בבסיס כל ניתוח מודיעיני'],
  '§18.b': ['לארבעה חלקים'],
  '§20.a': ['ההקרבה של חוסיין למען אללה'],
  '§21.a': ['אי-כניעה לכופר, ולא משנה מי הכופר'],
  '§21.b': ['זהו נשיא ארה"ב'],
  '§21.c': ['לא יתכן שהאסלאם ייכנע בפני הכופר'],
  '§21.e': ['תיקון העוול'],
  '§22.a': ['ניצחון להתנגדות'],
  '§23.a': ['נבנתה בצלמה ובדמותה'],
  '§23.b': ['את חכם ההלכה שלה'],
  '§23.c': ['התנתה כל הסכם עמה'],
  '§24.a': ['מפצים על זה'],
  '§24.c': ['לחזור לשדה הקרב'],
  '§25.a': ['הקשר בל-יינתק בין חזבאללה לאיראן'],
  '§26.a': ['לכל מוטיב אסלאמי ולכל פסוק'],
}
const TR = {
  '§0.a': ['סג"חים'],
  '§7.a': ['מנבר'],
  '§8.d': ['כסוה'],
  '§12.a': ['"שאם"'],
  '§18.a': ["העאשוראא'"],
  '§21.d': ["טוע'יאן"],
  '§24.a': ['אלאימאן', 'אראדה', 'אלקדרה'],
}
/* a motif's own title — the lettered opening the source gives it („א. פסוקי קוראן בתחילת
   הנאום"). The page sets it as the card's heading; it is the start of the sentence, so it
   is cut, never written. */
const HEAD = {
  '§10.a': 'א. פסוקי קוראן בתחילת הנאום',
  '§11.a': 'ב. קיום התפילה',
  '§12.a': 'ג. המסגד האומיי',
  '§13.a': 'ד. מיקום הנאום',
  '§14.a': 'ה. הנסיעה למכה',
  '§20.a': "א. קרב כרבלאא'",
  '§22.a': 'ב. ההסכם בין ארה"ב לאיראן',
  '§24.a': 'ג. האמונה והרוח כפיצוי לכוח הצבאי',
}
/* round 2's pressable reading lit these in the speech; it was taken down in round 3 */
const POINTS = {}

const out = {}
for (const [sec, t] of Object.entries(secs)) {
  const cuts = CUT[sec] ?? [['a', t.slice(0, 12)]]
  const pos = []
  for (const [fid, start] of cuts) {
    const i = t.indexOf(start, pos.length ? pos[pos.length - 1][1] + 1 : 0)
    if (i < 0) throw new Error(`${sec}.${fid}: start "${start}" not found`)
    pos.push([fid, i])
  }
  if (pos[0][1] !== 0) throw new Error(`${sec}: first cut not at 0`)
  out[sec] = pos.map(([fid, i], k) => {
    const j = k + 1 < pos.length ? pos[k + 1][1] : t.length
    const f = { id: fid, text: t.slice(i, j).trim() }
    const r = `${sec}.${fid}`
    if (EM[r]) f.em = EM[r]
    if (TR[r]) f.tr = TR[r]
    if (HEAD[r]) {
      if (!f.text.startsWith(HEAD[r])) throw new Error(`${r}: head is not the start of the sentence`)
      f.head = HEAD[r]
    }
    if (POINTS[r]) f.points = POINTS[r].map(([from, at]) => ({ from, at }))
    return f
  })
}
for (const r of [...Object.keys(EM), ...Object.keys(TR), ...Object.keys(POINTS), ...Object.keys(HEAD)]) {
  const [s, i] = r.split('.')
  if (!out[s]?.some((f) => f.id === i)) throw new Error(`mark on unknown fragment ${r}`)
}
const data = {
  $note: 'כל מילה בפרק 14 חיה כאן, פעם אחת. נבנה מ-concept/chapter14/SOURCE-TEXT.md על ידי build-passages.mjs — לא לערוך ביד. concept/chapter14/verify-chapter14.mjs מוודא שכל קטע במקור, שהקטעים של כל § מרכיבים אותו בשלמותו, שכל הדגשה, תעתיק ונקודת-נאום הם תת-מחרוזת של המשפט שלהם, ושהפריסה צורכת כל קטע בדיוק פעם אחת ובסדר המקור (המקור 1 ל-1).',
  number: 14, title: 'מוטיבים אסלאמיים מתוך המודיעין הגלוי', menuTitle: 'פרק 14 · מוטיבים אסלאמיים מתוך המודיעין הגלוי', passages: out,
}
const dir = new URL('../../web/src/lib/chapter14/', here)
await mkdir(dir, { recursive: true })
await writeFile(new URL('passages.json', dir), JSON.stringify(data, null, 2) + '\n')
console.log(Object.values(out).reduce((n, v) => n + v.length, 0), 'fragments')

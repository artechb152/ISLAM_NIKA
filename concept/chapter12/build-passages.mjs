/* Builds web/src/lib/chapter12/passages.json from SOURCE-TEXT.md — chapter 11's builder.
   Each § is cut into fragments at the START strings below (in order). The cut never adds
   or drops a character: verify-chapter12.mjs re-joins the fragments of every § and
   compares them to the § itself. The cuts sit where a card, a station or a paragraph begins.
   em = maroon emphasis, tr = gold transliteration — substrings of their own fragment (the gate checks).
   Arabic is not declared: the page isolates every Arabic run by itself (<bdi lang="ar">).
   Run: node concept/chapter12/build-passages.mjs */
import { readFile, writeFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const body = src.slice(src.indexOf('## פרק שנים-עשר'), src.indexOf('## הערות עריכה'))
const secs = {}
for (const m of body.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---|$)/gm)) secs[m[1]] = m[2].trim()

const CUT = {
  '§0': [['meaning', `המילה ג'האד`], ['root', 'שורש המילה'], ['quran', 'בקוראן כתוב'], ['v1', 'למשל, שבר'], ['v2', 'ועוד, שבר']],
  '§1': [['a', 'מנגד, ישנם'], ['verse', 'כך: لَا']],
  '§2': [['a', 'במסורת המוסלמית'], ['sufi', 'המסדרים הצופיים'], ['weak', 'כאמור, רבים']],
  '§3': [['a', 'עם התפתחות'], ['verse', 'כך: "']],
  '§4': [['a', `סוגי הג'האד`], ['hamas', 'בארגון הטרור חמאס'], ['defence', 'מתוך האמנה'], ['pij', `לארגון הג'האד`], ['qaeda', 'לעומתם, ארגון']],
  '§5': [['a', 'כמו כן']],
  '§6': [['a', 'ארגוני הטרור מצאו'], ['ramadan', 'ולכן, מידי שנה'], ['rule', 'מצוות רשות']],
  '§7': [['a', 'באשר ל'], ['kifaya', 'חובה כללית זו'], ['ayn', 'שונה ממנה'], ['meaning', 'להפיכת הג'], ['new', 'זהו חידוש']],
  '§8': [['fall', 'נפילתה של'], ['banna', 'מייסד האחים'], ['bannaAns', 'בשל כך הגיע'], ['bannaRuler', 'חסן אלבנא נדרש'],
    ['qutb', 'לעומתו, סיד קטב'], ['qutbBook', 'סיד קטב, בספרו'], ['qutbNow', 'לדעתו של קטב'], ['qutbEnd', 'דעותיו הרדיקאליות']],
  '§9': [['who', `השיח' ד"ר עבדאללה`], ['mufti', 'מקובל לומר'], ['fatwa', 'עזאם פרסם']],
  '§10': [['a', 'בשנות ה-90']],
  '§11': [['a', 'באמנה של']],
  '§12': [['verse', 'בקוראן (8:60)'], ['origin', 'שבר הפסוק'], ['root', 'המילה "רבאט"'], ['meaning', 'בפסוק הנ"ל'], ['aim', 'מטרת-העל'],
    ['v2', 'פסוק נוסף'], ['meaning2', 'בפסוק זה']],
  '§13': [['a', 'במשך ההיסטוריה']],
  '§14': [['a', `ספרות החדית'`]],
  '§15': [['a', 'בקרב המסדרים']],
  '§16': [['a', 'עם התפתחות'], ['part', 'לדברי עזאם, הרבאט הוא מחלקי'], ['crown', 'לדברי עזאם, הרבאט הוא הכתר']],
  '§17': [['a', 'עם הזמן'], ['aqsa', 'כך, ניתן'], ['call', 'בנוסף, מידי'], ['saddles', 'המונח "קשירת']],
  '§18': [['a', `השיח' ד"ר יוסף`]],
  '§19': [['a', 'פירוש מילה זו'], ['witness', 'פירוש המילה שהיד'], ['cf', '(השווה']],
  '§20': [['a', 'המסורת המוסלמית'], ['akhira', 'שהיד העולם הבא ('], ['dunya', 'לבין שהיד']],
  '§21': [['a', 'השהיד באסלאם'], ['suicide', 'כלומר, קיימת']],
  '§22': [['a', 'גמולי השהיד'], ['list', 'בין גמולי']],
  '§23': [['a', 'תנועת ההתנגדות'], ['yasin', 'מייסדה, השיח'], ['charter', 'בשלהי שנת']],
  '§24': [['a', 'עיקרי המסרים']],
  '§25': [['a', 'א. ']],
  '§26': [['a', 'ב. ']],
  '§27': [['a', 'ג. ']],
  '§28': [['a', 'מכיוון שאמנת'], ['trees', 'בהמשך האמנה']],
  '§29': [['a', 'בנוסף, באמנת'], ['accused', 'היהודים מואשמים'], ['banna', 'חסן אלבנא, מייסד']],
}

const EM = {
  '§0.meaning': ['מאמץ, מאבק'],
  '§0.quran': ['ולא כולם בהקשר ללחימה'],
  '§1.a': [`לג'האד מלחמתי`],
  '§2.a': [`ג'האד הנפש`],
  '§2.sufi': ['העבודה העצמית שלו'],
  '§3.a': [`אינו כלול במצוות היסוד של האסלאם`],
  '§4.a': ['שונה מארגון לארגון'],
  '§4.defence': ['מגננתי'],
  '§4.qaeda': ['מניעת השתלטות הכפירה בעולם'],
  '§6.ramadan': [`"חודש ג'האד"`],
  '§7.kifaya': ['חובה קיבוצית'],
  '§7.ayn': ['מוטלת על הפרט בכל מצב'],
  '§7.meaning': ['אינו צריך לבקש אישור מאביו'],
  '§8.fall': ['האסלאם נותר ללא מדינה'],
  '§8.bannaAns': ['להכשיר את לבבות האומה המוסלמית'],
  '§8.bannaRuler': [`ג'האד בלב`],
  '§8.qutb': ['להפיל בכל מחיר'],
  '§8.qutbBook': ['מצב נפשי'],
  '§9.fatwa': ['חובה אישית'],
  '§10.a': ['חובה אישית על כל מוסלמי'],
  '§11.a': ['חובה אישית על כל מוסלמי'],
  '§12.root': ['קשירה'],
  '§12.meaning': ['הכנת כוח צבאי ללחימה'],
  '§12.meaning2': ['עמידה על המשמר'],
  '§13.a': ['מבצרים וצריחים'],
  '§15.a': ['המתנה במסגד לקראת התפילה הבאה'],
  '§16.part': ['הכנה ללחימה'],
  '§17.a': ['הקשר לאדמה'],
  '§17.call': ['"לקשור את אוכפי הגמלים"'],
  '§18.a': [`"אדמת הרבאט והג'האד"`],
  '§19.witness': ['"עד"'],
  '§21.a': ['לא נחשב מת'],
  '§21.suicide': ['האסורה באיסור מוחלט באסלאם'],
  '§23.charter': ['המסמך האידאולוגי החשוב ביותר'],
  '§25.a': ['דתי'],
  '§26.a': ['"חובה אישית"'],
  '§27.a': ['"ככל שיארך הזמן."'],
  '§29.a': ['מוטיבים אנטישמיים מובהקים'],
}
const TR = {
  '§0.quran': ['קתאל'],
  '§1.a': [`ע'זואת`],
  '§2.weak': [`צ'עיף`],
  '§4.defence': [`ג'האד אלדפע`],
  '§7.a': ['פרד כפאיה', 'פרד עין'],
  '§8.bannaAns': ['השריעה'],
  '§8.qutbBook': [`ג'אהליה`],
  '§9.fatwa': ['מג\'אהדין'],
  '§12.aim': ['ארהאב'],
  '§16.crown': [`תאג'`, `ג'והר`],
  '§20.akhira': [`שהיד אלאאח'רה`],
  '§20.dunya': [`שהיד אלדניא ואלאאח'רה`],
  '§21.suicide': ['אתנחאר'],
  '§23.a': [`חרכה' אלמקאומה אלאסלאמיה`],
  '§23.yasin': ['דעוה'],
  '§25.a': ['ארד וקפ'],
  '§26.a': ['דפאעי'],
}

const out = {}
for (const [sec, t] of Object.entries(secs)) {
  const cuts = CUT[sec]
  if (!cuts) throw new Error(`no cuts for ${sec}`)
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
    return f
  })
}
for (const r of [...Object.keys(EM), ...Object.keys(TR)]) {
  const [s, i] = r.split('.')
  if (!out[s]?.some((f) => f.id === i)) throw new Error(`mark on unknown fragment ${r}`)
}
const data = {
  $note: 'כל מילה בפרק 12 חיה כאן, פעם אחת. נבנה מ-concept/chapter12/SOURCE-TEXT.md על ידי build-passages.mjs — לא לערוך ביד. concept/chapter12/verify-chapter12.mjs מוודא שכל קטע במקור, שהקטעים של כל § מרכיבים אותו בשלמותו, שכל הדגשה ותעתיק הם תת-מחרוזת של המשפט שלהם, ושהפריסה צורכת כל קטע בדיוק פעם אחת ובסדר המקור.',
  number: 12, title: `ג'האד, רבאט ואסתשהאד`, menuTitle: `פרק 12 · ג'האד, רבאט ואסתשהאד`, passages: out,
}
await writeFile(new URL('../../web/src/lib/chapter12/passages.json', here), JSON.stringify(data, null, 2) + '\n')
console.log(Object.values(out).reduce((n, v) => n + v.length, 0), 'fragments')

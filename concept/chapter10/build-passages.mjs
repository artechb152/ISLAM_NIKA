/* Builds web/src/lib/chapter10/passages.json from SOURCE-TEXT.md.
   Each § is cut into fragments at the START strings below (in order). The cut never adds
   or drops a character: verify-chapter10.mjs re-joins the fragments of every § and
   compares them to the § itself. em = maroon emphasis, tr = gold transliteration —
   both must be substrings of their own fragment (the gate checks).
   Run: node concept/chapter10/build-passages.mjs */
import { readFile, writeFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const body = src.slice(src.indexOf('## פרק עשירי'), src.indexOf('## הערות עריכה'))
const secs = {}
for (const m of body.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---|$)/gm)) secs[m[1]] = m[2].trim()

const CUT = {
  '§0': [['name', 'העלאוים זה כינוי'], ['origin', 'השם עלאוים'], ['nusayri', 'במשך מאות שנים'], ['christ', 'יתכן על שם'], ['place', 'ויתכן שזה'], ['founder', 'משה מעוז']],
  '§1': [['a', 'האמונה העלאוית'], ['sky', 'כך, ביסודה'], ['christ', 'בנוסף, טקסי'], ['ali', 'כל היסודות'], ['salman', 'העלאוים מאמינים גם']],
  '§2': [['secret', 'כמו הדת הדרוזית'], ['qiddas', 'בשונה מהזרמים']],
  '§3': [['poor', 'בסוריה, שם'], ['hate', 'השנאה כלפיהם'], ['taymiyya', 'הגדיל לעשות'], ['forced', "באימפריה העות'מאנית"], ['sold', 'מצבם של העלאוים'], ['france', 'לאחר שצרפת']],
  '§4': [['revolt', 'בהמשך, יילחמו'], ['politics', 'עם השנים']],
  '§5': [['a', 'הדת הדרוזית היא'], ['hakim', 'המנהיג הראשון'], ['hamza', 'האישיות שעיצבה']],
  '§6': [['god', 'עיקרי הדת'], ['adwar', 'העולם, לשיטתו'], ['shuayb', 'דמות מזוהה'], ['quran', 'שעיב מוזכר']],
  '§7': [['vanish', 'אלחאכם באמר אללה נעלם'], ['clothes', 'לפי אמונתם'], ['mahdi', 'אלחאכם נחשב'], ['closed', 'בשנת 1037'], ['tanukh', 'ההיסטוריה מספרת']],
  '§8': [['a', 'ברבות השנים'], ['traces', 'אלא, שלמרות']],
  '§9': [['maan', 'תולדות הדרוזים'], ['y1860', 'בשנת 1860'], ['y1925', 'בשנת 1925'], ['shishakli', 'מאז היוסדה']],
  '§10': [['a', 'הדרוזים, שלרוב']],
  '§11': [['sharaa', 'עם עלייתו'], ['damascus', 'במסגרת העימותים'], ['israel', 'העימותים נמשכו']],
}

const EM = {
  '§0.name': ['שיסודו באסלאם השיעי', 'תערובת של מסורות מדתות שונות'],
  '§0.origin': ['מקורו באמאם עלי'],
  '§0.nusayri': ['"נצירים"'],
  '§0.christ': ['יתכן'],
  '§0.place': ['ויתכן', 'לאטקיה בסוריה'],
  '§0.founder': ['ככל הנראה', 'חכם דת שיעי'],
  '§1.sky': ['פולחן לגרמי השמים'],
  '§1.christ': ['לוח השנה השמשי'],
  '§1.ali': ['התגלמות הא-ל באדם'],
  '§1.salman': ['בסלמאן אלפרסי'],
  '§2.secret': ['דת סודית'],
  '§2.qiddas': ['טקס יחיד', 'בבית הפרטי של המאמין ולא במסגד'],
  '§3.poor': ['עניים ומדוכאים'],
  '§3.hate': ['"חריגים בנוף הדתי"'],
  '§3.taymiyya': ['כופרים גרועים מן הנוצרים ומן היהודים', 'והמלחמה בהם היא מצווה'],
  '§3.forced': ['בכפיה'],
  '§3.sold': ['לשפל חסר תקדים'],
  '§3.france': ['כשכירי חרב בצבא המנדט'],
  '§4.revolt': ['במרד הדרוזי'],
  '§4.politics': ['הם ראו בעדה משענת'],
  '§5.a': ['השיעה האסמאעילית', 'במאה האחד עשר במצרים'],
  '§5.hakim': ['הח\'ליף השישי של השושלת הפאטמית'],
  '§5.hamza': ['"אגרות החכמה"'],
  '§6.god': ['מונותאיסטית', 'לא נתפס בשכל האנושי'],
  '§6.adwar': ['מתגלם בדמות בשר ודם'],
  '§6.shuayb': ['הנביא שעיב', 'יתרו המקראי'],
  '§7.vanish': ['נעלם בשנת 1021'],
  '§7.clothes': ['מצאו את בגדיו זקופים'],
  '§7.mahdi': ['ויחזור כמהדי'],
  '§7.closed': ['ננעלו שערי ההטפה הדרוזית'],
  '§7.tanukh': ['שבט תנוח\''],
  '§8.a': ['התרחקה הדת הדרוזית מהאסלאם'],
  '§8.traces': ['אינה דת הלכה'],
  '§9.maan': ['שושלת בית מען'],
  '§9.y1860': ['הטבח הגדול של הדרוזים במרונים'],
  '§9.y1925': ['שחררו הדרוזים את הר הדרוזים'],
  '§9.shishakli': ['\'ראש הנחש\''],
  '§10.a': ['נאמנים למשטר', 'למיעוט פגיע'],
  '§11.sharaa': ['א-סווידא'],
  '§11.israel': ['מדינת ישראל התערבה'],
}
const TR = {
  '§2.secret': ['חאצה', 'עאמה'],
  '§2.qiddas': ['קדאס'],
  '§3.taymiyya': ['פתוה'],
  '§5.hamza': ['רסאאל אלחכמה'],
  '§6.adwar': ['אדואר'],
  '§7.mahdi': ["ע'אאב"],
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
  $note: 'כל מילה בפרק 10 חיה כאן, פעם אחת. נבנה מ-concept/chapter10/SOURCE-TEXT.md על ידי build-passages.mjs — לא לערוך ביד. concept/chapter10/verify-chapter10.mjs מוודא שכל קטע במקור, שהקטעים של כל § מרכיבים אותו בשלמותו, שכל הדגשה ותעתיק הם תת-מחרוזת של המשפט שלהם, ושכל קטע נצרך בדיוק פעם אחת.',
  number: 10, title: 'זרמים שונים באסלאם', menuTitle: 'פרק 10 · זרמים שונים באסלאם', passages: out,
}
await writeFile(new URL('../../web/src/lib/chapter10/passages.json', here), JSON.stringify(data, null, 2) + '\n')
console.log(Object.values(out).reduce((n, v) => n + v.length, 0), 'fragments')

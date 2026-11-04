/* Builds web/src/lib/chapter16/passages.json from SOURCE-TEXT.md (chapter 10's builder).
   Each § is cut into fragments at the START strings below (in order). The cut never adds
   or drops a character: verify-chapter16.mjs re-joins the fragments of every § and
   compares them to the § itself. em = maroon emphasis, tr = gold transliteration —
   both must be substrings of their own fragment (the gate checks).

   The source sets the NAME of each occasion in bold (SOURCE-TEXT, „הדגשה"). Those names
   are the first `em` of their fragment: the source's own emphasis, not one added here.
   Run: node concept/chapter16/build-passages.mjs */
import { readFile, writeFile, mkdir } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const body = src.slice(src.indexOf('## פרק ששה עשר'), src.indexOf('## הערות עריכה'))
const secs = {}
for (const m of body.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---|$)/gm)) secs[m[1]] = m[2].trim()

const CUT = {
  '§0': [['a', 'באסלאם יש חשיבות']],
  '§1': [['kinds', 'ימי הציון נחלקים'], ['split', 'כמו כן, קיים שוני'], ['alert', 'לכל מועד קיימות']],
  '§2': [['a', 'לכל מועד קיימים']],
  '§3': [['a', 'באסלאם הסוני']],
  '§4': [['when', 'חג שבירת הצום'], ['small', 'באסלאם הוא נקרא'], ['prayer', 'המנהגים הרווחים'], ['charity', 'כמו כן, המוסלמים'],
    ['clothes', 'המוסלמים נוהגים לקנות'], ['family', 'קיים מנהג עתיק'], ['gifts', 'יש כאלה שנוהגים']],
  '§5': [['dates', 'ישנן מסורות'], ['shawwal', 'בחודש שואל']],
  '§6': [['a', 'ברכות רווחות']],
  '§7': [['source', 'חג הקרבן (עיד'], ['when', 'החג מתחיל'], ['abraham', 'מהות החג'], ['poor', 'גם בחג זה'],
    ['tashriq', 'שאר שלושת הימים'], ['sun', 'המילה תשריק']],
  '§8': [['a', 'קיים חג נוסף'], ['bida', 'מכיוון שאין']],
  '§9': [['a', 'צום רמדאן']],
  '§10': [['a', "צום העאשוראא'"]],
  '§11': [['when', 'המסע הלילי'], ['jerusalem', 'אירוע זה משמעותי'], ['oct7', 'תחקורי מחבלים'], ['see', 'על מהות אירוע']],
  '§12': [['a', 'סביב לילה זה']],
  '§13': [['a', 'באסלאם השיעי']],
  '§14': [['when', 'חג הנאמנות'], ['ghadir', 'יש המציינים'], ['sermons', 'ביום זה נושאים']],
  '§15': [['when', "יום העאשוראא' -"], ['see', 'להרחבה על'], ['streets', 'יום זה הוא'], ['speeches', 'לרוב, נישאים']],
  '§16': [['when', 'יום הארבעים'], ['hadith', "יש חדית'"], ['custom', 'המנהג הוא'], ['lash', 'יש הנוהגים להלקות']],
  '§17': [['a', 'יום מותה של פאטמה']],
  '§18': [['a', 'יום מותו של עלי']],
  '§19': [['a', 'בנוסף, קיימים'], ['meals', 'בימים מעין'], ['listen', 'ההקשבה לפסוקים']],
}

const EM = {
  '§0.a': ['בעיצוב הזיכרון הקולקטיבי'],
  '§1.kinds': ['צומות וימי אבל'],
  '§1.split': ['האסלאם הסוני', 'באסלאם השיעי'],
  '§1.alert': ['ולטרמינולוגיה של ארגוני הטרור'],
  '§2.a': ['לחקות את מוחמד'],
  '§3.a': ['שני חגים בלבד'],
  '§4.when': ['חג שבירת הצום', 'מיד עם סיום חודש רמדאן'],
  '§4.small': ['החג הקטן'],
  '§4.prayer': ['תפילה נוספת בבוקר'],
  '§4.charity': ['צדקה נוספת'],
  '§4.clothes': ['בגדים חדשים'],
  '§4.family': ['ביקורי משפחות'],
  '§5.shawwal': ['ששה ימים'],
  '§7.source': ['מקורו בקוראן'],
  '§7.when': ['ארבעה ימים'],
  '§7.abraham': ['שחיטת כבש לזכר אברהם'],
  '§7.poor': ['מבשר הקרבן ליתומים ולנזקקים'],
  '§7.tashriq': ['זריקת אבנים על השטן'],
  '§7.sun': ['"חשיפה לשמש"'],
  '§8.a': ['יום ההולדת של מוחמד', 'שלא מובא במקורות האסלאם'],
  '§8.bida': ['הוהאבים', 'חידוש מגונה'],
  '§9.a': ['צום רמדאן'],
  '§10.a': ["צום העאשוראא' (רשות)"],
  '§11.when': ['המסע הלילי והעלייה לשמים'],
  '§11.jerusalem': ['קדושת ירושלים'],
  '§11.oct7': ['טיהור "בית אלמקדס"'],
  '§12.a': ['הנס הפלאי'],
  '§13.a': ['באסלאם השיעי'],
  '§14.when': ['חג הנאמנות', 'הבעת נאמנות לעלי'],
  '§14.sermons': ['משפחת הנביא'],
  '§15.when': ["יום העאשוראא'", 'יום אבל לזכרו של חוסיין'],
  '§15.streets': ['המשמעותי ביותר עבור האסלאם השיעי'],
  '§15.speeches': ['אי-הכניעה', 'גם חוסיין לא נכנע'],
  '§16.when': ['יום הארבעים', 'לפקוד את קברו של חוסיין'],
  '§16.hadith': ['לסימני ההיכר של השיעים'],
  '§17.a': ['יום מותה של פאטמה', 'המסורות חלוקות'],
  '§18.a': ['יום מותו של עלי', 'במסגד בכופה'],
  '§19.a': ['"שהידים"'],
  '§19.meals': ['נאומים בעלי אופי מסית'],
  '§19.listen': ['עם מטען דתי גבוה'],
}
const TR = {
  '§4.when': ['עִיד אַלְפִטֶר'],
  '§4.prayer': ['בְּתַכְּבִּיר'],
  '§4.family': ["צִלַּהּ' אַלְרַחְם"],
  '§4.gifts': ['עִידִיַּה'],
  '§7.source': ['עיד אלאדחא'],
  '§7.tashriq': ['אַיַּאם אַלתַּשְׁרִיק', 'הוֻקֻוּף'],
  '§8.a': ['מַוְלִד אַלנַּבִּי'],
  '§8.bida': ['בִּדְעַה'],
  '§11.when': ["אַלְאִסְרַאא' וַאלְמִעְרַאג'"],
  '§14.ghadir': ["עִיד אַלְעַ'דִּיר"],
  '§15.streets': ['תַּטְבִּיר', 'אִדְמַאא'],
  '§16.when': ["זְיַארַה' אַלְאַרְבַּעִין"],
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
  $note: 'כל מילה בפרק 16 חיה כאן, פעם אחת. נבנה מ-concept/chapter16/SOURCE-TEXT.md על ידי build-passages.mjs — לא לערוך ביד. concept/chapter16/verify-chapter16.mjs מוודא שכל קטע במקור, שהקטעים של כל § מרכיבים אותו בשלמותו, שכל הדגשה ותעתיק הם תת-מחרוזת של המשפט שלהם, ושכל קטע נצרך בדיוק פעם אחת.',
  number: 16, title: 'ימי ציון ואזכור', menuTitle: 'פרק 16 · ימי ציון ואזכור', passages: out,
}
const dir = new URL('../../web/src/lib/chapter16/', here)
await mkdir(dir, { recursive: true })
await writeFile(new URL('passages.json', dir), JSON.stringify(data, null, 2) + '\n')
console.log(Object.values(out).reduce((n, v) => n + v.length, 0), 'fragments')

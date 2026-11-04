/* Builds web/src/lib/chapter11/passages.json from SOURCE-TEXT.md.
   Each § is cut into fragments at the START strings below (in order). The cut never adds
   or drops a character: verify-chapter11.mjs re-joins the fragments of every § and
   compares them to the § itself. The cuts sit where the map moves or a card begins —
   a fragment is the unit a camera stop or a card prints. em = maroon emphasis,
   tr = gold transliteration — both must be substrings of their own fragment (the gate checks).
   Run: node concept/chapter11/build-passages.mjs */
import { readFile, writeFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const src = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const body = src.slice(src.indexOf('## פרק אחד עשר'), src.indexOf('## הערות עריכה'))
const secs = {}
for (const m of body.matchAll(/^### (§\d+)\n([\s\S]*?)(?=\n### |\n## |\n---|$)/gm)) secs[m[1]] = m[2].trim()

const CUT = {
  '§0': [['way', 'האסלאם הינו'], ['halakha', 'אך מעל הכל'], ['covers', 'ההלכה גם כן'], ['ibadat', 'הן בפרקטיקות'],
    ['muamalat', 'והן בפרקטיקות'], ['sharia', 'ההלכה האסלאמית נקראת'], ['fiqh', 'מדע ההלכה'], ['reward', 'האסלאם מאמין כי']],
  '§1': [['intro', 'מקורות ההלכה באסלאם'], ['quran', 'הקוראן כמקור'], ['sunna', 'המקור השני'], ['bida', 'כל מנהג אחר'],
    ['derive', 'כנגזרת'], ['ijma', 'האחד הוא הסכמת'], ['qiyas', 'הנגזרת השנייה'], ['drive', 'למשל, האם מותר'],
    ['gezera', 'המתודולוגיה של ההיקש']],
  '§2': [['a', 'כמה עשרות שנים'], ['four', 'באסלאם הסוני קיימות'], ['geo', 'האסכולות התחלקו'],
    ['hanafi', 'הראשונה קרויה'], ['hanafiWhere', 'היא נפוצה בעיקר בטורקיה'],
    ['maliki', 'השנייה קרויה'], ['malikiWhere', 'היא נפוצה בעיקר בצפון'], ['malikiTrait', 'אסכולה זו מייחסת'],
    ['shafii', 'השלישית קרויה'], ['shafiiWhere', 'היא נפוצה בחלקים'],
    ['hanbali', 'האסכולה הרביעית'], ['hanbaliWhere', 'אסכולה זו נפוצה בעיקר בערב'],
    ['taymiyya', 'המלומד המוסלמי'], ['israel', 'במדינת ישראל']],
  '§3': [['a', 'בעולם הערבי']],
  '§4': [['two', 'נהוג לחלק'], ['wasat', 'הזרם הראשון הוא'], ['worldview', 'הוסטיה איננה רק'], ['alt', 'הוסטיה מציגה'],
    ['roots', 'אסכולה זו יונקת'], ['slogan', 'מכיוון שבאסלאם'], ['maqasid', 'הפתרון הזה משתלב'],
    ['mechs', 'המנגנונים בהם'], ['maslaha', 'האחד הוא המצלחה'], ['darura', 'השני הוא'],
    ['rule', 'כל מה שמגן'], ['slip', 'הזרם הוסטי מתיר']],
  '§5': [['born', 'חכם הדת'], ['exile', 'גורש לקטר'], ['minorities', 'כמו כן, מזוהה'], ['hamas', 'עשוי להיחשב'], ['died', 'מת בקטר']],
  '§6': [['name', 'הזרם השני הוא'], ['bida', 'כל הוספה נקראת'], ['tawhid', 'עקרונות היסוד'], ['graves', 'ולכן, הם אוסרים'],
    ['wala', 'בנוסף, הסלפים'], ['apart', 'הסלפים מצווים'], ['images', 'הסלפים לא מציירים'],
    ['saudi', 'החברה המזוהה ביותר'], ['today', 'כיום, המונח'], ['europe', 'מוסלמים (אם כי']],
}

const EM = {
  '§0.way': ['"דרך חיים"'],
  '§0.halakha': ['דת הלכה'],
  '§0.covers': ['מקיפה את כל חייו של המוסלמי'],
  '§0.ibadat': ['"שבין אדם לקונו"'],
  '§0.muamalat': ['"שבין אדם לחבירו"'],
  '§0.sharia': ['הסדרת כלל תחומי החיים'],
  '§0.reward': ['גמול רוחני בעולם הבא'],
  '§1.quran': ['הסמכות העליונה', 'חד-משמעיות ולא ניתנות לפרשנות'],
  '§1.sunna': ['דרכו, מעשיו, הליכותיו של מוחמד'],
  '§1.bida': ['"חידוש מגונה"'],
  '§1.derive': ['שתי מתודולוגיות'],
  '§1.ijma': ['הסכמת הכלל', 'אינם טועים'],
  '§1.qiyas': ['אנלוגיה'],
  '§1.drive': ['לנהוג ברכב'],
  '§1.gezera': ['"גזירה שווה"'],
  '§2.a': ['כמה עשרות שנים בלבד'],
  '§2.four': ['ארבע אסכולות'],
  '§2.geo': ['לחלוקה גאוגרפית', '"זליגה"'],
  '§2.hanafiWhere': ['בטורקיה'],
  '§2.malikiWhere': ['בצפון אפריקה'],
  '§2.malikiTrait': ['למנהגי תושבי מדינה מתקופת מוחמד ולאחריו'],
  '§2.shafii': ['כשמרנית יותר מקודמותיה', 'הגבלת השימוש בהיקש'],
  '§2.shafiiWhere': ['ממצרים'],
  '§2.hanbaliWhere': ['בערב הסעודית ובקטר', 'המחמירה ביותר'],
  '§2.taymiyya': ['אבן תימיה'],
  '§2.israel': ['כמו האסכולה החנפית'],
  '§3.a': ['על פי אוריינטציה סוציולוגית'],
  '§4.two': ['לשניים'],
  '§4.wasat': ['"שביל הזהב"'],
  '§4.worldview': ['תפיסת עולם ודרך חיים', 'את הטוב שבו'],
  '§4.alt': ['כחלופה למתמערבים'],
  '§4.roots': ['ממוחמד עבדה ורשיד רדא'],
  '§4.slogan': ['"הקלה בפסיקת ההלכה והפצת הדת בדרכי נועם"'],
  '§4.maqasid': ['מטרות-העל של האסלאם'],
  '§4.mechs': ['להקל על ההלכה'],
  '§4.maslaha': ['התועלת'],
  '§4.darura': ['ההכרח', "'פיקוח נפש'"],
  '§4.rule': ['"לכתחילה"'],
  '§4.slip': ['לזלוג מאסכולה הלכתית אחת לאחרת', 'להוסיף עוד מטרות-על'],
  '§5.born': ['יוסף אלקרדאוי'],
  '§5.exile': ['האיגוד העולמי לחכמי הדת'],
  '§5.minorities': ['הלכות המיעוטים'],
  '§5.hamas': ['עשוי להיחשב'],
  '§6.name': ['"אבות קדמונים"', 'שלושת הדורות הראשונים'],
  '§6.tawhid': ['ייחוד הא-ל'],
  '§6.graves': ['"קברי צדיקים"'],
  '§6.wala': ['בנאמנות והתנערות'],
  '§6.apart': ['כקוצו של יו"ד'],
  '§6.images': ['לא מציירים דמויות של אנשים'],
  '§6.saudi': ['ערב הסעודית'],
  '§6.today': ['מתכתב עם הוהאביה'],
  '§6.europe': ['מסומליה'],
}
const TR = {
  '§0.way': ["מנהג'"],
  '§0.ibadat': ['עבאדאת'],
  '§0.muamalat': ['מעאמלאת'],
  '§0.sharia': ['שריעה'],
  '§0.fiqh': ['פקה', 'אצול אל-פקה'],
  '§1.sunna': ['הסונה'],
  '§1.ijma': ["אג'מאע"],
  '§1.qiyas': ['קיאס'],
  '§2.hanafi': ['האסכולה החנפית'],
  '§2.maliki': ['האסכולה המאלכית'],
  '§2.shafii': ['האסכולה השאפעית'],
  '§2.hanbali': ['האסכולה החנבלית'],
  '§4.wasat': ['וסטיה'],
  '§4.slogan': ['التيسير في الفتوى والتبشير في الدعوة'],
  '§4.maqasid': ['מקאצד אלשריעה'],
  '§4.maslaha': ['המצלחה'],
  '§4.darura': ["הד'רורה"],
  '§4.rule': ['מצלחה', 'מפסדה'],
  '§5.minorities': ['פקה אלאקליאת'],
  '§6.name': ['סלף'],
  '§6.bida': ['"בדעה"'],
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
  $note: 'כל מילה בפרק 11 חיה כאן, פעם אחת. נבנה מ-concept/chapter11/SOURCE-TEXT.md על ידי build-passages.mjs — לא לערוך ביד. concept/chapter11/verify-chapter11.mjs מוודא שכל קטע במקור, שהקטעים של כל § מרכיבים אותו בשלמותו, שכל הדגשה ותעתיק הם תת-מחרוזת של המשפט שלהם, ושהפריסה צורכת כל קטע בדיוק פעם אחת ובסדר המקור (המקור 1 ל-1 — הוראת המשתמשת).',
  number: 11, title: 'מקורות ואסכולות ההלכה', menuTitle: 'פרק 11 · מקורות ואסכולות ההלכה', passages: out,
}
await writeFile(new URL('../../web/src/lib/chapter11/passages.json', here), JSON.stringify(data, null, 2) + '\n')
console.log(Object.values(out).reduce((n, v) => n + v.length, 0), 'fragments')

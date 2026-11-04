/* בונה את web/src/lib/chapter15/passages.json מ-SOURCE-TEXT.md — לא לערוך את ה-JSON ביד.

   הפרק הוא טבלה, ולכן הקובץ אינו רשימת משפטים אלא שלושה חלקים:
     · head    — שורת הכותרות של הטבלה (§0): שנה · אירוע · גאוגרפיה ומקום השפעה
     · rows    — §1–§23, לכל אחד שנה ואירוע
     · regions — ששת התאים הממוזגים של עמודת הגאוגרפיה, כל אחד עם השורות שהוא מכסה
   ועוד כותרת הפרק, מפוצלת לשם ולטווח שבסוגריים (שניהם מילות המקור).

   ריצה: node concept/chapter15/build-passages.mjs */
import { readFile, writeFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const md = await readFile(new URL('SOURCE-TEXT.md', here), 'utf8')
const body = md.slice(md.indexOf('## פרק חמישה עשר'), md.indexOf('## הערות עריכה'))

const titleLine = body.match(/^## פרק חמישה עשר: (.+) (\(.+\))$/m)
if (!titleLine) throw new Error('chapter 15: no chapter title line')

/* תאי הגאוגרפיה — מזהה עורכי לכל תא, לפי הסדר. הטקסט עצמו נקרא מהמקור. */
const REGION_IDS = ['arabia', 'arabia-levant', 'arabia-iraq', 'syria', 'iraq', 'levant-crescent']

const head = {}
const rows = {}
const regions = []
let region = null
for (const block of body.split(/\n(?=## |### )/)) {
  const h = block.match(/^## (.+)$/m)
  if (h && !h[1].startsWith('פרק ')) {
    region = { id: REGION_IDS[regions.length], text: h[1].trim(), rows: [] }
    regions.push(region)
    continue
  }
  const s = block.match(/^### (§\d+)\n([\s\S]*)$/)
  if (!s) continue
  const lines = s[2].trim().split('\n').map((l) => l.trim())
  if (s[1] === '§0') {
    const [year, event, place] = lines
    Object.assign(head, { year, event, region: place })
    continue
  }
  const [year, text] = lines
  rows[s[1]] = { year, text }
  region.rows.push(s[1])
}
if (regions.length !== REGION_IDS.length) throw new Error(`chapter 15: ${regions.length} region cells, expected ${REGION_IDS.length}`)

const out = {
  $note:
    'כל מילה בפרק 15 חיה כאן, פעם אחת. נבנה מ-concept/chapter15/SOURCE-TEXT.md על ידי build-passages.mjs — לא לערוך ביד. ' +
    'הפרק הוא טבלה: head (שורת הכותרות, §0), rows (§1–§23: שנה ואירוע) ו-regions (ששת התאים הממוזגים של עמודת הגאוגרפיה). ' +
    'concept/chapter15/verify-chapter15.mjs מוודא שהכול זהה למקור ושכל פריט מודפס בדיוק פעם אחת.',
  number: 15,
  title: titleLine[1],
  range: titleLine[2],
  menuTitle: 'פרק 15 · ציר הזמן בראשית האסלאם',
  head,
  rows,
  regions,
}
const target = new URL('../../web/src/lib/chapter15/passages.json', here)
await writeFile(target, JSON.stringify(out, null, 2) + '\n')
console.log(`✓ passages.json — ${Object.keys(rows).length} שורות, ${regions.length} תאי גאוגרפיה`)

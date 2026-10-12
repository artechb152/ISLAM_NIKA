/* What the NARRATOR reads (not what the subtitle shows): each subtitle line, with every
   transliterated Arabic name swapped for its Arabic spelling so the voice says it right
   (the user, 12.10.2026). Subtitles stay the source's words — this file never feeds them.
   Output: assets/vo/spoken.json [{line, subtitle, spoken}] */
import { readFile, writeFile } from 'node:fs/promises'
const web = new URL('../../web/', import.meta.url), here = new URL('.', import.meta.url)
const cues = JSON.parse(await readFile(new URL('src/lib/chapter9/karbala-cues.json', web), 'utf8'))
/* longest first, so „ח'ליף" is not eaten by a shorter key */
const AR = [
  ["כרבלאא'", 'كربلاء'], ["ח'ליף", 'خليفة'], ['מעאויה', 'معاوية'], ['חוסיין', 'حسين'],
  ['מחוסיין', 'من حسين'], ['בחוסיין', 'بحسين'], ['אומיה', 'أمية'], ['יזיד', 'يزيد'], ['חסן', 'حسن'],
].sort((a, b) => b[0].length - a[0].length)
const out = cues.map((c, i) => {
  let s = c[2]
  for (const [he, ar] of AR) s = s.split(he).join(' ' + ar + ' ')
  return { line: i + 1, subtitle: c[2], spoken: s.replace(/\s+/g, ' ').replace(/ ([,.])/g, '$1').trim() }
})
await writeFile(new URL('assets/vo/spoken.json', here), JSON.stringify(out, null, 1))
for (const o of out) console.log(o.line, o.spoken)

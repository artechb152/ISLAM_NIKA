/* אילו חפיפות מאושרות, ולמה.
 *
 * ביקורת החפיפות (DevAudit ב-Game.tsx) מודדת Box3 בקואורדינטות עולם. תיבה
 * ישרת-צירים היא מדד גס: היא עוטפת גם את החלל שמתחת לחופת סוכך, וגם גוש
 * סלע באורך 22 מטר. בלי סיווג, הדוח מונה 134 „חפיפות“ שרובן אינן תקלה —
 * וגיליון שמלא ברעש הוא גיליון שאיש אינו קורא.
 *
 * שלוש קטגוריות:
 *   intentional — הסצנה נבנתה כך בכוונה. אדם עומד תחת סוכך, אבנים
 *                 שנשענות זו על זו, כד שנשען על קיר.
 *   negligible  — נגיעה, לא חדירה. פחות מ-12 ס״מ עומק או פחות מ-5%
 *                 מנפח הקטן שבשניים.
 *   defect      — כל השאר. זה מה שצריך לתקן, וזה מה שהביקורת סופרת.
 *
 * הכלל: כל דבר כאן חייב לשאת סיבה. „מאושר כי הוא מציק“ אינו סיבה.
 */

/** דגמים שהם חופה: התיבה שלהם עוטפת את החלל שתחתם, וזה כל תפקידם. */
export const CANOPY = /awning|pergola|blacktent|tent/

/** צמחייה. תיבת דקל היא ריבוע סביב מניפת העלים — כל מה שעומד תחתיו
    „חופף“ לו, וזה בדיוק מה שצל של דקל אמור לעשות. שיח מתפרש דומה. */
export const FOLIAGE = /palm|shrub|desert-bush|bush/

/** תפאורה גדולה. אשכול סלעים נבנה מתוך חפיפה — זה מה שהופך אותו לאשכול. */
export const SCENERY = /boulder|basalt|rocks|cliff|butte|ridge|terraces|mudtower|ruinwall/

/** קירות יבשים ומבנים: חפצים נשענים עליהם, וזה נכון ומכוון. */
export const WALL = /drywall|wall|bayt|house|gate|wayhouse|monastery-hero|sanctuary-hero|kaaba/

/** חפצים קטנים שמונחים על משטח או בתוך כלי אחר, בכוונה. */
export const NESTED = /basket|jars|claypot|amphora|bigjar|sackpile|fodder|firewood|waterskin|crate/

/** ספי „זניח“ — מתחת להם זו נגיעה ולא חדירה. */
export const NEGLIGIBLE_DEPTH = 0.12
export const NEGLIGIBLE_FRAC = 0.05

/** זוגות מפורשים שאושרו אחד-אחד, עם הסיבה. */
export const PAIR_ALLOW: { a: RegExp; b: RegExp; why: string }[] = [
  { a: /firepit|campfire/, b: CANOPY, why: 'מדורה תחת סוכך המחנה — זו הצורה של מחנה לילה' },
  { a: /firepit/, b: /torch|firewood/, why: 'אשכול האש: לפיד וערמת עצים ניצבים אל המדורה' },
  { a: /firepit|torch/, b: SCENERY, why: 'מדורה מוקפת אבנים — כך מסיקים במדבר' },
  { a: /firepit|torch/, b: /^cast:/, why: 'מי שמתחמם עומד אל האש; זו נקודת ההתכנסות של המחנה' },
  { a: /^cast:/, b: /waymark|sackpile|crate|firewood|basket/, why: 'אדם עומד אל מטענו — נגיעה שנראית נכון' },
  /* אבן דרך ניצבת אל הסלע שהיא מסמנת — זה תפקידה, ולכן היא נוגעת בו.
     גוש הבזלת הוא 22 מטר רוחב, ולכן תיבתו בולעת כל אבן דרך בסביבה. */
  { a: /waymark|ansab/, b: SCENERY, why: 'אבן דרך ניצבת אל הסלע שהיא מסמנת' },
  { a: /waymark/, b: WALL, why: 'אבן דרך בפתח המעבר, צמודה למבנה השער' },
  /* כתובת נחקקת על סלע. אם היא לא נוגעת בו — היא לא כתובה עליו. */
  { a: /find-inscription|inscription/, b: SCENERY, why: 'כתובת חקוקה בסלע' },
  { a: /firepit|torch/, b: WALL, why: 'אח אל קיר החצר' },
  { a: /^cast:/, b: /camel|cart/, why: 'עומד אל גמלו' },
  { a: /camel|cart/, b: NESTED, why: 'גמל עומד אל מטענו — כך נראית שיירה שנטענת' },
  { a: /camel|cart/, b: SCENERY, why: 'גמל רובץ בין הסלעים — תיבת הגוש רחבה, הסלע לא' },
  { a: /camel|cart/, b: WALL, why: 'גמל קשור אל קיר החצר' },
  { a: /well/, b: /trough/, why: 'שוקת ניצבת אל הבאר; זה תפקידה' },
  { a: /trough/, b: WALL, why: 'שוקת צמודה לקיר החצר' },
  { a: /torch/, b: WALL, why: 'לפיד מוצמד לקיר, כפי שלפיד מוצמד' },
  { a: /trough|well/, b: /^cast:/, why: 'מי שממלא מן הבאר עומד עליה' },
  { a: /stone-bench/, b: WALL, why: 'ספסל אבן נשען אל קיר החצר' },
  { a: /toll-scale/, b: /crate|sackpile/, why: 'מאזני המכס עומדים בין המטענים שהם שוקלים' },
]

/** האם השניים מותרים יחד, ומדוע. `null` = לא מאושר. */
export function allowedBecause(a: string, b: string, depth: number, frac: number): string | null {
  if (depth < NEGLIGIBLE_DEPTH || frac < NEGLIGIBLE_FRAC) return 'נגיעה, לא חדירה'
  /* חופה: כל מה שנמצא תחתיה מותר. זה מה שסוכך עושה. */
  if (CANOPY.test(a) || CANOPY.test(b)) return 'עומד תחת חופה'
  /* צמחייה: אותו דבר, רק שהחופה עשויה עלים. */
  if (FOLIAGE.test(a) || FOLIAGE.test(b)) return 'עומד תחת צמחייה'
  /* תפאורה מול תפאורה: אשכול. */
  if (SCENERY.test(a) && SCENERY.test(b)) return 'אשכול תפאורה'
  /* מבנה מול מבנה: שער בתוך חומה, קטע קיר שנפגש בקטע קיר. */
  if (WALL.test(a) && WALL.test(b)) return 'מבנה נפגש במבנה'
  /* מבנה שנבנה אל תוך סלע או צוק — כך נבנו הכפרים האלה. */
  if ((WALL.test(a) && SCENERY.test(b)) || (WALL.test(b) && SCENERY.test(a))) return 'מבנה נשען על סלע'
  /* חפץ קטן שנשען על קיר או על תפאורה. */
  if ((NESTED.test(a) && (WALL.test(b) || SCENERY.test(b))) ||
      (NESTED.test(b) && (WALL.test(a) || SCENERY.test(a)))) return 'חפץ נשען על מבנה'
  if (NESTED.test(a) && NESTED.test(b)) return 'כלים מונחים זה על זה'
  /* תיבת האח כוללת את טבעת החריכה על הקרקע, ולכן גמל שעומד שלושה
     מטרים מן המדורה עדיין „חופף“ לה. מותר — אבל רק במגע קל. גמל
     שבאמת עומד באש חוצה את הסף ויידווח, כפי שקרה בדרך ההעמסה. */
  const shallow = frac < 0.15
  if (/camel|cart/.test(a) !== /camel|cart/.test(b) && /firepit|torch/.test(a + b)) {
    return shallow ? 'עומד סביב האש, לא בתוכה' : null
  }
  /* אדם מול קיר, מול מבנה או מול סלע.
     שני הכללים שהיו כאן היו גורפים, וזה מה שהסתיר את מה שהמשתמשת
     ראתה בעין: ניצבים תקועים בתוך הקיר ברמות תימן, מאושרים בדוח.
     תיבת קיר יבש היא באמת קופסה ארוכה ומגע קל בה הוא ארטיפקט מדידה —
     אבל חצי דמות בתוך אבן אינו ארטיפקט, וההבדל בין השניים הוא סף.
     המרווח החזותי עצמו נאכף בנתונים: scratchpad/space-people.mjs
     מרחיק כל דמות 0.45 מ' מכל מכשול, ולכן מה שנשאר כאן הוא באמת
     נגיעה בתיבה בלבד. */
  {
    const aCast = /^cast:/.test(a)
    const bCast = /^cast:/.test(b)
    if (aCast !== bCast) {
      const other = aCast ? b : a
      if (WALL.test(other) || SCENERY.test(other)) {
        return frac < 0.14 ? 'עומד אל פני קיר או סלע — נגיעה בתיבה, לא באבן' : null
      }
    }
  }
  /* אדם ליד הכלים שלו. נופל הלאה אל PAIR_ALLOW ולא פוסל, כדי שכלל
     מפורש יותר למטה עדיין יוכל לאשר. */
  if ((/^cast:/.test(a) && NESTED.test(b)) || (/^cast:/.test(b) && NESTED.test(a))) {
    if (shallow) return 'עומד אל כליו'
  }
  for (const p of PAIR_ALLOW) {
    if ((p.a.test(a) && p.b.test(b)) || (p.a.test(b) && p.b.test(a))) return p.why
  }
  return null
}

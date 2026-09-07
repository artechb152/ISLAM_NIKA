/* אילו חפיפות מאושרות, למה, ועד כמה.
 *
 * הגרסה הקודמת אישרה לפי קטגוריה: „גמל ליד קיר", „חפץ קטן ליד מבנה",
 * „כל דבר תחת צמחייה". קטגוריה רחבה מאשרת גם את המקרה הסביר וגם את
 * הבאג — ובפועל היא אישרה גמל ששלושה רבעים ממנו בתוך בית, ושני גמלים
 * שחופפים זה לזה ב-34%. „0 חפיפות לא מאושרות" נשען עליה, ולכן לא אמר
 * הרבה.
 *
 * לכל כלל כאן יש עכשיו תקרה. מעליה זו תקלה, גם אם הזוג מוכר. התקרה
 * נבחרה מן המקרה שנבדק בעין — הצילום רשום ליד הכלל — ולא מן המספר
 * שהיה במקרה בדוח.
 *
 * שלוש קטגוריות, כמו קודם:
 *   intentional — הסצנה נבנתה כך. יש כלל, יש תקרה, יש סיבה.
 *   negligible  — נגיעה ולא חדירה: פחות מ-12 ס״מ או פחות מ-5%.
 *   defect      — כל השאר. זה מה שנספר.
 */

/** דגמים שהם חופה: תיבתם עוטפת את החלל שתחתם, וזה כל תפקידם. */
export const CANOPY = /awning|pergola|blacktent|tent/
/** צמחייה. תיבת דקל היא ריבוע סביב מניפת העלים. */
export const FOLIAGE = /palm|shrub|desert-bush|bush/
/** תפאורה גדולה. אשכול סלעים נבנה מתוך חפיפה. */
export const SCENERY = /boulder|basalt|rocks|cliff|butte|ridge|terraces|mudtower|ruinwall/
/** קירות ומבנים. */
export const WALL = /drywall|wall|bayt|house|gate|wayhouse|monastery-hero|sanctuary-hero|kaaba/
/** חפצים קטנים שמונחים על משטח או בתוך כלי אחר. */
export const NESTED = /basket|jars|claypot|amphora|bigjar|sackpile|fodder|firewood|waterskin|crate/

export const NEGLIGIBLE_DEPTH = 0.12
export const NEGLIGIBLE_FRAC = 0.05

export interface PairRule {
  a: RegExp
  b: RegExp
  /** מעל זה — תקלה, גם אם הזוג מוכר */
  maxFrac: number
  why: string
  /** הצילום שעל פיו נבחרה התקרה */
  shot?: string
}

/* ── מה שאסור, במפורש ────────────────────────────────────────────────────
   שני אלה אושרו קודם על ידי כללים רחבים, והם בדיוק מה שדווח בעין.
   אין להם כלל, ולכן הם נופלים כתקלה תמיד. */
const NEVER: { a: RegExp; b: RegExp; what: string }[] = [
  { a: /camel|cart/, b: /camel|cart/, what: 'גמל בתוך גמל' },
  { a: /camel|cart/, b: WALL, what: 'גמל בתוך מבנה' },
]

export const PAIR_ALLOW: PairRule[] = [
  /* אש */
  /* מדורה תחת סוכך היא צורה נכונה של מחנה לילה — אבל להבה שעוברת
     דרך הבד אינה. 0.9 אישר גם את זה: נראה בתחנת הגבול, האש בוקעת
     מבעד לאריג (scratchpad/shots/inspect/bp-gate-0.png). */
  { a: /firepit|campfire|torch/, b: CANOPY, maxFrac: 0.35,
    why: 'מדורה תחת סוכך המחנה — זו הצורה של מחנה לילה',
    shot: 'scratchpad/shots/inspect/bp-gate-0.png' },
  { a: /firepit/, b: /torch|firewood/, maxFrac: 0.3, why: 'אשכול האש: לפיד וערמת עצים ניצבים אל המדורה' },
  { a: /firepit|torch/, b: SCENERY, maxFrac: 0.35, why: 'מדורה מוקפת אבנים — כך מסיקים במדבר',
    shot: 'scratchpad/shots/final/night-camp.png' },
  { a: /firepit|torch/, b: WALL, maxFrac: 0.25, why: 'אח אל קיר החצר' },
  { a: /firepit|torch/, b: /^cast:/, maxFrac: 0.2, why: 'מי שמתחמם עומד אל האש' },
  /* אבני דרך וכתובות */
  { a: /waymark|ansab/, b: SCENERY, maxFrac: 0.4, why: 'אבן דרך ניצבת אל הסלע שהיא מסמנת' },
  { a: /waymark/, b: WALL, maxFrac: 0.2, why: 'אבן דרך בפתח המעבר, צמודה למבנה השער' },
  { a: /find-inscription|inscription/, b: SCENERY, maxFrac: 0.6, why: 'כתובת חקוקה בסלע' },
  /* אנשים */
  { a: /^cast:/, b: /waymark|sackpile|crate|firewood|basket/, maxFrac: 0.2, why: 'אדם עומד אל מטענו' },
  { a: /^cast:/, b: WALL, maxFrac: 0.14, why: 'עומד אל פני קיר — תיבת הקיר ארוכה, האבן לא',
    shot: 'scratchpad/shots/yemen-heights-wall-merchant.png' },
  { a: /^cast:/, b: SCENERY, maxFrac: 0.14, why: 'עומד ליד סלע — אותו ארטיפקט תיבה' },
  { a: /^cast:/, b: /camel|cart/, maxFrac: 0.2, why: 'עומד אל גמלו' },
  { a: /trough|well/, b: /^cast:/, maxFrac: 0.2, why: 'מי שממלא מן הבאר עומד עליה' },
  /* גמלים — רק מול מטען, ורק במגע */
  { a: /camel|cart/, b: NESTED, maxFrac: 0.18, why: 'גמל עומד אל מטענו' },
  { a: /camel|cart/, b: SCENERY, maxFrac: 0.2, why: 'גמל רובץ בין הסלעים — תיבת הגוש רחבה, הסלע לא' },
  /* רהיטי חצר */
  { a: /well/, b: /trough/, maxFrac: 0.3, why: 'שוקת ניצבת אל הבאר; זה תפקידה' },
  { a: /trough/, b: WALL, maxFrac: 0.2, why: 'שוקת צמודה לקיר החצר' },
  { a: /torch/, b: WALL, maxFrac: 0.25, why: 'לפיד מוצמד לקיר, כפי שלפיד מוצמד' },
  { a: /stone-bench/, b: WALL, maxFrac: 0.2, why: 'ספסל אבן נשען אל קיר החצר' },
  { a: /toll-scale/, b: /crate|sackpile/, maxFrac: 0.25, why: 'מאזני המכס עומדים בין המטענים שהם שוקלים' },
]

/** קטגוריות רחבות — נשארו, אבל עם תקרה במקום „הכול מותר". */
const BROAD: PairRule[] = [
  { a: CANOPY, b: /./, maxFrac: 0.95, why: 'עומד תחת חופה' },
  { a: FOLIAGE, b: /./, maxFrac: 0.5, why: 'עומד תחת צמחייה' },
  { a: SCENERY, b: SCENERY, maxFrac: 0.8, why: 'אשכול תפאורה' },
  { a: WALL, b: WALL, maxFrac: 0.8, why: 'מבנה נפגש במבנה' },
  { a: WALL, b: SCENERY, maxFrac: 0.6, why: 'מבנה נשען על סלע' },
  { a: NESTED, b: WALL, maxFrac: 0.25, why: 'חפץ נשען על מבנה' },
  { a: NESTED, b: SCENERY, maxFrac: 0.25, why: 'חפץ נשען על סלע' },
  { a: NESTED, b: NESTED, maxFrac: 0.3, why: 'כלים מונחים זה על זה' },
]

const both = (r: PairRule, a: string, b: string) =>
  (r.a.test(a) && r.b.test(b)) || (r.a.test(b) && r.b.test(a))

/** האם השניים מותרים יחד, ומדוע. `null` = לא מאושר. */
export function allowedBecause(a: string, b: string, depth: number, frac: number): string | null {
  if (depth < NEGLIGIBLE_DEPTH || frac < NEGLIGIBLE_FRAC) return 'נגיעה, לא חדירה'
  /* האיסורים המפורשים גוברים על כל כלל אחר */
  for (const n of NEVER) if (both({ ...n, maxFrac: 0, why: '' }, a, b)) return null
  for (const r of PAIR_ALLOW) if (both(r, a, b)) return frac <= r.maxFrac ? r.why : null
  for (const r of BROAD) if (both(r, a, b)) return frac <= r.maxFrac ? r.why : null
  return null
}

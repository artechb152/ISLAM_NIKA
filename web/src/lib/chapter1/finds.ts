/* The evidence lying in the world.
 *
 * The chapter's own first lesson is that we know this period badly: §1 says the
 * information is thin, that most of it reaches us through later Muslim
 * tradition, and that it has to be taken "with limited surety". A chapter whose
 * only verb is "walk up to a person and press E" cannot teach that — it hands
 * the learner conclusions and never shows them what a conclusion is made of.
 *
 * ── ומה שהיה כאן עד 16.9.2026 ─────────────────────────────────────────────
 * עשרים עדויות, ותשע-עשרה מהן חפצים שהומצאו: מטבע דרהם סאסאני, חותם חרס
 * ביזנטי, חרסים ליד הבאר, צרור לבונה, סל לחם, אבן ניצבת. אף אחד מהם אינו
 * בחוברת — „מטבע", „חותם", „חרס", „לבונה", „כתובת" מופיעים בה אפס פעמים —
 * והם הוצגו כעובדה. שכבה שלמה של „מה שחקוק מוכיח" נבנתה על חפצים שלא
 * היו. מעבר לנאמנות זו גם בעיה לימודית מדודה: פרט מעניין שאינו נדרש
 * ללמידה (seductive detail) פוגע בה גם כשאינו מסיח — הלומד בונה מודל
 * סביב החפץ במקום סביב הטיעון.
 *
 * מה שנשאר: שישה מקורות שהחוברת עצמה מצטטת — דף מן המסורת המוסלמית,
 * ארבעה פסוקי קוראן, ודף מביוגרפיית אבן השאם. כל אחד מהם נשאל את שאלת
 * הייחוס: מי מסר, מתי, ומה זה אומר על מידת הוודאות. זה בדיוק §1, והפעם
 * הלומד עושה אותו ולא שומע עליו.
 *
 * Every `source` here points at a § in concept/chapter1/SOURCE-TEXT.md, and
 * every `body` is a close paraphrase of it. Nothing may be invented.
 */

export interface Find {
  id: string
  region: string
  /** where it lies, in scene metres */
  x: number
  z: number
  /** the GLB under /assets/chapter1/models */
  model: string
  /** world height in metres */
  h: number
  ry?: number
  /** what it is */
  title: string
  /** what it tells us — the learning, in Rawi's register */
  body: string
  /** ── שאלת הייחוס ────────────────────────────────────────────────────
      מי מסר את זה, מתי, ולכן — עד כמה אפשר לסמוך עליו. זו השיטה של §1,
      והיא נאמרת על כל מקור בנפרד במקום פעם אחת בפתיחה. */
  sourcing: string
  /** the section of the source text this rests on */
  source: string
}

export const FINDS: Find[] = [
  /* ---- מחנה הלילה — ומה בכלל יודעים, ומאיפה ---- */
  {
    id: 'find-camp-tradition',
    region: 'night-camp',
    x: -2, z: 0, model: 'prop-codex', h: 0.32, ry: 0.4,
    title: 'כתב מן המסורת המוסלמית',
    body:
      'ספר מועתק, מונח על האוכף. המידע על החיים בחצי האי ערב לפני האסלאם דל, ' +
      'ומרביתו ידוע לנו מן הספרות ומן המסורת המוסלמית.',
    sourcing:
      'מוסלמים כתבו אותו, דורות אחרי התקופה שהוא מתאר. לכן במבט ביקורתי ' +
      'יש לקחת אותו ב„עירבון מוגבל" — וזה נכון לכל מה שנשמע בדרך הזאת.',
    source: '§1',
  },

  /* ---- ית׳רב — הפסוק שמדבר על השכנות הזאת ---- */
  {
    id: 'find-yathrib-verse',
    region: 'yathrib',
    x: -3.8, z: 13.9, model: 'find-scroll', h: 0.34, ry: 0.8,
    title: 'סורה ב׳, פסוק 94',
    body:
      '„כי רק להם מכל האנשים נועדה נחלת העולם הבא אצל אללה". הערבים ידעו שליהודים ' +
      'דת משלהם, ושהם חשים בשל כך עליונות מסוימת — והפסוק מתייחס בדיוק לזה.',
    sourcing:
      'מי אומר את זה? הקוראן — כלומר הצד המוסלמי, ואחרי התקופה שאנחנו הולכים בה. ' +
      'זו עדות על מה שנאמר מאוחר יותר על השכנות הזאת, לא פרוטוקול שלה.',
    source: '§15',
  },

  /* ---- המנזר — הפסוק על הנזירים, ומה שהפרשנים תולים בו ---- */
  {
    id: 'find-monastery-verse',
    region: 'monastery',
    x: 4.95, z: -3.15, model: 'find-scroll', h: 0.3, ry: -0.8,
    title: 'סורה ה׳, פסוק 82',
    body:
      '„האומרים נוצרים אנו, אהבתם למאמינים גדולה מכל, זאת כי יש כמרים ונזירים ביניהם, ' +
      'ואין שחץ בלבם".',
    sourcing:
      'הפרשנים תולים את הפסוק ברגע מסוים: משלחת נוצרים מחבש שהגיעה למכה, ומוחמד ' +
      'הקריא להם מן הקוראן. „הפרשנים תולים" — כלומר זה הסבר שניתן לפסוק, לא הפסוק עצמו.',
    source: '§24',
  },

  /* ---- מכה — מי מספר על הֻבַּל, ומי חולק ---- */
  {
    id: 'find-mecca-hisham',
    region: 'mecca',
    x: -3.6, z: -9.8, model: 'prop-codex', h: 0.26, ry: 0.7,
    title: 'דף מביוגרפיית מוחמד',
    body:
      'אבן השאם, עורך הביוגרפיה של מוחמד, ציין כי מי שהביא את הֻבַּל למכה היה גבר תקיף ' +
      'בשם עמרו בן לחי, בן שבט ח׳זאעה.',
    sourcing:
      'מי מסר, ומתי? אבן השאם, בן המאה התשיעית לספירה — מאות שנים אחרי המעשה. וחוקרים ' +
      'גורסים אחרת: שהמסורת הזאת נועדה להרחיק את חטא האלילות משבטו של הנביא.',
    source: '§38',
  },
  {
    id: 'find-mecca-verse',
    region: 'mecca',
    x: 13.2, z: 2.4, model: 'find-scroll', h: 0.28, ry: 1.9,
    title: 'סורה ע״א, פסוק 23',
    body:
      '„הם המרו את פי ואמרו, אל תיטשו את אליליכם, אל תיטשו את וד, סואע, יגות׳, יעוק ' +
      'ולא את נשר".',
    sourcing:
      'את שמות האלילים ואת סיפוריהם אנחנו יודעים ממה שנכתב אחר כך, מזווית הראייה של ' +
      'האסלאם. המסורות החוץ־אסלאמיות דלות, ומן הזווית ההיא עבודת האלילים נראית חזון נפרץ.',
    source: '§44',
  },

  /* ---- היציאה — מה שנשאר, ומי אומר שנשאר ---- */
  {
    id: 'find-exit-quran',
    region: 'exit',
    x: 6.4, z: -7.2, model: 'find-scroll', h: 0.3, ry: -0.6,
    title: 'מה שהדהד אל תוך הקוראן',
    body:
      'רעיונות ומושגים נוצריים הופיעו בקוראן, לצד הדהודים מהדת היהודית שמקורם בתנ״ך ' +
      'ובספרות חז״ל.',
    sourcing:
      'מי אומר את זה? חוקרים — „חוקרים מצביעים". זו קריאה של הטקסט, וזו המסקנה ' +
      'שאליה מגיעה הדרך הזאת.',
    source: '§48',
  },
]

export const FINDS_TOTAL = FINDS.length

export function findsIn(region: string): Find[] {
  return FINDS.filter((f) => f.region === region)
}

/** How close you must stand before a find can be examined, in metres. */
export const FIND_RANGE = 2.6

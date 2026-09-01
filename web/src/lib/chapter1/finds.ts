/* The evidence lying in the world.
 *
 * The chapter's own first lesson is that we know this period badly: §1 says the
 * information is thin, that most of it reaches us through later Muslim
 * tradition, and that it has to be taken "with limited surety". A chapter whose
 * only verb is "walk up to a person and press E" cannot teach that — it hands
 * the learner conclusions and never shows them what a conclusion is made of.
 *
 * So the world carries evidence. Two pieces per region, lying where such a
 * thing would actually lie, each one examinable with F and each one anchored to
 * the same source text the dialogue is. They are not required to finish the
 * chapter: they are the reason to look at it.
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
  /** the section of the source text this rests on */
  source: string
}

export const FINDS: Find[] = [
  /* ---- רמות תימן — where the road starts, and where the terraces are ---- */
  {
    id: 'find-terrace-inscription',
    region: 'yemen-heights',
    x: -9.4, z: 12.6, model: 'find-inscription', h: 0.8, ry: 0.4,
    title: 'כתובת חרותה באבן',
    body:
      'אותיות חרוטות בקצה טרסה. כתובת שנחצבה באבן היא הסוג היחיד של עדות שאינו מגיע אלינו ' +
      'דרך סיפורו של מישהו אחר — והיא נדירה. רוב מה שידוע לנו על חצי האי ערב לפני האסלאם ' +
      'הגיע מהספרות והמסורת המוסלמית, שאותה יש לקחת ב״עירבון מוגבל״.',
    source: '§1',
  },
  {
    id: 'find-yemen-sherd',
    region: 'yemen-heights',
    x: 7.8, z: -6.4, model: 'find-sherd', h: 0.16, ry: 1.1,
    title: 'שברי כד',
    body:
      'חרסים בשולי שדה. מהדרום הזה נדדו השבטים צפונה, ומכאן יצאה הדרך שהמסע הזה הולך בה. ' +
      'כד שבור אינו מספר מי גר כאן — רק שמישהו גר.',
    source: '§7',
  },

  /* ---- מחנה הלילה — Rawi's own region ---- */
  {
    id: 'find-camp-sherd',
    region: 'night-camp',
    x: -10.6, z: 2.4, model: 'find-sherd', h: 0.16, ry: 2.2,
    title: 'חרסים ליד הבאר',
    body:
      'שברי חרס נטושים ליד הבאר. התקופה הזו מכונה ג׳אהליה — תקופת הבערות — וזה שם שנתנו לה ' +
      'אחר כך. מה שנשאר ממנה בידינו דל, ורובו הגיע דרך מי שבא אחריה.',
    source: '§0',
  },
  {
    id: 'find-camp-incense',
    region: 'night-camp',
    x: 6.9, z: 8.2, model: 'find-incense', h: 0.34, ry: 0.7,
    title: 'צרור לבונה',
    body:
      'שרף קשור בבד, מוכן לדרך. השבטים ששכנו כאן שימשו מתווכים בין האימפריות, בעיקר כדי ' +
      'לשמור על נתיבי הסחר — משי, תבלינים וכמו זה.',
    source: '§7',
  },

  /* ---- תחנת הגבול — the two empires meet here ---- */
  {
    id: 'find-drachm',
    region: 'border-post',
    x: -2.97, z: -3.44, model: 'find-coin', h: 0.24, ry: 0.9,
    title: 'מטבע כסף סאסאני',
    body:
      'מטבע שנטבע מצפון־מזרח לחצי האי, בממלכה הסאסאנית־פרסית ששלטה באזור איראן ועיראק. ' +
      'עיר בירתה הייתה קטסיפון, על גדת נהר החידקל. דתה של האליטה השלטונית הייתה זורואסטרית.',
    source: '§4',
  },
  {
    id: 'find-seal-byz',
    region: 'border-post',
    x: 1.66, z: 0.9, model: 'find-seal', h: 0.2, ry: -0.5,
    title: 'חותם חרס',
    body:
      'חותם שנקשר למסמך. מצפון־מערב לחצי האי ישבה האימפריה הביזנטית, זו שהחליפה את האימפריה ' +
      'הרומית העתיקה, ודתה הייתה נוצרית אורתודוקסית. שתי האימפריות האלה הן הצפון של המפה הזו.',
    source: '§3',
  },

  /* ---- המעבר הצר — tribes, protection, brokerage ---- */
  {
    id: 'find-pass-inscription',
    region: 'narrow-pass',
    x: 3.9, z: 9.2, model: 'find-inscription', h: 0.75, ry: -0.8,
    title: 'סימן שבטי על סלע',
    body:
      'סימן חרוט בצד הדרך. השבטים הנוודים בצפון חצי האי היו בני חסות של האימפריות — גסאן ' +
      'תחת הביזנטים, לח׳ם תחת הסאסאנים. מעבר בטוח בדרך הזו היה עניין של הסכם, לא של מזל.',
    source: '§8',
  },
  {
    id: 'find-pass-coin',
    region: 'narrow-pass',
    x: -4.36, z: -10.64, model: 'find-coin', h: 0.24, ry: 2.4,
    title: 'מטבע שנפל בדרך',
    body:
      'מטבע בין האבנים. השבטים נדדו צפונה מתימן ושימשו מתווכים בין האימפריות — והתיווך הזה ' +
      'הוא שהחזיק את נתיבי הסחר פתוחים.',
    source: '§7',
  },

  /* ---- הדרך וההעמסה — the cargo, and what cannot be cargo ---- */
  {
    id: 'find-road-incense',
    region: 'loading-road',
    x: -6.4, z: 4.8, model: 'find-incense', h: 0.34, ry: 1.6,
    title: 'לבונה ארוזה למשלוח',
    body:
      'צרור שרף מוכן להעמסה. משי ותבלינים עברו בדרך הזו — וגם דברים שאיש לא ארז: רעיונות ' +
      'ומושגים מונותאיסטים חלחלו לאזור החג׳אז מהיהדות ומהנצרות, בתהליך איטי ומדורג.',
    source: '§9',
  },
  {
    id: 'find-road-sherd',
    region: 'loading-road',
    x: 9.2, z: -8.6, model: 'find-sherd', h: 0.16, ry: 0.3,
    title: 'חרסים בשולי הדרך',
    body:
      'שברי כד שנשמט מגמל. החג׳אז היה אזור חבוי יחסית, והאימפריות לא גילו בו עניין רב — ' +
      'ובכל זאת מה שעבר בדרכים שלו הותיר בו רושם.',
    source: '§9',
  },

  /* ---- ית׳רב — the Jewish settlements ---- */
  {
    id: 'find-scroll-case',
    region: 'yathrib',
    x: -3.8, z: 13.9, model: 'find-scroll', h: 0.34, ry: 0.8,
    title: 'נרתיק לספר',
    body:
      'נרתיק עור לגליל כתוב. בדרום חצי האי יש עדויות על התיישבות יהודים מאז המאה החמישית ' +
      'לספירה. כאן, בית׳רב, הם חיו בשלום עם שכניהם הערבים — יחסי מסחר, ואפילו נושאי תרבות ' +
      'משותפים כמו שירה — אך כל שבט חי עם החוקים והמנהגים שלו.',
    source: '§13',
  },
  {
    id: 'find-yathrib-sherd',
    region: 'yathrib',
    x: 12.6, z: -14.2, model: 'find-sherd', h: 0.16, ry: 2.9,
    title: 'חרסים בשוק',
    body:
      'שברים בקרקע השוק. השוק היה משותף. החוק לא היה. שני הדברים האלה התקיימו זה לצד זה ' +
      'לאורך דורות.',
    source: '§13',
  },

  /* ---- המנזר — Christianity, and what it did and did not do ---- */
  /* שלוש תחנות התצפית של משימת המנזר: לא כתבי-יד על העבר אלא דברים
     שקורים עכשיו, מול העיניים — כי §20 קובע שמה שעבר למכה הוא מה
     שראו. משימת task-monk נעולה עד ששלושתן נראו. */
  {
    id: 'find-monk-bread',
    region: 'monastery',
    x: 1.2, z: 19.6, model: 'basket', h: 0.42, ry: 0.3,
    title: 'סל לחם ליד השער',
    body:
      'מונח כך שכל עובר אורח ייקח, בלי לבקש ובלי להודות. צניעות, פרישות, ' +
      'דאגה לנזקק וליתום — את זה רואים בעיניים. ומה שרואים, אדם לוקח איתו ' +
      'בלי שילמדו אותו.',
    source: '§21',
  },
  {
    id: 'find-monk-hymn',
    region: 'monastery',
    x: 5.2, z: -3.4, model: 'find-scroll', h: 0.3, ry: -0.8,
    title: 'שיר כתוב בתא',
    body:
      'דף ועליו שורות שיר, כתובות לאט, בשקט של תא אבן. להתבודד, לכתוב שיר — ' +
      'הרגלים שנוסע רואה דרך פתח הדלת ולוקח איתו הלאה.',
    source: '§22',
  },
  {
    id: 'find-monk-routine',
    region: 'monastery',
    x: -7.2, z: -4.6, model: 'claypot', h: 0.4, ry: 1.1,
    title: 'פינת המנהג הקבוע',
    body:
      'אותה פינה, אותה שעה, אותו מנהג פולחני — היום זה קרה כאן פעמיים, ' +
      'בדיוק באותו סדר. קביעות כזאת אפשר לחקות גם בלי להבין את טעמה.',
    source: '§22',
  },

  {
    id: 'find-monastery-inscription',
    region: 'monastery',
    x: -4.4, z: -8.2, model: 'find-inscription', h: 0.78, ry: 0.5,
    title: 'כתובת על אבן המנזר',
    body:
      'אותיות שאינן ערביות. הנצרות הגיעה לכאן מאקסום שמעבר לים ומבין אלראפדין — ארם נהריים. ' +
      'הביזנטים השפיעו על תושבי חצי האי — מילים רבות בערבית מקורן לטיני ויווני, כגון ״מבצר״ ' +
      'קצר, ״מגדל״ ברג׳, ועט כתיבה קלם — אך את דתם הם לא הצליחו להשליט שם.',
    source: '§47',
  },
  {
    id: 'find-monastery-seal',
    region: 'monastery',
    x: 6.41, z: 2.64, model: 'find-seal', h: 0.2, ry: -1.2,
    title: 'חותם של מנזר',
    body:
      'חותם חרס קטן. תושבי מכה הושפעו מאורחות חייהם של הנזירים: צניעות, חסידות, דאגה ' +
      'לנזקקים — וגם התבודדות, כתיבת שירה ומנהגים פולחניים.',
    source: '§21',
  },

  /* ---- מכה — the pantheon, and the argument about it ---- */
  {
    id: 'find-ansab',
    region: 'mecca',
    x: -11.4, z: -12.8, model: 'ansab', h: 1.5, ry: 0.4,
    title: 'אבן ניצבת',
    body:
      'אבן בלתי מסותתת שהוצבה על כן. עבודת האלילים הייתה חזון נפרץ בחצי האי — אך המסורות ' +
      'החוץ־אסלאמיות דלות, ומה שאנחנו יודעים משתקף בעיקר מזווית הראייה של האסלאם עצמו.',
    source: '§33',
  },
  {
    id: 'find-mecca-coin',
    region: 'mecca',
    x: 13.2, z: 2.4, model: 'find-coin', h: 0.24, ry: 1.9,
    title: 'מטבע בכיכר',
    body:
      'מטבע שנפל בין הרגליים. אל מכה עלו לרגל, והקיפו את הכעבה — טקס שהיה שם הרבה לפני ' +
      'האסלאם. האבן השחורה, אלחג׳ר אלאסוד, הטבועה בפינת הכעבה, הייתה קדושה ונערצת שנים ' +
      'רבות לפני עלות האסלאם על בימת ההיסטוריה.',
    source: '§34',
  },

  /* ---- היציאה — the closing look back ---- */
  {
    id: 'find-exit-inscription',
    region: 'exit',
    x: 6.4, z: -7.2, model: 'find-inscription', h: 0.76, ry: -0.6,
    title: 'אבן על המשקיף',
    body:
      'אבן חרוטה בקצה הדרך. חצי האי ערב לא היווה איום על אף אחת מהאימפריות, ולא הייתה בו ' +
      'שאיפת כיבוש. הן לא הצליחו להשליט שם את דתן — אבל הרעיונות שלהן כן חלחלו, ' +
      'והדהודיהם נשמעים בקוראן.',
    source: '§45',
  },
]

export const FINDS_TOTAL = FINDS.length

export function findsIn(region: string): Find[] {
  return FINDS.filter((f) => f.region === region)
}

/** How close you must stand before a find can be examined, in metres. */
export const FIND_RANGE = 2.6

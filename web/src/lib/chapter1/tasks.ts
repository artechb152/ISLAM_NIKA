/* One thing to do in each region, besides listen.
 *
 * Talking to five people across nine regions is a lecture with a walk attached.
 * What makes a region stick is being asked to *use* what you were just told,
 * once, about the one thing that region exists to teach: whose empire this
 * frontier belongs to, what a caravan can and cannot carry, which of the three
 * stones is which.
 *
 * The rule the chapter set for dialogue — no wrong answers, choices only decide
 * order — does not fit here, and should not: a task you cannot get wrong is not
 * a task. But nothing fails either. Pick the wrong crate and Rawi tells you why
 * it is the wrong crate, and you pick again. The cost of being wrong is that
 * somebody explains something to you, which is the whole point.
 *
 * Every line rests on a § in concept/chapter1/SOURCE-TEXT.md.
 */

export interface TaskOption {
  id: string
  label: string
  /** true for the answer the source text supports */
  right?: boolean
  /** what Rawi says when you choose this — right or wrong, it teaches */
  note: string
}

export interface Task {
  id: string
  region: string
  /** where the station stands, in scene metres */
  x: number
  z: number
  model: string
  h: number
  ry?: number
  /** the prompt above the station */
  prompt: string
  title: string
  /** what you are being asked, in the voice of whoever asks it */
  asker: string
  question: string
  options: TaskOption[]
  /** Rawi's closing line once it is solved */
  done: string
  source: string
}

export const TASKS: Task[] = [
  {
    id: 'task-toll',
    region: 'border-post',
    x: 0.4, z: -3.4, model: 'toll-scale', h: 1.65, ry: -0.4,
    prompt: 'שלמו את המכס',
    title: 'המכס בגבול',
    asker: 'שליח האימפריה',
    question:
      'הגעת מדרום. הדרך הזו נכנסת לתחום שאני גובה בו. איזה מטבע מתקבל כאן — ' +
      'ומה זה אומר לך על מי יושב מצפון־מזרח?',
    options: [
      {
        id: 'sasanian',
        label: 'מטבע כסף סאסאני',
        right: true,
        note:
          'נכון. מצפון־מזרח לחצי האי יושבת האימפריה הסאסאנית־פרסית, ששולטת באזור איראן ' +
          'ועיראק, ובירתה קטסיפון על גדת החידקל. מי שגובה כאן — גובה בשמה.',
      },
      {
        id: 'byzantine',
        label: 'מטבע ביזנטי',
        note:
          'ביזנטיון יושבת מצפון־מערב, לא מצפון־מזרח. היא זו שהחליפה את האימפריה הרומית ' +
          'העתיקה, ודתה נוצרית אורתודוקסית — אבל לא כאן.',
      },
      {
        id: 'barter',
        label: 'בלי מטבע — חליפין בסחורה',
        note:
          'בשוק, אולי. בגבול של אימפריה — לא. הגבול הזה קיים כדי לסמן של מי הדרך.',
      },
    ],
    done: 'רשמתי: מצפון לחצי האי שתי אימפריות, וזו שמצפון־מזרח היא הסאסאנית.',
    source: '§4',
  },

  {
    id: 'task-protection',
    region: 'narrow-pass',
    x: -1.4, z: 2.4, model: 'waymark', h: 2.3, ry: 0.6,
    prompt: 'בקשו מעבר',
    title: 'מי מבטיח את המעבר',
    asker: 'ראש השבט',
    question:
      'המעבר הזה שלי. אני יכול להעביר אותך, אבל אני רוצה שתבין למי אני עצמי נתון. ' +
      'מה מחזיק שבט כמו שלי בדרך הזו?',
    options: [
      {
        id: 'patronage',
        label: 'חסות של אימפריה',
        right: true,
        note:
          'כך זה עובד. השבטים הנוודים בצפון היו בני חסות של האימפריות — גסאן היו בני חסות ' +
          'של הביזנטים, ולח׳ם של הסאסאנים. השבט שומר על הדרך, והאימפריה שומרת על השבט.',
      },
      {
        id: 'army',
        label: 'צבא משלו',
        note:
          'שבט נודד אינו מחזיק צבא. מה שהוא מחזיק זה דרך — ולכן הוא שווה משהו למי שרוצה ' +
          'שהדרך תישאר פתוחה.',
      },
      {
        id: 'nothing',
        label: 'אף אחד — הדרך הפקר',
        note:
          'אילו הייתה הפקר, לא היה בה סחר. משי ותבלינים עוברים רק במקום שמישהו ערב לו.',
      },
    ],
    done: 'רשמתי: השבטים נדדו צפונה מתימן ושימשו מתווכים — ובני חסות של האימפריות.',
    source: '§6',
  },

  {
    id: 'task-loading',
    region: 'loading-road',
    x: 3.92, z: -0.13, model: 'crate', h: 0.82, ry: 0.3,
    prompt: 'העמיסו את הארגז',
    title: 'מה נכנס לארגז',
    asker: 'ראווי',
    question:
      'הארגז הזה עולה על הגמל בעוד רגע. שלושה דברים כבר בפנים. תגיד לי מה עוד ' +
      'עבר בדרך הזו — ותשים לב מה לא ייכנס.',
    options: [
      {
        id: 'silk',
        label: 'משי',
        right: true,
        note: 'נכנס. משי ותבלינים הם בדיוק מה שהדרך הזו קיימת בשבילו.',
      },
      {
        id: 'spice',
        label: 'תבלינים',
        right: true,
        note: 'נכנס. עוד סחורה שהשבטים שמרו על נתיב המעבר שלה.',
      },
      {
        id: 'ideas',
        label: 'רעיונות',
        note:
          'זה לא נכנס לארגז — ובכל זאת עבר כאן. רעיונות ומושגים מונותאיסטים חלחלו לחג׳אז ' +
          'מהיהדות ומהנצרות, בתהליך איטי ומדורג. הם נסעו עם האנשים, לא עם המטען.',
      },
    ],
    done:
      'רשמתי: בדרך הזו עברו משי ותבלינים — ואיתם, לאט ובלי שאיש ארז אותם, רעיונות.',
    source: '§9',
  },

  {
    id: 'task-market',
    region: 'yathrib',
    x: 1.4, z: 6.2, model: 'stone-bench', h: 0.62, ry: 1.2,
    prompt: 'שבו אל השולחן',
    title: 'משותף ונפרד',
    asker: 'הסוחר היהודי',
    question:
      'אנחנו יושבים כאן דורות. יש דברים שאנחנו חולקים עם שכנינו הערבים ויש דברים שלא. ' +
      'מה מהם היה משותף?',
    options: [
      {
        id: 'trade',
        label: 'מסחר ושירה',
        right: true,
        note:
          'כן. התקיימו יחסי מסחר, ואף נושאי תרבות משותפים — כמו שירה. בחיי היום־יום חיינו ' +
          'בשלום עם שכנינו.',
      },
      {
        id: 'law',
        label: 'חוקים ומנהגים',
        note:
          'לא. כל שבט חי עם החוקים והמנהגים שלו. זה מה שאִפשר לשכנוּת להחזיק כל כך הרבה זמן.',
      },
      {
        id: 'faith',
        label: 'אמונה',
        note:
          'לא. ואת הציפייה שלנו למשיח השכנים הכירו — אבל היא נשארה שלנו.',
      },
    ],
    done: 'רשמתי: השוק היה משותף, החוק לא. שני הדברים יחד, לאורך דורות.',
    source: '§13',
  },

  {
    id: 'task-monk',
    region: 'monastery',
    x: -2.6, z: 3.8, model: 'altar', h: 1.5, ry: -0.5,
    prompt: 'עמדו ליד המזבח',
    title: 'מה נשאר בחוץ',
    asker: 'הנזיר',
    question:
      'אנשי מכה באים לכאן ורואים אותנו. משהו מאורחות חיינו נשאר אצלם. ' +
      'מה לדעתך עבר — ומה לא?',
    options: [
      {
        id: 'ways',
        label: 'צניעות, חסידות ודאגה לנזקקים',
        right: true,
        note:
          'כן. אורחות החיים עברו: צניעות, חסידות, דאגה לנזקקים — וגם התבודדות, כתיבת שירה ' +
          'ומנהגים פולחניים.',
      },
      {
        id: 'religion',
        label: 'הדת עצמה',
        note:
          'לא. הביזנטים, למרות השפעתם, לא הצליחו להשליט את דתם בחצי האי. מה שעבר היה ' +
          'אורח חיים, לא ממסד.',
      },
      {
        id: 'nothing2',
        label: 'שום דבר',
        note:
          'לא כך. ההשפעה הייתה אמיתית — היא פשוט לא לבשה צורה של המרה.',
      },
    ],
    done: 'רשמתי: אורחות החיים חלחלו למכה. הדת עצמה לא הושלטה שם.',
    source: '§21',
  },

  {
    id: 'task-stones',
    region: 'mecca',
    x: -1.8, z: -12.6, model: 'ansab', h: 1.6, ry: 0.2,
    prompt: 'עמדו מול האבנים',
    title: 'שלוש האבנים',
    asker: 'הסוחר',
    question:
      'שלוש אבנים כאן, ולכל אחת שם. הקוראן עצמו מזכיר אותן. מי הן?',
    options: [
      {
        id: 'three',
        label: 'אללאת, אלעזה ומנאת',
        right: true,
        note:
          'אלה הן. הקוראן מציין אותן כאלילות מפורסמות במכה, שנחשבו לבנותיו של אללה, ' +
          'ראש פנתיאון האלים.',
      },
      {
        id: 'wadd',
        label: 'ודּ, סֻוַאע ויע׳וּת',
        note:
          'שמות שמופיעים במקום אחר. האבנים שכאן, במכה, הן אללאת, אלעזה ומנאת.',
      },
      {
        id: 'nameless',
        label: 'אין להן שמות',
        note:
          'יש להן. הן היו מפורסמות דיין שהקוראן טרח לנקוב בשמן.',
      },
    ],
    done: 'רשמתי: אללאת, אלעזה ומנאת — ונחשבו לבנותיו של אללה.',
    source: '§43',
  },
]

export const TASKS_TOTAL = TASKS.length

export function taskIn(region: string): Task | null {
  return TASKS.find((t) => t.region === region) ?? null
}

/** How close you must stand to a station before you can work at it. */
export const TASK_RANGE = 3.0

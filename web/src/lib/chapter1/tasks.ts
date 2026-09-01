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
  /** the physical stand-in placed by the station: drag it onto the station
      to give this answer with your hands. Absent = this option lives only in
      the panel (keyboard and screen-reader users always have the buttons). */
  prop?: { model: string; h: number; tint?: string }
  /** true for the answer the source text supports (`choose` tasks) */
  right?: boolean
  /** which bin this item belongs in (`sort` tasks) */
  bin?: string
  /** `sort` tasks: what is said when it lands on the wrong side. The
      correction is the teaching moment, so it is written per item. */
  wrong?: string
  /** what Rawi says when you choose this — right or wrong, it teaches */
  note: string
}

/** One side of a sorting task. */
export interface TaskBin {
  id: string
  label: string
}

export interface Task {
  id: string
  region: string
  /** How this one is answered.

      `choose` — pick the option the source supports. Five of the six regions
      asked exactly this, which is one multiple-choice question wearing six
      costumes: after the first, the player knows that whatever is coming, it
      will be three buttons.

      `sort` — put several things on the right side of a line. A different act
      of thought rather than a different skin: choosing tests recall of one
      fact, sorting tests where the *boundary* runs — and two regions here are
      about exactly that. What the Jews of Yathrib shared with their Arab
      neighbours and what each kept to itself (§13, §14), and what of monastic
      life crossed the desert to Mecca while the doctrine stayed behind
      (§20–§23). In both, the mechanic is the lesson. */
  kind?: 'choose' | 'sort' | 'plan'
  /** `sort` only: the two sides. */
  bins?: TaskBin[]
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
        prop: { model: 'find-coin', h: 0.26, tint: '#dfe3ea' },
        right: true,
        note:
          'נכון — כפי שאמר השליח: הדרך הזאת פונה צפון־מזרח, אל קטסיפון. מי שגובה כאן — גובה בשם הסאסאנים.',
      },
      {
        id: 'byzantine',
        label: 'מטבע ביזנטי',
        prop: { model: 'find-coin', h: 0.26, tint: '#e0b34e' },
        note:
          'ביזנטיון? היא יושבת מצפון־מערב — הדרך הזאת פונה אל האימפריה השנייה. חשוב על מה שאמר השליח.',
      },
      {
        id: 'barter',
        label: 'בלי מטבע — חליפין בסחורה',
        prop: { model: 'basket', h: 0.42 },
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
    asker: 'רָאוִי',
    question:
      'הארגז הזה עולה על הגמל בעוד רגע. שלושה דברים כבר בפנים. תגיד לי מה עוד עבר בדרך הזו.',
    options: [
      {
        id: 'silk',
        label: 'משי',
        prop: { model: 'fodder', h: 0.4 },
        right: true,
        note: 'נכנס. משי ותבלינים הם בדיוק מה שהדרך הזו קיימת בשבילו.',
      },
      {
        id: 'spice',
        label: 'תבלינים',
        prop: { model: 'claypot', h: 0.36 },
        right: true,
        note: 'נכנס. עוד סחורה שהשבטים שמרו על נתיב המעבר שלה.',
      },
    ],
    done:
      'רשמתי: בדרך הזו עברו משי ותבלינים — ואיתם, לאט ובלי שאיש ארז אותם, רעיונות.',
    source: '§9',
  },

  {
    id: 'task-market',
    region: 'yathrib',
    kind: 'sort',
    x: 1.4, z: 6.2, model: 'stone-bench', h: 0.62, ry: 1.2,
    prompt: 'שבו אל השולחן',
    title: 'משותף ונפרד',
    asker: 'הסוחר היהודי',
    question:
      'אנחנו יושבים כאן דורות, קונים ומוכרים אלה מאלה. אבל לא הכול עבר בין הבתים. ' +
      'קח כל דבר — ושים אותו בצד שלו.',
    bins: [
      { id: 'shared', label: 'עבר בין הבתים' },
      { id: 'apart', label: 'נשאר בבית פנימה' },
    ],
    options: [
      {
        id: 'trade',
        label: 'מסחר יומיומי',
        bin: 'shared',
        wrong: 'זה דווקא עבר. השכן קונה ממני, אני קונה ממנו — כל בוקר מחדש.',
        note: 'כן. יחסי מסחר התקיימו, ובחיי היום־יום חיינו בשלום עם שכנינו.',
      },
      {
        id: 'poetry',
        label: 'שירה',
        bin: 'shared',
        wrong: 'לא. שירה היא בדיוק מה שכן חצה — אנחנו יושבים ושומעים את אותם שירים.',
        note: 'כן. נושאי תרבות משותפים היו, ושירה היא הבולט שבהם.',
      },
      {
        id: 'law',
        label: 'חוקים ומנהגים',
        bin: 'apart',
        wrong: 'לא. כל שבט חי עם החוקים והמנהגים שלו — גם כשהוא קונה מהשכן כל בוקר.',
        note: 'נכון. כל שבט וחוקיו. זה מה שאִפשר לשכנוּת להחזיק דורות.',
      },
      {
        id: 'faith',
        label: 'אמונה',
        bin: 'apart',
        wrong: 'לא. הם ידעו שיש לנו דת משלנו — לדעת עליה זה לא לחלוק אותה.',
        note: 'נכון. הערבים ידעו שאנחנו שונים בכך שיש לנו דת משלנו.',
      },
    ],
    done:
      'רשמתי: השוק והשירה עברו בין הבתים, החוק והאמונה לא. שני הדברים יחד, לאורך דורות — ' +
      'וזה בדיוק מה שהחזיק את השכנוּת.',
    source: '§13',
  },

  {
    id: 'task-monk',
    region: 'monastery',
    kind: 'sort',
    x: -2.6, z: 3.8, model: 'altar', h: 1.5, ry: -0.5,
    prompt: 'עמדו ליד המזבח',
    title: 'מה חצה את המדבר',
    asker: 'הנזיר',
    question:
      'אנשי מכה באים לכאן, יושבים, מסתכלים — וחוזרים. משהו הם לוקחים איתם, ומשהו נשאר. ' +
      'העבר כל דבר לצד שלו.',
    bins: [
      { id: 'crossed', label: 'הלך איתם למכה' },
      { id: 'stayed', label: 'נשאר כאן' },
    ],
    options: [
      {
        id: 'modesty',
        label: 'צניעות ופרישות',
        bin: 'crossed',
        wrong: 'זה דווקא הלך. את זה אדם לוקח בלי שילמדו אותו.',
        note: 'כן. היינו מקור השראה בענייני צניעות, חסידות ופרישות.',
      },
      {
        id: 'charity',
        label: 'דאגה לנזקקים וליתומים',
        bin: 'crossed',
        wrong: 'לא. זה מהדברים הראשונים שעברו.',
        note: 'כן. דאגה לנזקקים וליתומים — מזה הם הושפעו.',
      },
      {
        id: 'solitude',
        label: 'התבודדות וכתיבת שירה',
        bin: 'crossed',
        wrong: 'לא. גם אורחות החיים הקטנות עברו, לא רק הגדולות.',
        note: 'כן. התבודדות וכתיבת שירה — אלה עברו איתם.',
      },
      {
        id: 'ritual',
        label: 'מנהגים פולחניים',
        bin: 'crossed',
        wrong: 'לא. דווקא אלה עברו — ורוב הריטואלים שיהיו באסלאם מקורם בדתות שקדמו לו.',
        note: 'כן. ומנהגים פולחניים — רוב הריטואלים שיהיו באסלאם מקורם בדתות שקדמו לו.',
      },
      {
        id: 'doctrine',
        label: 'שורשי האמונה הנוצרית עצמה',
        bin: 'stayed',
        wrong:
          'לא. על השורשים הם יודעים ככל הנראה מעט מאוד. מה שהם ראו הוא איך אנחנו חיים — ' +
          'לא במה אנחנו מאמינים.',
        note: 'נכון. זה הדבר האחד שנשאר מאחור.',
      },
    ],
    done:
      'רשמתי: אורח החיים חצה את המדבר, הדוקטרינה לא. ארבעה דברים הלכו למכה ואחד נשאר כאן — ' +
      'וזה בדיוק ההבדל.',
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
  /* תכנון המסלול — מטרת הליבה של מחנה הלילה. לא עוד "טריגר שפותח מפה":
     השחקן בוחר על מפת החצי-אי את כיוון היציאה מתימן, טעות מקבלת נימוק
     גיאוגרפי וניסיון נוסף, ובחירה נכונה מוציאה את השיירה לדרך (beat
     camp-departure נפתח עם הפתרון). המפה עצמה מצוירת ב-TaskPanel. */
  {
    id: 'task-plan-route',
    region: 'night-camp',
    kind: 'plan' as const,
    x: 1.6, z: -5.2, model: 'find-scroll', h: 0.5, ry: -0.4,
    prompt: 'תכננו את המסלול',
    title: 'לאן יוצאים עם שחר',
    asker: 'רָאוִי',
    question:
      'המפה פרושה על החול לאור המדורה. אנחנו כאן, ברמות תימן — והשיירה ' +
      'יוצאת עם שחר. הראה לי לאן.',
    options: [
      {
        id: 'north',
        label: 'צפונה — בדרך הבשמים',
        right: true,
        note:
          'זו הדרך. לאורך ההרים במערב חצי האי — מים בכל תחנה ושווקים בדרך, ' +
          'וכל מה שמחכה לנו: תחנת הגבול, ית׳רב, ומכה.',
      },
      {
        id: 'east',
        label: 'מזרחה — לקצר דרך המדבר',
        note:
          'תסתכל מה יש שם על המפה: כלום. מדבר החול הגדול בעולם, בלי באר אחת. ' +
          'שיירה הולכת עם הדרך, לא נגדה.',
      },
      {
        id: 'south',
        label: 'דרומה — חזרה אל הנמלים',
        note:
          'משם באנו. הסחורה כבר על הגמלים — עכשיו היא צריכה לנסוע אל השווקים ' +
          'שבצפון, לא לחזור אל הים.',
      },
    ],
    done: 'המסלול סומן: צפונה בדרך הבשמים. עם שחר — יוצאים.',
    source: '§0',
  },
]

export const TASKS_TOTAL = TASKS.length

export function taskIn(region: string): Task | null {
  return TASKS.find((t) => t.region === region) ?? null
}

/** How close you must stand to a station before you can work at it. */
export const TASK_RANGE = 3.0

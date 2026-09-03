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
  /** present tasks: locked until this evidence was picked up (F) */
  needsFind?: string
  /** הצבה בעולם: יעד ההנחה של הפרופ הזה, כהיסט מהתחנה (מטרים).
      בלעדיו — היעד הוא התחנה עצמה. במכה כל חפץ פולחן מתיישב בעמדה
      משלו סביב האבנים. */
  spot?: { dx: number; dz: number }
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
  /** עמדה פיזית בעולם (היסט מהתחנה): צד המיון הוא מקום שמניחים בו
      חפץ ביד, לא כפתור. בלעדיה — המיון חי בפאנל בלבד. */
  spot?: { dx: number; dz: number }
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
  kind?: 'choose' | 'sort' | 'plan' | 'present' | 'connect' | 'observe'
  /** `sort` only: the two sides. */
  bins?: TaskBin[]
  /** observe tasks: the judging stays locked until every one of these
      sights was actually looked at (F). You judge what you saw. */
  needsFinds?: string[]
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
  /** one line on screen that says what to physically DO here */
  hint?: string
  /** Rawi's closing line once it is solved */
  done: string
  source: string
}

export const TASKS: Task[] = [
  /* רמות תימן: עוגן שפת אי-הוודאות של הפרק כולו. לא שואלים "מה כתוב
     בספרים" — מציבים את השחקן מול חתיכת אבן אמיתית ושואלים מה היא
     מסוגלת להוכיח. ההבחנה חקוק/מסופר נטבעת כאן פעם אחת, וכל
     ההסתייגויות בהמשך רק מהדהדות אותה. */
  {
    id: 'task-compare',
    region: 'yemen-heights',
    kind: 'present',
    x: -7.4, z: 11.0, model: 'find-inscription', h: 0.9, ry: 0.4,
    prompt: 'קראו את האבן',
    title: 'מה האבן מוכיחה',
    asker: 'רָאוִי',
    question:
      'המסורת מספרת על התקופה הזאת סיפורים שלמים. האבן הזאת חקוקה באמת. ' +
      'עמוד מולה ואמור לי — מה היא באמת מוכיחה?',
    options: [
      {
        id: 'material',
        label: 'שחיו כאן אנשים שבנו, עיבדו וכתבו',
        needsFind: 'find-terrace-inscription',
        right: true,
        note:
          'בדיוק. אבן לא משקרת על מה שחקוק בה: נוכחות, בנייה, שפה. ' +
          'זו עדות חומרית — הסוג שאפשר לגעת בו.',
      },
      {
        id: 'stories',
        label: 'שכל מה שמסופר על התקופה נכון',
        needsFind: 'find-terrace-inscription',
        note:
          'זה בדיוק מה שהיא לא יכולה להוכיח. המסורת נכתבה מאוחר, ובמבט ' +
          'ביקורתי יש לקחת אותה בעירבון מוגבל. האבן מעידה על עצמה — לא עליה.',
      },
      {
        id: 'nothing',
        label: 'שאי אפשר לדעת דבר על התקופה',
        needsFind: 'find-terrace-inscription',
        note:
          'ההפך. יש מה לדעת — רק צריך להבחין בין מה שחקוק למה שמסופר. ' +
          'עם ההבחנה הזאת נצא לדרך.',
      },
    ],
    done: 'רשמתי את הכלל הראשון של המסע: מה שחקוק מוכיח; מה שמסופר — נבחן בזהירות.',
    source: '§1',
  },

  {
    id: 'task-toll',
    region: 'border-post',
    kind: 'present',
    x: 0.4, z: -3.4, model: 'toll-scale', h: 1.65, ry: -0.4,
    prompt: 'הציגו מה שמצאתם',
    title: 'מה מספרות הראיות',
    asker: 'שליח האימפריה',
    /* לא עוד חידון אחרי הסבר: השחקן מציג לשליח את מה שאסף מהקרקע,
       והמסקנה — לאן הדרך פונה — נבנית מהראיה עצמה. אופציה נעולה עד
       שהעדות המתאימה נאספה (F), כי אי אפשר להציג מה שאין ביד. */
    hint: 'קחו ביד את הראיה שאספתם וגררו אותה אל כף המאזניים',
    question:
      'אספתם דברים מהדרך — ראיתי. הניחו אותם על המאזניים, אחד־אחד, ' +
      'ונקרא יחד לאן הדרך הזאת פונה.',
    options: [
      {
        id: 'show-drachm',
        label: 'להניח את מטבע הכסף',
        needsFind: 'find-drachm',
        /* מסירה ביד: הראיה שנאספה שוכבת ליד המאזניים וגוררים אותה עליהם.
           עד שלא נמצאה — אין חפץ בעולם, כי אי אפשר למסור מה שאין ביד. */
        prop: { model: 'find-coin', h: 0.3 },
        spot: { dx: 0.1, dz: 0.35 },
        right: true,
        note:
          'דרהם כסף — ההטבעה של קטסיפון. הדרך שאתם עומדים עליה משלמת במטבע ' +
          'הזה: היא פונה צפון־מזרח, אל הספרה הסאסאנית. זה מה שרציתי שתראו.',
      },
      {
        id: 'show-seal',
        label: 'להניח את חותם החרס',
        needsFind: 'find-seal-byz',
        prop: { model: 'find-seal', h: 0.28 },
        spot: { dx: -0.25, dz: 0.3 },
        note:
          'חותם ביזנטי — הצד השני של הסיפור. מצפון־מערב יושבת האימפריה ' +
          'הנוצרית, וסחורה שנושאת חותם כזה באה מנתיביה. אבל הדרך הזאת — ' +
          'לא לשם היא פונה. הניחו את המטבע ותראו.',
      },
    ],
    done: 'המאזניים הכריעו: מצפון לחצי האי שתי אימפריות, והדרך הזאת פונה אל הסאסאנית.',
    source: '§4',
  },

  {
    id: 'task-protection',
    region: 'narrow-pass',
    /* route: קודם מסיירים — הסימן השבטי על הסלע והמטבע שנפל בדרך הם
       שתי העדויות שצריך לראות לפני שמדברים — ואז בוחרים איך עוברים.
       טעות מקבלת נימוק וניסיון נוסף; אין game-over. */
    kind: 'present',
    x: -1.4, z: 2.4, model: 'waymark', h: 2.3, ry: 0.6,
    prompt: 'בקשו מעבר',
    title: 'איך עוברים את המעבר',
    asker: 'ראש השבט',
    question:
      'הסתכלת בדרך לפה? הסימן על הסלע — שלנו. המטבע שנפל — של מי ששילם. ' +
      'עכשיו אמור: איך שיירה כמו שלך עוברת מעבר כמו שלי?',
    options: [
      {
        id: 'patronage',
        label: 'בחסותך — תמורת מכס, כמו כולם',
        needsFind: 'find-pass-inscription',
        right: true,
        note:
          'כך זה עובד. השבטים הנוודים בצפון היו בני חסות של האימפריות — גסאן היו בני חסות ' +
          'של הביזנטים, ולח׳ם של הסאסאנים. השבט שומר על הדרך, והאימפריה שומרת על השבט.',
      },
      {
        id: 'force',
        label: 'בכוח — נשכור לוחמים',
        needsFind: 'find-pass-coin',
        note:
          'ותאבד את השיירה. שבט נודד אינו מחזיק צבא — הוא מחזיק דרך, ומאחוריו ' +
          'עומדת אימפריה שנתנה לו חסות. נגד זה לא שוכרים לוחמים.',
      },
      {
        id: 'sneak',
        label: 'בלילה — נתגנב מסביב',
        needsFind: 'find-pass-inscription',
        note:
          'ראית את הסימן על הסלע? הוא אומר שנדע. והדרך חיה ממסחר גלוי — ' +
          'מי שמתגנב מוותר בדיוק על מה שהשיירה קיימת בשבילו.',
      },
    ],
    done:
      'רשמתי: עוברים בחסות. השבטים נדדו צפונה מתימן ושימשו מתווכים — ' +
      'בני חסות של האימפריות, והמכס הוא מחיר הדרך הבטוחה.',
    source: '§6',
  },

  {
    id: 'task-loading',
    region: 'loading-road',
    x: 3.92, z: -0.13, model: 'crate', h: 0.82, ry: 0.3,
    prompt: 'העמיסו את הארגז',
    title: 'מה נכנס לארגז',
    asker: 'רָאוִי',
    hint: 'גררו את בד המשי ואת שק התבלינים אל תוך הארגז הפתוח',
    question:
      'הארגז הזה עולה על הגמל בעוד רגע. שלושה דברים כבר בפנים. תגיד לי מה עוד עבר בדרך הזו.',
    options: [
      {
        id: 'silk',
        label: 'משי',
        prop: { model: 'prop-silk', h: 0.38 },
        right: true,
        note: 'נכנס. משי ותבלינים הם בדיוק מה שהדרך הזו קיימת בשבילו.',
      },
      {
        id: 'spice',
        label: 'תבלינים',
        prop: { model: 'prop-spice', h: 0.36 },
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
    /* connect: אותה מכניקת שני-קליקים נגישה של sort, אבל התמונה אחרת —
       שני מעגלים זה בתוך זה במקום שני דליים זה לצד זה. מה שעבר בין
       הבתים יושב במעגל המשותף שעוטף את הבית; מה שנשאר פנימה יושב
       בתוכו. דו-קיום והבדלה בתמונה אחת, לא ארבע תוויות בקופסאות. */
    kind: 'connect',
    x: 1.4, z: 6.2, model: 'stone-bench', h: 0.62, ry: 1.2,
    prompt: 'שבו אל השולחן',
    title: 'מפת השכנוּת',
    asker: 'הסוחר היהודי',
    question:
      'ראית אותנו היום — את השכן שקנה, את השירה מהחצר, את בית הדין. ' +
      'עכשיו סדר את מה שראית: מה חי במעגל המשותף שבין הבתים, ומה נשאר ' +
      'בבית פנימה.',
    bins: [
      { id: 'shared', label: 'המעגל המשותף — בין הבתים' },
      { id: 'apart', label: 'בבית פנימה' },
    ],
    options: [
      {
        id: 'trade',
        label: 'התמרים שהשכן קונה כל בוקר',
        bin: 'shared',
        wrong: 'זה דווקא עבר. השכן קונה ממני, אני קונה ממנו — כל בוקר מחדש.',
        note: 'כן. יחסי מסחר התקיימו, ובחיי היום־יום חיינו בשלום עם שכנינו.',
      },
      {
        id: 'poetry',
        label: 'השירה שנשמעת משתי החצרות',
        bin: 'shared',
        wrong: 'לא. שירה היא בדיוק מה שכן חצה — בערב יושבים ושומעים את אותה שירה.',
        note: 'כן. נושאי תרבות משותפים היו, ושירה היא הבולט שבהם.',
      },
      {
        id: 'law',
        label: 'הריב שנשפט אצל כל אחד לפי מנהגו',
        bin: 'apart',
        wrong: 'לא. אם יש בינינו ריב — הוא נשפט אצלו לפי מנהגו, ואני אצלי לפי מנהגי.',
        note: 'נכון. כל שבט ודינו. זה מה שאִפשר לשכנוּת להחזיק דורות.',
      },
      {
        id: 'faith',
        label: 'הדת עצמה',
        bin: 'apart',
        wrong: 'לא. הם יודעים שיש לנו דת משלנו — לדעת עליה אינו לחלוק אותה.',
        note: 'נכון. הערבים ידעו שאנחנו שונים בכך שיש לנו דת משלנו.',
      },
      {
        id: 'messiah',
        label: 'הציפייה למשיח',
        bin: 'shared',
        wrong:
          'דווקא לא. את זה סיפרנו להם — שיתפנו אותם באמונתנו, במסורות, ' +
          'ואפילו בזה שאנחנו מחכים למשיח. לא סגרנו דלת.',
        note:
          'נכון — וזו ההפתעה: הדת נשארה בבית, אבל את הציפייה למשיח דווקא ' +
          'שיתפנו. זכור את זה כשנגיע הלאה.',
      },
    ],
    done:
      'המפה הושלמה: המסחר, השירה — ואפילו ציפיית המשיח — חיו במעגל המשותף; ' +
      'הדין והדת נשארו בבית פנימה. שתי השכבות יחד הן מה שהחזיק את ית׳רב דורות.',
    source: '§13',
  },

  {
    id: 'task-monk',
    region: 'monastery',
    /* observe: קודם רואים, אחר-כך שופטים. שלוש תחנות תצפית פזורות במנזר —
       סל הלחם בשער, השיר בתא, פינת המנהג הקבוע — והמיון נפתח רק אחרי
       שלושתן. §20 הוא הכלל: "מה שעבר זה מה שראו". */
    kind: 'observe',
    needsFinds: ['find-monk-bread', 'find-monk-hymn', 'find-monk-routine'],
    x: -2.6, z: 3.8, model: 'altar', h: 1.5, ry: -0.5,
    prompt: 'עמדו ליד המזבח',
    title: 'מה חצה את המדבר',
    asker: 'הנזיר',
    hint: 'גררו כל חפץ אל הצד שלו — מה שהלך למכה שמאלה, מה שנשאר כאן ימינה',
    question:
      'הסתובבת אצלנו, ראית: את הסל בשער, את השיר בתא, את המנהג שחוזר בשעתו. ' +
      'אנשי מכה רואים את אותם דברים — וחוזרים הביתה. עכשיו אמור אתה: ' +
      'מה מכל זה הלך איתם, ומה נשאר כאן.',
    /* שולחן ההשוואה: שתי עמדות על הקרקע משני צדי המזבח. מה שחצה את
       המדבר מונח בצד הדרומי הפונה אל מכה; מה שנשאר — לצד המנזר. */
    bins: [
      { id: 'crossed', label: 'הלך איתם למכה', spot: { dx: -2.3, dz: 1.5 } },
      { id: 'stayed', label: 'נשאר כאן', spot: { dx: 2.3, dz: 1.5 } },
    ],
    options: [
      {
        id: 'modesty',
        prop: { model: 'prop-robe', h: 0.34 },
        label: 'צניעות ופרישות',
        bin: 'crossed',
        wrong: 'זה דווקא הלך. את זה אדם לוקח בלי שילמדו אותו.',
        note: 'כן. היינו מקור השראה בענייני צניעות, חסידות ופרישות.',
      },
      {
        id: 'charity',
        prop: { model: 'basket', h: 0.34 },
        label: 'דאגה לנזקקים וליתומים',
        bin: 'crossed',
        wrong: 'לא. זה מהדברים הראשונים שעברו.',
        note: 'כן. דאגה לנזקקים וליתומים — מזה הם הושפעו.',
      },
      {
        id: 'solitude',
        prop: { model: 'prop-writing', h: 0.28 },
        label: 'התבודדות וכתיבת שירה',
        bin: 'crossed',
        wrong: 'לא. גם אורחות החיים הקטנות עברו, לא רק הגדולות.',
        note: 'כן. התבודדות וכתיבת שירה — אלה עברו איתם.',
      },
      {
        id: 'ritual',
        prop: { model: 'prop-censer', h: 0.4 },
        label: 'מנהגים פולחניים',
        bin: 'crossed',
        wrong: 'לא. דווקא אלה עברו — ורוב הריטואלים שיהיו באסלאם מקורם בדתות שקדמו לו.',
        note: 'כן. ומנהגים פולחניים — רוב הריטואלים שיהיו באסלאם מקורם בדתות שקדמו לו.',
      },
      {
        id: 'doctrine',
        prop: { model: 'prop-codex', h: 0.3 },
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
    /* גילוי לפני שיפוט: שלושת חפצי הפולחן — האבן הניצבת, המטבע בכיכר
       ואשפת החיצים — נראים קודם (F), ורק אז שופטים. */
    needsFinds: ['find-ansab', 'find-mecca-coin', 'find-divination'],
    x: -1.8, z: -12.6, model: 'ansab', h: 1.6, ry: 0.2,
    prompt: 'עמדו מול האבנים',
    title: 'שלוש האבנים',
    asker: 'הסוחר',
    hint: 'התקרבו לחפצים סביב האבנים ובחנו אותם לפני שתשפטו',
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
    hint: 'גררו את אסימון השיירה על המפה אל הדרך שבה תבחרו לצאת',
    question:
      'המפה פרושה על החול לאור המדורה. אנחנו כאן, ברמות תימן — והשיירה ' +
      'יוצאת עם שחר. הראה לי לאן.',
    options: [
      {
        id: 'north',
        label: 'צפונה — בדרך הבשמים',
        /* המפה פרושה על החול: כל דרך היא עמדה על הבד עצמו, ואסימון
           השיירה נגרר אליה ביד. */
        spot: { dx: 0.1, dz: -1.7 },
        right: true,
        note:
          'זו הדרך. לאורך ההרים במערב חצי האי — מים בכל תחנה ושווקים בדרך, ' +
          'וכל מה שמחכה לנו: תחנת הגבול, ית׳רב, ומכה.',
      },
      {
        id: 'east',
        label: 'מזרחה — לקצר דרך המדבר',
        spot: { dx: 1.7, dz: 0.2 },
        note:
          'תסתכל מה יש שם על המפה: כלום. מדבר החול הגדול בעולם, בלי באר אחת. ' +
          'שיירה הולכת עם הדרך, לא נגדה.',
      },
      {
        id: 'south',
        label: 'דרומה — חזרה אל הנמלים',
        spot: { dx: 0.2, dz: 1.7 },
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

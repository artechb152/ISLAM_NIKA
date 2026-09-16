/* ── חמש החוליות של התשובה ────────────────────────────────────────────────
 *
 * הפרק שאל שאלה אחת ולא ענה עליה. §0 פותח ב„כדי להבין… איך רעיון
 * המונותאיזם עלה בדעתו של מוחמד", ואת התשובה החוברת פורשת על פני חמישה
 * נושאים — כל אחד מהם כותרת ## משלה ב-SOURCE-TEXT — ומצרפת אותם ב-§9
 * („רעיונות מונותאיסטיים חלחלו לחג׳אז מהיהדות ומהנצרות… אלה הותירו רושם")
 * וב-§48. במשחק חמשת הנושאים נאמרו בחמש תחנות נפרדות ואיש לא חיבר ביניהם:
 * הלומד שמע חמישה סיפורים ולא תשובה אחת.
 *
 * לכן הם חיים כאן כרשימה אחת ולא כחמישה מקומות: הלוח ב-HUD מראה אותם מן
 * הרגע הראשון (ריקים — שמותיהם לפני פרטיהם), כל תחנה ממלאת אחד, והמשימה
 * ביציאה מבקשת להרכיב מהם את המשפט של §9.
 *
 * `key` הוא המשפט האחד שהחוליה תורמת לתשובה — לא סיכום שנכתב כאן אלא
 * הסעיף עצמו בניסוחו. שום מחרוזת בקובץ הזה אינה עובדה שאין לה §.
 *
 * אין כאן מצב נשמר: ההשלמה נגזרת מ-`seen`/`solved` שבמחברת, כמו כל השאר. */

export interface ChainLink {
  id: 'empires' | 'tribes' | 'judaism' | 'christianity' | 'mecca'
  /** כותרת ה-## של הנושא ב-SOURCE-TEXT — שם הפרק בחוברת, לא ניסוח של המשחק */
  label: string
  /** הסעיף שממנו נלקחה הכותרת */
  source: string
  /** התחנה שבה החוליה נקנית */
  region: string
  /** מזהה מפגש או משימה; משהושלם — החוליה מלאה */
  unlockedBy: string
  /** המשפט שהחוליה תורמת לתשובה, בניסוח הסעיף */
  key: { source: string; text: string }
}

export const LINKS: ChainLink[] = [
  {
    id: 'empires',
    label: 'שתי האימפריות',
    source: '§2',
    region: 'border-post',
    unlockedBy: 'envoy-sasanian',
    key: {
      source: '§47',
      text: 'הביזנטים השפיעו על תושבי חצי האי — אך את דתם לא הצליחו להשליט שם.',
    },
  },
  {
    id: 'tribes',
    label: 'השבטים ונתיבי המסחר',
    source: '§6',
    region: 'border-post',
    unlockedBy: 'task-border',
    key: {
      source: '§7',
      text: 'השבטים נדדו צפונה מאזור תימן ושימשו מתווכים בין האימפריות — בעיקר לשמירה על נתיבי הסחר.',
    },
  },
  {
    id: 'judaism',
    label: 'היהדות בחצי האי ערב',
    source: '§10',
    region: 'yathrib',
    unlockedBy: 'task-market',
    key: {
      source: '§16',
      text: 'היהודים שיתפו את הערבים באמונתם, במסורותיהם, ואף בציפייתם למשיח.',
    },
  },
  {
    id: 'christianity',
    label: 'הנצרות בחצי האי ערב',
    source: '§18',
    region: 'monastery',
    unlockedBy: 'task-monk',
    key: {
      source: '§20',
      text: 'תושבי מכה ידעו מעט על שורשי הנצרות — הושפעו ממנהגי הנוצרים ומהליכות הנזירים.',
    },
  },
  {
    id: 'mecca',
    label: 'עבודת האלילים בחצי האי ערב',
    source: '§32',
    region: 'mecca',
    unlockedBy: 'task-stones',
    key: {
      source: '§40',
      text: 'לפי המסורת מוחמד התחבר לדת אברהם — דת אבותיו הקדמונים, שהתמסרו לאל אחד ויחיד.',
    },
  },
]

export const LINKS_TOTAL = LINKS.length

/** השאלה שהפרק כולו עונה עליה — §0, בניסוחו. */
export const CHAPTER_QUESTION = {
  source: '§0',
  text: 'איך רעיון המונותאיזם — האמונה באל אחד ויחיד — עלה בדעתו של מוחמד?',
}

export interface LinkState extends ChainLink {
  done: boolean
}

/** מצב הלוח, נגזר ממה שנשמע ומה שנפתר. */
export function linkState(seen: string[], solved: string[]): LinkState[] {
  return LINKS.map((l) => ({
    ...l,
    done: seen.includes(l.unlockedBy) || solved.includes(l.unlockedBy),
  }))
}

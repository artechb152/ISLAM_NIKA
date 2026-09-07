'use client'

/* סינון לפי נושא — שורת הצ'יפים של מסך הפרקים, ברכיב אחד.

   מסך הפרקים מצייר את השורה הזאת בתוך עצמו מאז ומתמיד; כשחדר המבחנים והמחברת
   קיבלו סינון משלהם, שלושה עותקים של אותה שורה היו שלושה מקומות שבהם „הכל“
   יכול להתנהג אחרת. הרכיב הזה הוא העותק המשותף, ומסך הפרקים נשאר כפי שהוא —
   הוא יושב בגיליון אחר (chapters.css) עם ערכת tokens משלו, ומיזוגו לכאן היה
   שינוי בעמוד שאיש לא ביקש לשנות.

   שני דברים שהרכיב מקפיד עליהם, ושניהם באו מהתנהגות מסך הפרקים:

     1. „הכל“ הוא צ'יפ ולא כפתור ניקוי נפרד. הוא תמיד ראשון, תמיד קיים, ותמיד
        מחזיר את התצוגה המלאה.
     2. לחיצה על צ'יפ פעיל מבטלת אותו. הסינון אינו מצב שצריך לצאת ממנו דרך
        מקום אחר.

   קטגוריה בלי תוכן אינה מצוירת כלל. צ'יפ שמסנן לכלום הוא כפתור ששובר את
   העמוד ואז מבקש מהמשתמשת להבין למה. */

export interface TopicOption {
  id: string
  title: string
  /** כמה פריטים יש בקטגוריה — מוצג לצד השם */
  count: number
}

export default function TopicFilter({
  active,
  onPick,
  options,
  allCount,
  allLabel = 'הכל',
  label = 'סינון לפי נושא',
}: {
  active: string | null
  onPick: (id: string | null) => void
  options: TopicOption[]
  allCount: number
  allLabel?: string
  label?: string
}) {
  /* שורה עם אפשרות אחת אינה סינון — היא הצהרה על מה שיש. */
  if (options.length < 2) return null

  return (
    <div className="chip-row" role="group" aria-label={label}>
      <button
        type="button"
        className={'chip' + (active === null ? ' is-active' : '')}
        aria-pressed={active === null}
        onClick={() => onPick(null)}
      >
        {allLabel}
        <span className="chip-n">{allCount}</span>
      </button>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={'chip' + (active === o.id ? ' is-active' : '')}
          aria-pressed={active === o.id}
          onClick={() => onPick(active === o.id ? null : o.id)}
        >
          {o.title}
          <span className="chip-n">{o.count}</span>
        </button>
      ))}
    </div>
  )
}

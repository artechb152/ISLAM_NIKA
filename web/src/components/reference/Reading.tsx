/* ספרות מומלצת — פרק שמונה עשר בחוברת: טבלה של תשעה פריטים בארבעה תחומים.
   הטבלה נשברת לשורות לפי התחום שלה; כל תא מודפס כפי שהוא ב-reading.json, ותא ריק
   בטבלה פשוט לא מופיע. התוויות („נושא", „מיקוד") הן כותרות העמודות של הטבלה. */

import ReferenceShell from '@/components/reference/ReferenceShell'
import READING from '@/lib/reference/reading.json'

type Item = { id: string; title: string; author: string; topic: string | null; link: string | null; focus: string | null }

/* ערכי „מיקוד" שהם דרגה של הפריט ולא חלק ממנו שכדאי להתמקד בו */
const RANKS = new Set(['ספר חובה', 'מומלץ'])

export default function Reading() {
  const cats = READING.categories as Array<{ id: string; title: string; items: Item[] }>
  const total = cats.reduce((n, c) => n + c.items.length, 0)

  return (
    <ReferenceShell
      current="recommended-reading"
      eyebrow="ספרות מומלצת"
      title="המלצה לספרות ולקריאה נוספת"
      subtitle={`רשימה חלקית · ${total} פריטים ב-${cats.length} תחומים`}
    >
      <section className="article-section ref-reading" aria-label="הרשימה">
        {cats.map((c) => (
          <div className="ref-cat" key={c.id}>
            <h2 className="scrolly-env">{c.title}</h2>
            <ul className="ref-rows">
              {c.items.map((it) => (
                <li className="ref-row" key={it.id}>
                  <div className="ref-row-main">
                    <p className="ref-row-title">
                      {it.title}
                      {/* „ספר חובה" / „מומלץ" הם דרגה ולא מיקוד — תג ליד השם, לא שורה בצד */}
                      {it.focus && RANKS.has(it.focus) && <span className="ref-tag">{it.focus}</span>}
                    </p>
                    <p className="ref-row-author">{it.author}</p>
                    {it.topic && <p className="ref-row-topic">{it.topic}</p>}
                  </div>
                  {((it.focus && !RANKS.has(it.focus)) || it.link) && (
                    <div className="ref-row-side">
                      {it.focus && !RANKS.has(it.focus) && (
                        <p className="ref-focus">
                          <span>{READING.columns.focus}</span>
                          {it.focus}
                        </p>
                      )}
                      {it.link && (
                        <a
                          className="ref-out"
                          href={it.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${READING.columns.link}: ${it.title} (נפתח בלשונית חדשה)`}
                        >
                          {READING.columns.link}
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M17 14v5H5V7h5" /></svg>
                        </a>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </ReferenceShell>
  )
}

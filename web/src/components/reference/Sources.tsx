/* מקורות — עמודים 135–136 בחוברת. רשימה ביבליוגרפית בסדר א-ב, והשם מודגש כמו
   בחוברת. ההערה שבראש הרשימה היא של החוברת עצמה, לא שלנו. */

import ReferenceShell from '@/components/reference/ReferenceShell'
import SOURCES from '@/lib/reference/sources.json'

type Item = { id: string; author: string; work: string; dash?: string }

export default function Sources() {
  const items = SOURCES.items as Item[]

  return (
    <ReferenceShell
      current="sources"
      eyebrow="מקורות"
      title="מקורות"
      subtitle={`${items.length} מקורות, לפי סדר א-ב`}
    >
      <section className="article-section ref-sources" aria-label="רשימת המקורות">
        <p className="ref-note">{SOURCES.note}</p>
        <ul className="ref-biblio">
          {items.map((s) => (
            <li key={s.id}>
              <b>{s.author}</b> {s.dash ?? '-'} {s.work}
            </li>
          ))}
        </ul>
        <dl className="ref-extra">
          {SOURCES.extra.map((x) => (
            <div key={x.id}>
              <dt>{x.label}:</dt>
              <dd>{x.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </ReferenceShell>
  )
}

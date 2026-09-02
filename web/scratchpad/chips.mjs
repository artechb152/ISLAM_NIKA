import fs from 'node:fs'
const p = 'src/components/Chapter4.tsx'
let s = fs.readFileSync(p, 'utf8')

/* אייקון לצ'יפ — מקום, זמן, נושא. שלושה בלבד, כמו במוקאפ. */
const ICONS = `type ChipKind = 'place' | 'time' | 'topic'

function ChipIcon({ kind }: { kind: ChipKind }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {kind === 'place' && (
        <>
          <path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.4" />
        </>
      )}
      {kind === 'time' && (
        <>
          <path d="M7 3h10M7 21h10" />
          <path d="M8 3c0 4 4 5.2 4 9s-4 5-4 9" />
          <path d="M16 3c0 4-4 5.2-4 9s4 5 4 9" />
        </>
      )}
      {kind === 'topic' && <path d="M19.5 14.5A8 8 0 019 4.6a8.4 8.4 0 1010.5 9.9z" />}
    </svg>
  )
}

`
s = s.replace('function PalmRule() {', ICONS + 'function PalmRule() {')

/* הצ'יפ נושא סוג ומילה, והמילה עדיין מוכחת מהמשפט של הפעימה */
s = s.replace(
  '  /** words lifted out of THIS beat\'s sentence, proved to be in it */\n  chips?: string[]',
  "  /** words lifted out of THIS beat's sentence, proved to be in it */\n  chips?: { kind: ChipKind; word: string }[]",
)
s = s.replace(
  `                {b.chips.map((c) => (
                  <li key={c}>{pick(b.r, c)}</li>
                ))}`,
  `                {b.chips.map((c) => (
                  <li key={c.word}>
                    <ChipIcon kind={c.kind} />
                    {pick(b.r, c.word)}
                  </li>
                ))}`,
)

/* האייברו נושא את שם הנושא ולא את שם הפעימה — כמו במוקאפ */
s = s.replace(
  `            <p className="ch4-stage-eyebrow">
              {b.label} <span>/ {String(i + 1).padStart(2, '0')}</span>
            </p>`,
  `            <p className="ch4-stage-eyebrow">
              {label} <span>/ {String(i + 1).padStart(2, '0')}</span>
            </p>`,
)

/* שלושה צ'יפים לכל פעימה שיש לה שלושה — כולם מילים מהמשפט עצמו */
const CHIPS = {
  "chips: ['מכה'],": "chips: [{ kind: 'place', word: 'מכה' }, { kind: 'topic', word: 'עבודת האלילים' }],",
  'chips: ["ית\'רב"],':
    "chips: [{ kind: 'place', word: \"ית'רב\" }, { kind: 'place', word: 'מכה' }, { kind: 'topic', word: 'שבט אוס' }],",
  "chips: ['בני נדיר'],":
    "chips: [{ kind: 'topic', word: 'בני נדיר' }, { kind: 'topic', word: 'בני קריזה' }, { kind: 'topic', word: 'בני קינקאע' }],",
  "chips: ['יתומים מקומיים'],":
    "chips: [{ kind: 'place', word: 'למדינה' }, { kind: 'topic', word: 'יתומים מקומיים' }],",
  "chips: ['מדינה'],":
    "chips: [{ kind: 'place', word: 'מדינה' }, { kind: 'time', word: '627' }, { kind: 'topic', word: 'שבט קוריש' }],",
  "chips: ['סלמאן אלפראסי'],":
    "chips: [{ kind: 'topic', word: 'סלמאן אלפראסי' }, { kind: 'place', word: 'מדינה' }],",
}
for (const [from, to] of Object.entries(CHIPS)) {
  if (!s.includes(from)) console.log('  לא נמצא:', from)
  s = s.split(from).join(to)
}
fs.writeFileSync(p, s)
console.log('chips rebuilt')

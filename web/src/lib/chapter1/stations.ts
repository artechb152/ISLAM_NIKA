/* Chapter 1 station definitions. World positions are in scene meters (x, z on the
   ground plane). Texts live here — never retyped in JSX — mirroring the CH6 data
   pattern. Milestone 1 ships station 1 only; the rest of the array grows with it. */

export type PoiKind = 'required' | 'optional'

export interface Poi {
  id: string
  /** Marker label shown in the world and in the checklist */
  label: string
  kind: PoiKind
  /** Ground position in the station scene */
  x: number
  z: number
  /** Info card content */
  title: string
  lead: string
  bullets: string[]
  /** Who explains this point. Without a speaker there is no dialogue bubble. */
  speaker?: {
    name: string
    model?: string
    portrait?: string
    ry?: number
    /** Explicit standing spot, kept clear of tents and the main walking lane. */
    x?: number
    z?: number
    /** Visual variation for recurring base meshes. */
    tint?: string
    height?: number
    build?: number
    pose?: 'stand' | 'sit' | 'work' | 'pace' | 'water'
    accessory?: 'cap' | 'turban' | 'staff'
    accent?: string
  }
  /** A readable object in the scene used instead of a speaking character. */
  sceneObject?: 'concept-board'
  /** Opens as a text-only introduction when entering the station. */
  autoDialogue?: boolean
  /** Icon shown in the world marker */
  icon?: string
  /** Fixed framing tag: Muslim tradition vs. critical scholarship (spec §6, station 1) */
  tag?: 'מסורת מוסלמית' | 'מבט מחקרי'
}

export interface StationDef {
  id: string
  /** Order along the journey, 1-based */
  number: number
  name: string
  short: string
  /** How many POIs must be activated to complete the station */
  quota: number
  pois: Poi[]
}

export const STATIONS: StationDef[] = [
  {
    id: 'gate',
    number: 1,
    name: 'שער המסע: הג׳אהליה',
    short: 'מחנה השיירה לפני היציאה. כאן לומדים מהי הג׳אהליה ומדוע יש לקרוא את המקורות בזהירות.',
    quota: 2,
    pois: [
      {
        id: 'terms',
        label: 'לוח המושגים',
        kind: 'required',
        x: -4,
        z: 1.5,
        icon: '📜',
        sceneObject: 'concept-board',
        title: 'ג׳אהליה',
        lead: 'התקופה שלפני האסלאם מכונה ג׳אהליה — ולמונח שתי משמעויות:',
        bullets: [
          'בערות ובורות ביחס לאמונה באל אחד.',
          'ברבריות, פראות וחוסר מעצורים.',
        ],
      },
      {
        id: 'scroll',
        label: 'מגילה קרועה',
        kind: 'optional',
        x: -10.5,
        z: -13.5,
        icon: '📖',
        speaker: { name: 'הכרוניקן', portrait: '/assets/chapter1/tex/portrait-chronicler.jpg', x: -10.3, z: -12.2, ry: -2.99, height: 1.84, build: 0.96, pose: 'work', tint: '#d7e5c5', accessory: 'turban', accent: '#d8c79f' },
        title: 'מגבלת המקורות',
        lead: 'המידע על התקופה דל, וחלק גדול ממנו נכתב לאחר הופעת האסלאם.',
        bullets: [
          'מרבית הידוע לנו מגיע מהספרות והמסורת המוסלמית.',
          'לכן יש לקרוא אותו ב"עירבון מוגבל" — במבט ביקורתי.',
        ],
        tag: 'מבט מחקרי',
      },
      {
        id: 'mirror',
        label: 'מראה כפולה',
        kind: 'optional',
        x: 10.5,
        z: -13.5,
        icon: '🪞',
        speaker: { name: 'הזקן מן השבט', model: '/assets/chapter1/models/traveler-sit.glb', portrait: '/assets/chapter1/tex/portrait-elder.jpg', x: 9.7, z: -14.1, ry: -1.98, height: 1.24, build: 1.04, pose: 'sit', tint: '#e4cdb8', accessory: 'staff', accent: '#76502e' },
        title: 'שתי דרכים להביט בתקופה',
        lead: 'אותה תקופה — שני תיאורים:',
        bullets: [
          'כיצד המסורת המוסלמית מתארת אותה.',
          'מה אפשר לקבוע בזהירות היסטורית.',
        ],
      },
    ],
  },
]

export const STATION_COUNT_PLANNED = 8

export function stationById(id: string): StationDef {
  const s = STATIONS.find((st) => st.id === id)
  if (!s) throw new Error(`unknown station: ${id}`)
  return s
}

/* The single source of truth for the chapters menu.
   The sidebar, the cards grid, the search index, the category ranges and the navigation
   are all derived from this one structure — nothing is duplicated between components.

   Chapter TITLES are carried verbatim from the original site (including the ׳ gershayim
   forms) — the redesign brief forbids renaming chapters. Only chapter 6 is built, so only
   it carries an href; the rest render as cards and menu items with no navigation. */

export interface ChapterDef {
  id: string
  number: number
  title: string
  image: string
  href?: string
  available: boolean
}

export type CategoryIcon = 'clock' | 'person' | 'book' | 'arch' | 'shield' | 'cap'

export interface CategoryDef {
  id: string
  number: number
  title: string
  icon: CategoryIcon
  chapters: ChapterDef[]
}

function ch(number: number, title: string, extra?: Partial<ChapterDef>): ChapterDef {
  return {
    id: 'ch' + number,
    number,
    title,
    image: `/assets/chapters/ch${number}.jpg`,
    available: false,
    ...extra,
  }
}

export const chapterCategories: CategoryDef[] = [
  {
    id: 'history',
    number: 1,
    title: 'רקע היסטורי ותרבותי',
    icon: 'clock',
    chapters: [
      ch(1, 'ההיסטוריה של חצי האי ערב'),
      ch(2, 'תרבות שבטית טרום עליית האסלאם'),
    ],
  },
  {
    id: 'muhammad',
    number: 2,
    title: 'מוחמד וראשית האסלאם',
    icon: 'person',
    chapters: [
      ch(3, 'ראשית חיי מוחמד'),
      ch(4, 'ההג׳רה והקרבות'),
      ch(5, 'שאלת הירושה והח׳ליפים ישרי הדרך'),
    ],
  },
  {
    id: 'faith',
    number: 3,
    title: 'אמונה, פולחן ומקורות',
    icon: 'book',
    chapters: [
      ch(6, 'חמש מצוות היסוד', {
        href: '/chapter6',
        available: true,
        image: '/assets/chapter6/entrance-keyframe.jpg',
      }),
      ch(7, 'לוח השנה ההג׳רי'),
      ch(8, 'מקורות האסלאם — הקוראן והסונה'),
    ],
  },
  {
    id: 'streams',
    number: 4,
    title: 'זרמים והלכה',
    icon: 'arch',
    chapters: [
      ch(9, 'האסלאם השיעי'),
      ch(10, 'זרמים שונים באסלאם'),
      ch(11, 'מקורות ואסכולות ההלכה'),
    ],
  },
  {
    id: 'jihad',
    number: 5,
    title: 'ג׳האד, סמלים ומודיעין',
    icon: 'shield',
    chapters: [
      ch(12, 'ג׳האד, ריבאט, ואסתשהאד'),
      ch(13, 'דגלים וסמלים'),
      ch(14, 'מוטיבים אסלאמיים בחומר המודיעין הגלוי'),
    ],
  },
  {
    id: 'tools',
    number: 6,
    title: 'כלי עזר והעמקה',
    icon: 'cap',
    chapters: [
      ch(15, 'ציר הזמן בראשית האסלאם'),
      ch(16, 'ימי ציון אזכור'),
      ch(17, 'מילון מונחים'),
      ch(18, 'ספרות מומלצת'),
    ],
  },
]

/* The secondary area under the categories. מילון מונחים already lives as chapter 17,
   so — per the brief — it is NOT repeated here. */
export const secondaryItems: Array<{ id: string; title: string; icon: 'map' | 'books' }> = [
  { id: 'maps', title: 'מפות', icon: 'map' },
  { id: 'sources', title: 'מקורות', icon: 'books' },
]

export const allChapters: ChapterDef[] = chapterCategories.flatMap((c) => c.chapters)

/* "פרקים 1–2" — the range a category spans, derived rather than retyped */
export function categoryRange(cat: CategoryDef): string {
  const nums = cat.chapters.map((c) => c.number)
  const lo = Math.min(...nums)
  const hi = Math.max(...nums)
  return lo === hi ? `פרק ${lo}` : `פרקים ${lo}–${hi}`
}

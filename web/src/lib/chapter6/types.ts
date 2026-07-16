/* The chapter's contract, written down.
   These types describe the data and the engine↔mechanism boundary exactly as the original
   JavaScript used them — nothing here invents a field the chapter did not already have. */

export type ScreenKind =
  | 'film'
  | 'opening'
  | 'content'
  | 'visual'
  | 'check'
  | 'transition'
  | 'finish'

export interface ActionDetail {
  commandment: string
  action: string
  quote: string
}

export interface CheckOption {
  text: string
  right: boolean
}

export interface CheckPair {
  left: string
  right: string
}

export interface SituationPair {
  key: string
  text: string
  to: string
}

interface CheckBase {
  instruction: string
  ok: string
  try: string
  hint?: string
}

/* One member per interaction the spec names. The discriminant lets each mechanism read
   its own option set without a cast, and stops a check being handed to the wrong one. */
export type Check =
  | (CheckBase & { type: 'multi'; question: string; options: CheckOption[] })
  | (CheckBase & { type: 'single'; question: string; options: CheckOption[] })
  | (CheckBase & { type: 'match'; pairs: CheckPair[] })
  | (CheckBase & { type: 'order'; steps: string[] })
  | (CheckBase & { type: 'situations'; pairs: SituationPair[] })

export interface Screen {
  id: string
  kind?: ScreenKind
  section: string
  title: string
  content?: string[]
  text?: string
  lead?: string
  nextLabel?: string
  completion?: string
  drawerTitle?: string
  drawerContent?: string[]
  actionDetails?: ActionDetail[]
  check?: Check
  /* Several mechanisms read `screen.feedback`, but no screen in data.ts carries it — every
     such read resolves to '' today. It is declared here because the mechanisms genuinely
     expect it, not because the data supplies it. Retired code holds most of these reads. */
  feedback?: string[]
  /* the engine stamps each screen with its own index on boot */
  _i?: number
}

export interface ChapterData {
  project: string
  screens: Screen[]
}

/* ---------------- engine ↔ mechanism boundary ---------------- */

export interface VerbDef {
  key: string
  verb: string
  name: string
  section: string
}

export interface EngineState {
  screen: number
  done: Record<string, boolean>
  mech: Record<string, boolean>
  completed: boolean
}

/* `el('img')` has to hand back an HTMLImageElement, or every mechanism that sets `.src`
   would need a cast. The tag-name generic is what keeps the ported code cast-free. */
export type ElFn = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string | null,
  text?: string | null
) => HTMLElementTagNameMap[K]

export type Tone = 'ok' | 'try' | 'bad'

export interface MechApi {
  screen: Screen
  stage: HTMLElement
  /* only the bespoke screens (opening, finish) are given a side pane */
  content: HTMLElement | undefined
  paras: HTMLParagraphElement[]
  reduced: boolean
  el: ElFn
  svg: (paths: string, vb?: string) => SVGSVGElement
  /* a mechanism calls this when its own completion condition is met */
  complete: () => void
  /* `null` is accepted as well as omitted because the mechanisms call say('', null) to clear
     the line. The engine only reads `tone` when `text` is non-empty, so the two are the same
     call — widening the type here keeps eleven call sites verbatim instead of editing them. */
  say: (text: string, tone?: Tone | null) => void
  miss: (text?: string) => number
  highlight: (i: number) => void
  hint: (text: string) => HTMLDivElement
  done: () => boolean
  /* a mechanism may set this; the engine calls it every time the screen is entered */
  onEnter?: () => void
}

export type MechFn = (api: MechApi) => void

export type MechRegistry = Record<string, MechFn>

export interface EngineApi {
  go: (idx: number) => void
  goto: (id: string) => void
  openDrawer: (title: string, paras: string[], opener?: HTMLElement | null) => void
  closeDrawer: () => void
  verbs: VerbDef[]
  state: EngineState
  save: () => void
  sectionDone: (section: string) => boolean
  firstScreenOfSection: (section: string) => number | null
  reduced: boolean
  markChapterComplete: () => void
  /* the film calls this to reveal the chapter and land on a screen */
  start: (startIdx?: number) => void
  resumeScreen: number
  hasProgress: boolean
}

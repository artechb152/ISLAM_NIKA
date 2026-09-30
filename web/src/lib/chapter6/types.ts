/* The shape of the chapter's data (data.ts), written down. The screen-by-screen engine these
   types once also described is retired; only the data contract is left. */

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
}

export interface ChapterData {
  project: string
  screens: Screen[]
}

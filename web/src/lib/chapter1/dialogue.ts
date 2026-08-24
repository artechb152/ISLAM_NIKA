/* Chapter 1 dialogue — the single source of truth for everything a character
   says. Content lives in dialogue.json, which is generated from (and verified
   against) concept/chapter1/SOURCE-TEXT.md: every line carries the §N of the
   passage it paraphrases, and concept/chapter1/verify-dialogue.mjs fails the
   build of the content if a line loses its source or a source goes unspoken.
   Nothing here may be rewritten by hand in JSX. */

import raw from './dialogue.json'

export type SpeakerId = 'narrator' | 'rawi' | 'envoy' | 'chief' | 'merchant' | 'jewish' | 'monk'

/** Which gesture clip Rawi plays for a line; other characters only vary intensity. */
export type Gesture = 'talk' | 'talk-nod' | 'talk-ack' | 'talk-happy'

export interface Line {
  /** `§12` — the passage in SOURCE-TEXT.md this paraphrases. Never optional. */
  source: string
  text: string
  /** Quotes or cites the Qur'an — collected into the notebook's verses tab. */
  verse?: boolean
}

export interface Choice {
  prompt: string
  lines: Line[]
}

export interface Encounter {
  id: string
  speaker: SpeakerId
  /** `cinematic` plays without a portrait; `climax` is the Abraha sequence. */
  kind?: 'cinematic' | 'climax'
  /** Index into the 26-item notebook this encounter files under. */
  notebook: number
  gesture?: Gesture
  lines: Line[]
  /** A short film that plays inside the panel for this encounter — a file
      under /assets/anim-video. Only where the footage keeps faith with the
      chapter's period: of the five finished films, one does. */
  film?: string
  /** Rawi's sharpening remark after the character finishes. */
  rawi_followup?: Line[]
  choices?: Choice[]
  blocked_action_note?: string
}

export interface Region {
  id: string
  name: string
  encounters: Encounter[]
}

interface DialogueFile {
  speakers: Record<SpeakerId, string>
  regions: Region[]
}

const data = raw as unknown as DialogueFile

export const SPEAKERS = data.speakers
export const REGIONS: Region[] = data.regions

/** Portrait shown in the dialogue bubble. The narrator speaks without one. */
export const PORTRAIT: Record<SpeakerId, string | null> = {
  narrator: null,
  rawi: '/assets/chapter1/faces/rawi.jpg',
  envoy: '/assets/chapter1/faces/envoy.jpg',
  chief: '/assets/chapter1/faces/chief.jpg',
  merchant: '/assets/chapter1/faces/merchant.jpg',
  jewish: '/assets/chapter1/faces/scholar.jpg',
  monk: '/assets/chapter1/faces/monk.jpg',
}

/** Body model. Rawi is skeletally animated; the robed characters are not — see
    the note in Characters.tsx for why. */
export const MODEL: Record<Exclude<SpeakerId, 'narrator'>, string> = {
  rawi: '/assets/chapter1/models/rawi.glb',
  envoy: '/assets/chapter1/models/npc-envoy.glb',
  chief: '/assets/chapter1/models/npc-chief.glb',
  merchant: '/assets/chapter1/models/npc-merchant.glb',
  jewish: '/assets/chapter1/models/npc-jewish.glb',
  monk: '/assets/chapter1/models/npc-monk.glb',
}

export const NOTEBOOK_TOTAL = 27

export function regionById(id: string): Region {
  const r = REGIONS.find((x) => x.id === id)
  if (!r) throw new Error(`unknown region: ${id}`)
  return r
}

/** Every notebook entry, in journey order, with the encounters that fill it. */
export function notebookIndex(): { n: number; region: string; encounters: Encounter[] }[] {
  const byNumber = new Map<number, { n: number; region: string; encounters: Encounter[] }>()
  for (const region of REGIONS) {
    for (const e of region.encounters) {
      const cur = byNumber.get(e.notebook)
      if (cur) cur.encounters.push(e)
      else byNumber.set(e.notebook, { n: e.notebook, region: region.name, encounters: [e] })
    }
  }
  return [...byNumber.values()].sort((a, b) => a.n - b.n)
}

/* ---------------- what the notebook and the map read ---------------- */

/** One heard encounter, tagged with the region it was heard in. */
export interface JournalEntry {
  encounter: Encounter
  regionId: string
  regionName: string
}

/** Everything heard so far, in journey order. The notebook holds nothing else:
    an entry appears only once its encounter has been played to the end. */
export function journal(seen: string[]): JournalEntry[] {
  const heard = new Set(seen)
  const out: JournalEntry[] = []
  for (const region of REGIONS) {
    for (const encounter of region.encounters) {
      if (heard.has(encounter.id)) {
        out.push({ encounter, regionId: region.id, regionName: region.name })
      }
    }
  }
  return out
}

/** A verse line together with who said it and where — the „פסוקים“ tab. */
export interface VerseEntry extends JournalEntry {
  line: Line
}

export function verses(seen: string[]): VerseEntry[] {
  return journal(seen).flatMap((entry) =>
    encounterScript(entry.encounter)
      .filter(({ line }) => line.verse)
      .map(({ line }) => ({ ...entry, line })),
  )
}

/** How much of each region has been heard — the world map's pin states. */
export interface RegionProgress {
  id: string
  name: string
  done: number
  total: number
  complete: boolean
}

export function regionProgress(seen: string[]): RegionProgress[] {
  const heard = new Set(seen)
  return REGIONS.map((r) => {
    const done = r.encounters.filter((e) => heard.has(e.id)).length
    return { id: r.id, name: r.name, done, total: r.encounters.length, complete: done === r.encounters.length }
  })
}

/** Flattened speech for an encounter: the character, then Rawi's remark. */
export function encounterScript(e: Encounter): { speaker: SpeakerId; line: Line }[] {
  return [
    ...e.lines.map((line) => ({ speaker: e.speaker, line })),
    ...(e.rawi_followup ?? []).map((line) => ({ speaker: 'rawi' as SpeakerId, line })),
  ]
}

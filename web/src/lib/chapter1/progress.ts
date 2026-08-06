/* Chapter 1 progress store — same discipline as chapter6/progress.ts:
   one versioned localStorage key, derived flags recomputed on read,
   and the chapters-screen key written only on true completion. */

export const STORE_KEY = 'ch1:v1'
const CHAPTER_DONE_KEY = 'islam:chapter:1'

export interface Ch1Store {
  /** Current station id */
  station: string
  /** Activated poi ids, namespaced `${stationId}:${poiId}` */
  pois: string[]
  /** Station ids whose quota + required pois were met */
  stationsDone: string[]
}

const EMPTY: Ch1Store = { station: 'gate', pois: [], stationsDone: [] }

export function readStore(): Ch1Store {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<Ch1Store>
    return {
      station: typeof parsed.station === 'string' ? parsed.station : EMPTY.station,
      pois: Array.isArray(parsed.pois) ? parsed.pois.filter((p): p is string => typeof p === 'string') : [],
      stationsDone: Array.isArray(parsed.stationsDone)
        ? parsed.stationsDone.filter((s): s is string => typeof s === 'string')
        : [],
    }
  } catch {
    return EMPTY
  }
}

function write(store: Ch1Store) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    /* storage may be unavailable (private mode) — the game keeps working in-memory */
  }
}

export function poiKey(stationId: string, poiId: string) {
  return `${stationId}:${poiId}`
}

export function markPoiDone(stationId: string, poiId: string): Ch1Store {
  const store = readStore()
  const key = poiKey(stationId, poiId)
  if (!store.pois.includes(key)) store.pois = [...store.pois, key]
  write(store)
  return store
}

export function markStationDone(stationId: string): Ch1Store {
  const store = readStore()
  if (!store.stationsDone.includes(stationId)) store.stationsDone = [...store.stationsDone, stationId]
  write(store)
  return store
}

export function saveCurrentStation(stationId: string) {
  const store = readStore()
  store.station = stationId
  write(store)
}

/** Called only from the closing practice screen, like chapter 6. */
export function markChapterComplete() {
  try {
    window.localStorage.setItem(CHAPTER_DONE_KEY, 'done')
  } catch {
    /* ignore */
  }
}

/* Station progress for chapter 13 — the hall the reader walks through freely.

   Free walking (the user's choice, 4.11.2026) means nothing forces the reader past every
   station, so the chapter keeps an honest record instead: a station counts as read when its
   card was OPENED, not when the reader walked by. `ch13:v1 = {stations}`.

   `islam:chapter:13 = 'done'` is written by the practice and by nowhere else, as in every
   other chapter: reading all sixteen cards is not finishing the chapter. */

import layout from './layout.json'

export const STORE_KEY = 'ch13:v1'

export const STATION_ORDER: string[] = (layout as { stations: { sec: string }[] }).stations.map((s) => s.sec)

export interface Ch13Store {
  /** §s whose card the reader opened */
  stations: string[]
}

const EMPTY: Ch13Store = { stations: [] }

export function readStore(): Ch13Store {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    const p = raw ? (JSON.parse(raw) as Partial<Ch13Store> | null) : null
    if (!p || !Array.isArray(p.stations)) return EMPTY
    return { stations: p.stations.filter((s): s is string => STATION_ORDER.includes(s)) }
  } catch {
    return EMPTY
  }
}

export function markStationRead(sec: string): Ch13Store {
  const store = readStore()
  if (STATION_ORDER.includes(sec) && !store.stations.includes(sec)) {
    store.stations = [...store.stations, sec]
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(store))
    } catch {
      /* blocked storage must never break the chapter */
    }
  }
  return store
}

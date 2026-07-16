/* The mechanisms used to reach the engine through window.CH6E. They now reach it through
   this module instead: same late binding — a mechanism only ever runs after the engine
   exists — but the reference is typed and the global is gone. */
import type { EngineApi } from './types'

let current: EngineApi | null = null

export function setEngine(next: EngineApi | null): void {
  current = next
}

export function engine(): EngineApi {
  if (!current) throw new Error('CH6: the engine was read before it was created')
  return current
}

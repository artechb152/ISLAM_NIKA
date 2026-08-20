/* The sound of chapter 1 — synthesised, not sampled.
 *
 * The chapter shipped completely silent: 366 metres of walking, nine regions,
 * a campfire animating at 20 fps, and not one sound file anywhere in the tree.
 * Silence is not neutral in a first-person world — it reads as unfinished.
 *
 * Everything here is generated in the Web Audio graph rather than loaded,
 * because it costs nothing to ship and nothing to download: wind is filtered
 * brown noise, a footstep is a noise burst with a 90 ms envelope, a fire is
 * random pops over a low rumble, and a distant market is noise pushed through
 * three vowel formants. That also means every sound is parameterised, so a
 * region asks for "wind 0.5, fire near, no crowd" instead of shipping nine
 * mixes of the same loop.
 *
 * Nothing starts before the player touches the page — browsers refuse it, and
 * so would anyone sitting in a classroom. `unlock()` is called from the first
 * gesture, and the mute state lives in localStorage so a choice made in the
 * first region still holds in the ninth, across the full page reload that
 * every gate crossing performs.
 */

const MUTE_KEY = 'ch1:muted'

type Ambience = {
  /** 0–1, how much wind this region has */
  wind: number
  /** brightness of the wind, Hz — a high pass howls, a low one breathes */
  windTone: number
  /** 0–1, campfire crackle */
  fire: number
  /** 0–1, distant market voices */
  crowd: number
}

const AMBIENCE: Record<string, Ambience> = {
  'yemen-heights': { wind: 0.85, windTone: 620, fire: 0, crowd: 0 },
  'night-camp': { wind: 0.34, windTone: 300, fire: 0.7, crowd: 0.1 },
  'border-post': { wind: 0.42, windTone: 420, fire: 0.35, crowd: 0.3 },
  'narrow-pass': { wind: 1.0, windTone: 760, fire: 0.2, crowd: 0 },
  'loading-road': { wind: 0.5, windTone: 400, fire: 0, crowd: 0.34 },
  yathrib: { wind: 0.3, windTone: 340, fire: 0, crowd: 0.6 },
  monastery: { wind: 0.55, windTone: 480, fire: 0, crowd: 0.05 },
  mecca: { wind: 0.32, windTone: 360, fire: 0.25, crowd: 0.72 },
  exit: { wind: 0.7, windTone: 540, fire: 0, crowd: 0.12 },
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let started = false
let muted = false
let fireTimer: number | null = null
const stopFns: (() => void)[] = []

export function isMuted() {
  return muted
}

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

/** Two seconds of brown noise. Brown rather than white because wind, sand and
    fire are all weighted to the low end — white noise reads as radio hiss. */
function brownNoise(c: AudioContext) {
  const len = c.sampleRate * 2
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    d[i] = last * 3.2
  }
  return buf
}

function loop(gain: number) {
  const c = ctx!
  const src = c.createBufferSource()
  src.buffer = noise
  src.loop = true
  const g = c.createGain()
  g.gain.value = gain
  src.connect(g)
  src.start()
  stopFns.push(() => {
    try { src.stop() } catch { /* already stopped */ }
  })
  return { src, g }
}

/** Call from the first real gesture. Safe to call repeatedly. */
export function unlock() {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume()
    return
  }
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return
  ctx = new Ctor()
  noise = brownNoise(ctx)
  master = ctx.createGain()
  muted = readMuted()
  master.gain.value = muted ? 0 : 1
  master.connect(ctx.destination)
}

export function setMuted(next: boolean) {
  muted = next
  try { localStorage.setItem(MUTE_KEY, next ? '1' : '0') } catch { /* private mode */ }
  if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.05)
}

/** Starts the bed for a region. One region per document, so this runs once. */
export function startAmbience(regionId: string) {
  unlock()
  if (!ctx || !master || started) return
  started = true
  const a = AMBIENCE[regionId] ?? { wind: 0.5, windTone: 420, fire: 0, crowd: 0 }
  const c = ctx

  /* Wind: one steady body plus a gust layer whose filter and gain drift on
     slow LFOs. Two uncorrelated periods (17 s and 23 s) so the loop never
     lands on itself and the ear never finds the seam. */
  if (a.wind > 0.01) {
    const { g } = loop(1)
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = a.windTone
    lp.Q.value = 0.6
    const body = c.createGain()
    body.gain.value = 0.09 * a.wind
    g.connect(lp).connect(body).connect(master)

    const { g: g2 } = loop(1)
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = a.windTone * 2.4
    bp.Q.value = 1.1
    const gust = c.createGain()
    gust.gain.value = 0.02 * a.wind
    g2.connect(bp).connect(gust).connect(master)

    for (const [target, depth, period] of [
      [bp.frequency, a.windTone * 0.9, 17],
      [gust.gain, 0.022 * a.wind, 23],
    ] as [AudioParam, number, number][]) {
      const lfo = c.createOscillator()
      lfo.frequency.value = 1 / period
      const amt = c.createGain()
      amt.gain.value = depth
      lfo.connect(amt).connect(target)
      lfo.start()
      stopFns.push(() => { try { lfo.stop() } catch { /* already stopped */ } })
    }
  }

  /* A market, three formants deep. Filtered noise alone is surf; noise pushed
     through the resonances a human throat makes is a room with people in it,
     as long as it stays far enough back that no word can be made out. */
  if (a.crowd > 0.01) {
    const { g } = loop(1)
    const bus = c.createGain()
    bus.gain.value = 0.055 * a.crowd
    for (const [f, q] of [[540, 5], [1180, 7], [2400, 6]] as [number, number][]) {
      const bp = c.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = f
      bp.Q.value = q
      g.connect(bp).connect(bus)
    }
    bus.connect(master)
    const lfo = c.createOscillator()
    lfo.frequency.value = 1 / 9
    const amt = c.createGain()
    amt.gain.value = 0.02 * a.crowd
    lfo.connect(amt).connect(bus.gain)
    lfo.start()
    stopFns.push(() => { try { lfo.stop() } catch { /* already stopped */ } })
  }

  /* Fire: a low rumble under randomly spaced pops. Even spacing reads as a
     machine, so each gap is drawn fresh. */
  if (a.fire > 0.01) {
    const { g } = loop(1)
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 180
    const rumble = c.createGain()
    rumble.gain.value = 0.05 * a.fire
    g.connect(lp).connect(rumble).connect(master)

    const pop = () => {
      if (!ctx || !master) return
      const src = ctx.createBufferSource()
      src.buffer = noise
      src.playbackRate.value = 1.5 + Math.random()
      const hp = ctx.createBiquadFilter()
      hp.type = 'bandpass'
      hp.frequency.value = 900 + Math.random() * 2600
      hp.Q.value = 2
      const env = ctx.createGain()
      const t = ctx.currentTime
      const peak = (0.02 + Math.random() * 0.05) * a.fire
      env.gain.setValueAtTime(0, t)
      env.gain.linearRampToValueAtTime(peak, t + 0.004)
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.08)
      src.connect(hp).connect(env).connect(master)
      src.start(t, Math.random() * 1.5)
      src.stop(t + 0.2)
      fireTimer = window.setTimeout(pop, 45 + Math.random() * 260)
    }
    fireTimer = window.setTimeout(pop, 200)
  }
}

export function stopAmbience() {
  if (fireTimer !== null) { clearTimeout(fireTimer); fireTimer = null }
  for (const s of stopFns) s()
  stopFns.length = 0
  started = false
}

/* A step in sand: a short band of noise, no click at the front. Sand has no
   impact transient the way stone does — it is all body and no edge, which is
   why the attack is 6 ms rather than instant. Running steps land harder and
   slightly brighter. */
export function footstep(running: boolean) {
  if (!ctx || !master || muted) return
  const c = ctx
  const t = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noise
  src.playbackRate.value = 1.6 + Math.random() * 0.5

  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = (running ? 1150 : 880) * (0.9 + Math.random() * 0.2)
  bp.Q.value = 0.9

  const env = c.createGain()
  const peak = running ? 0.13 : 0.075
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(peak, t + 0.006)
  env.gain.exponentialRampToValueAtTime(0.0001, t + (running ? 0.12 : 0.16))

  src.connect(bp).connect(env).connect(master)
  src.start(t, Math.random() * 1.5)
  src.stop(t + 0.25)
}

type Cue = 'find' | 'task' | 'page' | 'tick' | 'gate' | 'ui'

/* The moments the chapter had no way to mark. A find used to open a card in
   total silence; a gate used to swallow the screen with no warning at all. */
const CUES: Record<Cue, { notes: number[]; gain: number; dur: number; type: OscillatorType }> = {
  find: { notes: [587.33, 880], gain: 0.09, dur: 0.5, type: 'sine' },        // D5 → A5
  task: { notes: [440, 659.25, 880], gain: 0.08, dur: 0.6, type: 'triangle' }, // A4 → E5 → A5
  gate: { notes: [146.83, 220], gain: 0.11, dur: 1.1, type: 'sine' },        // D3 → A3
  page: { notes: [1320], gain: 0.03, dur: 0.09, type: 'sine' },
  tick: { notes: [2100], gain: 0.012, dur: 0.02, type: 'sine' },
  ui: { notes: [880], gain: 0.035, dur: 0.06, type: 'sine' },
}

export function cue(which: Cue) {
  if (!ctx || !master || muted) return
  const c = ctx
  const spec = CUES[which]
  spec.notes.forEach((hz, i) => {
    const t = c.currentTime + i * spec.dur * 0.28
    const osc = c.createOscillator()
    osc.type = spec.type
    osc.frequency.value = hz
    const env = c.createGain()
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(spec.gain, t + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, t + spec.dur)
    osc.connect(env).connect(master!)
    osc.start(t)
    osc.stop(t + spec.dur + 0.05)
  })
}

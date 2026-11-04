'use client'

/* Chapter 11 — the relief map.

   Built in Blender (concept/chapter11/blender/build-relief.py) and shipped as two files:
   relief.jpg — the approved render, top-down and orthographic, its light baked in (diffuse
   light does not depend on the view, so it stays right when the camera tilts) — and
   height.png, a 512×448 grid with 16-bit height in R/G and the land mask in B.

   ONLY A CLICK MOVES IT (the user, 3.11.2026: the scroll-driven version „נראה דל ולא יושב טוב
   במסך"; then „מפה חיה, בלחיצה"). The section hands in its stops and which one is active;
   when `active` changes the camera flies there, and the washes, labels and pins of the new
   stop fade in as the old ones fade out. What the camera looks at, what is washed in gold,
   which names and pins stand — all of it comes from layout.json. This file draws; it never
   decides what the map says. */

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { RELIEF, lonlat } from '@/lib/chapter11/geo'

const ART = '/assets/chapter11/'

export interface Cam { at: [number, number]; dist: number; tilt: number }
export interface MapLabel { at: [number, number]; text: string; year?: boolean }
export interface MapStop {
  cam: Cam
  wash?: Record<string, number>
  labels?: MapLabel[]
  pins?: [number, number][]
  arc?: number
  /** places this view must show — the camera frames them itself (see resolve) */
  fit?: [number, number][]
}
export interface Region { at: [number, number]; r: [number, number] }

interface Props {
  stops: MapStop[]
  /** the stop the camera rests on */
  active: number
  regions: Record<string, Region>
  /** an arc between two places — „גורש לקטר" — drawn on stops that carry `arc` */
  arc?: [[number, number], [number, number]]
  /** the points the reader can press — shown while the camera rests on stop 0, the overview */
  points?: { at: [number, number]; name: string; sub?: string; view: number }[]
  /** the point of the paragraph being read — marked, never flown to */
  near?: number
  onPick?: (view: number) => void
}
interface SceneProps extends Props {
  labelEls: RefObject<Record<string, HTMLSpanElement | null>>
  pointEls: RefObject<(HTMLButtonElement | null)[]>
}

/* ---------------- the ground ---------------- */

interface Ground { geo: THREE.BufferGeometry; mask: THREE.DataTexture; heightAt: (x: number, z: number) => number }

let groundCache: Promise<Ground> | null = null
function loadGround(): Promise<Ground> {
  groundCache ??= (async () => {
    const blob = await (await fetch(`${ART}height.png`)).blob()
    const bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
    const [GW, GH] = RELIEF.grid
    const cv = document.createElement('canvas')
    cv.width = GW; cv.height = GH
    const cx = cv.getContext('2d', { willReadFrequently: true })!
    cx.drawImage(bmp, 0, 0)
    const px = cx.getImageData(0, 0, GW, GH).data
    const hs = new Float32Array(GW * GH)
    const mk = new Uint8Array(GW * GH)
    const span = RELIEF.zmax - RELIEF.zmin
    for (let i = 0; i < GW * GH; i++) {
      hs[i] = RELIEF.zmin + ((px[i * 4] * 256 + px[i * 4 + 1]) / 65535) * span
      mk[i] = px[i * 4 + 2]
    }
    const geo = new THREE.PlaneGeometry(RELIEF.width, RELIEF.depth, GW - 1, GH - 1)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) pos.setY(i, hs[i])
    pos.needsUpdate = true
    geo.computeBoundingSphere()
    /* DataTexture row 0 is v=0 (south) — the shader samples the mask with 1−v */
    const mask = new THREE.DataTexture(mk, GW, GH, THREE.RedFormat, THREE.UnsignedByteType)
    mask.magFilter = THREE.LinearFilter; mask.minFilter = THREE.LinearFilter; mask.needsUpdate = true
    const heightAt = (x: number, z: number) => {
      const i = Math.max(0, Math.min(GW - 1, Math.round(((x + RELIEF.width / 2) / RELIEF.width) * (GW - 1))))
      const j = Math.max(0, Math.min(GH - 1, Math.round(((z + RELIEF.depth / 2) / RELIEF.depth) * (GH - 1))))
      return hs[j * GW + i]
    }
    return { geo, mask, heightAt }
  })()
  return groundCache
}

/* ---------------- the scene ---------------- */

const GOLD = new THREE.Color('#c79a3c')
const PANEL = new THREE.Color('#f3ead6')
const STAMP = new THREE.Color('#a5322f')
const MAXR = 8
const FLIGHT_MS = 1400

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
/* the relief's own edges, in scene units (the model is centred on the origin) */
const [WEST, EAST, NORTH, SOUTH] = [-RELIEF.width / 2, RELIEF.width / 2, -RELIEF.depth / 2, RELIEF.depth / 2]
const HALF_FOV = Math.tan(THREE.MathUtils.degToRad(35 / 2))

/** where the camera looks and from how far. A stop with `fit` frames those places itself, for
    whatever box the map stands in — the overview of a section must show every one of its points,
    and a hand-set distance that fits a wide box crops a tall one. */
function resolve(st: MapStop, aspect: number): { xz: [number, number]; dist: number; tilt: number } {
  if (st.fit?.length) {
    const ps = st.fit.map((p) => lonlat(p[0], p[1]))
    const xs = ps.map((p) => p[0]); const zs = ps.map((p) => p[1])
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
    /* margins: the names stand above their points, so more room on top */
    /* and more across: a name is wider than its point. A single place still gets ground around it */
    const w = Math.max(x1 - x0 + 5, 9); const h = Math.max(z1 - z0 + 3.4, 6)
    /* what the camera sees of the ground, per unit of distance: a TILTED camera sees a trapezoid —
       further north than south, and widest along its top edge. Measured 4.11: holding the centre a
       flat half-view inside the relief still showed its corner beyond the top edge at tilt 18° */
    const t = THREE.MathUtils.degToRad(st.cam.tilt); const fa = Math.atan(HALF_FOV)
    const north = Math.cos(t) * Math.tan(t + fa) - Math.sin(t)
    const south = Math.sin(t) - Math.cos(t) * Math.tan(t - fa)
    const across = (Math.cos(t) / Math.cos(t + fa)) * Math.cos(fa) * HALF_FOV * aspect
    /* never so far back that the trapezoid is bigger than the relief */
    const dist = Math.min(Math.max(h / 2 / HALF_FOV, w / 2 / (HALF_FOV * aspect)), (EAST - WEST) * 0.97 / (2 * across), (SOUTH - NORTH) * 0.97 / (north + south))
    /* and never looking past an edge: the centre is held so the trapezoid stays inside */
    const hold = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(Math.max(v, lo), hi))
    const cx = hold((x0 + x1) / 2, WEST + dist * across, EAST - dist * across)
    const cz = hold((z0 + z1) / 2 - 0.4, NORTH + dist * north, SOUTH - dist * south)
    return { xz: [cx, cz], dist, tilt: st.cam.tilt }
  }
  /* a narrow box sees less across: back off so the same ground fits */
  const k = aspect < 1.2 ? Math.sqrt(1.2 / aspect) : 1
  return { xz: lonlat(...st.cam.at), dist: st.cam.dist * k, tilt: st.cam.tilt }
}

function Scene({ stops, active, regions, arc, points, labelEls, pointEls }: SceneProps) {
  const { camera, invalidate, size } = useThree()
  const [ground, setGround] = useState<Ground | null>(null)
  const tex = useMemo(() => {
    const t = new THREE.TextureLoader().load(`${ART}relief.jpg`, () => invalidate())
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [invalidate])
  useEffect(() => { loadGround().then((g) => { setGround(g); invalidate() }) }, [invalidate])

  const regionKeys = useMemo(() => Object.keys(regions).slice(0, MAXR), [regions])
  const uniforms = useMemo(() => {
    const c = regionKeys.map((k) => {
      const { at, r } = regions[k]
      const [x, z] = lonlat(at[0], at[1])
      const [x2] = lonlat(at[0] + r[0], at[1])
      const [, z2] = lonlat(at[0], at[1] + r[1])
      return new THREE.Vector4(x, z, Math.abs(x2 - x), Math.abs(z2 - z))
    })
    while (c.length < MAXR) c.push(new THREE.Vector4(0, 0, 1, 1))
    return {
      uWashC: { value: c },
      uWashA: { value: new Array(MAXR).fill(0) as number[] },
      uMask: { value: null as THREE.Texture | null },
      uGold: { value: GOLD },
      uPanel: { value: PANEL },
    }
  }, [regionKeys, regions])

  const material = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ map: tex })
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms)
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vXZ;\nvarying vec2 vG;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvXZ = position.xz;\nvG = uv;')
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec2 vXZ;
varying vec2 vG;
uniform vec4 uWashC[${MAXR}];
uniform float uWashA[${MAXR}];
uniform sampler2D uMask;
uniform vec3 uGold;
uniform vec3 uPanel;`)
        .replace('#include <map_fragment>', `#include <map_fragment>
float land = texture2D(uMask, vec2(vG.x, 1.0 - vG.y)).r;
float w = 0.0;
for (int i = 0; i < ${MAXR}; i++) {
  vec2 d = (vXZ - uWashC[i].xy) / uWashC[i].zw;
  /* a soft, uneven edge — a wash, not a border (the source says „נפוצה בעיקר") */
  float e = length(d) + 0.09 * sin(vXZ.x * 3.1 + vXZ.y * 2.3) * sin(vXZ.y * 4.7 - vXZ.x * 1.3);
  w = max(w, uWashA[i] * smoothstep(1.2, 0.72, e));
}
diffuseColor.rgb *= mix(vec3(1.0), uGold, w * 0.72 * land);
/* the model's edges dissolve into the page: an edge in view reads as a map cut off */
vec2 ed = vec2(${(RELIEF.width / 2).toFixed(3)}, ${(RELIEF.depth / 2).toFixed(3)}) - abs(vXZ);
diffuseColor.rgb = mix(uPanel, diffuseColor.rgb, smoothstep(0.0, 2.2, min(ed.x, ed.y)));`)
    }
    return m
  }, [tex, uniforms])
  useEffect(() => { uniforms.uMask.value = ground?.mask ?? null; invalidate() }, [ground, uniforms, invalidate])

  const labels = useMemo(() => stops.flatMap((s, k) => (s.labels ?? []).map((l, j) => ({ ...l, k, id: `${k}-${j}` }))), [stops])
  const pins = useMemo(() => {
    const m = new Map<string, { at: [number, number]; ks: number[] }>()
    stops.forEach((s, k) => (s.pins ?? []).forEach((p) => {
      const key = p.join(',')
      if (!m.has(key)) m.set(key, { at: p, ks: [] })
      m.get(key)!.ks.push(k)
    }))
    return [...m.values()]
  }, [stops])
  const pinObjs = useRef<(THREE.Group | null)[]>([])

  const arcGeo = useMemo(() => {
    if (!ground || !arc) return null
    const [ax, az] = lonlat(...arc[0]); const [bx, bz] = lonlat(...arc[1])
    const a = new THREE.Vector3(ax, ground.heightAt(ax, az) + 0.24, az)
    const b = new THREE.Vector3(bx, ground.heightAt(bx, bz) + 0.24, bz)
    const lift = a.distanceTo(b) * 0.28
    const curve = new THREE.CubicBezierCurve3(a,
      a.clone().lerp(b, 0.3).setY(0.24 + lift), a.clone().lerp(b, 0.7).setY(0.24 + lift), b)
    return new THREE.TubeGeometry(curve, 120, 0.012, 8, false)
  }, [ground, arc])

  /* the flight: from wherever the camera is to the active stop */
  const flight = useRef({ from: active, to: active, t0: 0 })
  useEffect(() => {
    const f = flight.current
    if (f.to === active) return
    const now = performance.now()
    const p = Math.min(1, (now - f.t0) / FLIGHT_MS)
    /* a click mid-flight starts from the nearer end, never from a jump */
    f.from = p < 0.5 ? f.from : f.to
    f.to = active
    f.t0 = window.matchMedia('(prefers-reduced-motion:reduce)').matches ? now - FLIGHT_MS : now
    invalidate()
  }, [active, invalidate])
  useEffect(() => { invalidate() }, [size, invalidate])

  const tgt = useMemo(() => new THREE.Vector3(), [])
  const v3 = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const f = flight.current
    const raw = Math.min(1, (performance.now() - f.t0) / FLIGHT_MS)
    if (raw < 1) invalidate()
    const t = f.from === f.to ? 1 : ease(raw)
    const aspect = size.width / size.height
    const A = resolve(stops[f.from], aspect); const B = resolve(stops[f.to], aspect)
    const [ax, az] = A.xz; const [bx, bz] = B.xz
    const x = ax + (bx - ax) * t; const z = az + (bz - az) * t
    /* a long flight rises: the camera backs off mid-way so the reader sees where it is going */
    const travel = Math.hypot(bx - ax, bz - az)
    const bump = Math.max(0, travel * 0.55 - (A.dist + B.dist) * 0.25) * Math.sin(Math.PI * t)
    const dist = A.dist + (B.dist - A.dist) * t + bump
    const tilt = THREE.MathUtils.degToRad(A.tilt + (B.tilt - A.tilt) * t)
    tgt.set(x, 0.04, z)
    camera.position.set(x, 0.04 + dist * Math.cos(tilt), z + dist * Math.sin(tilt))
    camera.lookAt(tgt)
    camera.updateMatrixWorld()

    const w = (k: number) => (k === f.to ? t : 0) + (k === f.from && f.from !== f.to ? 1 - t : 0)
    regionKeys.forEach((key, i) => {
      uniforms.uWashA.value[i] = (stops[f.from].wash?.[key] ?? 0) * w(f.from) + (f.from !== f.to ? (stops[f.to].wash?.[key] ?? 0) * w(f.to) : 0)
    })

    /* the names are DOM over the canvas, projected here with the camera just moved (rule 81) */
    for (const l of labels) {
      const el = labelEls.current?.[l.id]
      if (!el) continue
      const o = w(l.k)
      el.style.opacity = o.toFixed(3)
      if (o <= 0 || !ground) continue
      const [lx, lz] = lonlat(...l.at)
      v3.set(lx, ground.heightAt(lx, lz) + (l.year ? 0.42 : 0.3), lz).project(camera)
      const px = ((v3.x + 1) / 2) * size.width
      const py = ((1 - v3.y) / 2) * size.height
      /* a name never leaves the box: it slides in from the edge, its foot still over the place */
      const hw = el.offsetWidth / 2 + 6
      const cx = Math.min(Math.max(px, hw), size.width - hw)
      el.style.transform = `translate(${cx.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -100%)`
    }
    /* the points: on the overview only, fading out as the camera leaves it */
    ;(points ?? []).forEach((pt, i) => {
      const el = pointEls.current?.[i]
      if (!el || !ground) return
      const o = w(0)
      el.style.opacity = o.toFixed(3)
      el.style.pointerEvents = o > 0.6 ? 'auto' : 'none'
      el.tabIndex = o > 0.6 ? 0 : -1
      if (o <= 0) return
      const [qx, qz] = lonlat(...pt.at)
      v3.set(qx, ground.heightAt(qx, qz) + 0.05, qz).project(camera)
      const px = ((v3.x + 1) / 2) * size.width
      const py = ((1 - v3.y) / 2) * size.height
      el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`
      /* the point stays on its place; only its name slides back inside the box */
      const tag = el.lastElementChild as HTMLElement | null
      if (tag) {
        const hw = tag.offsetWidth / 2 + 6
        const dx = Math.min(Math.max(px, hw), size.width - hw) - px
        tag.style.translate = `calc(-50% + ${dx.toFixed(1)}px) 0`
      }
    })
    pins.forEach((p, i) => {
      const g = pinObjs.current[i]
      if (!g) return
      const s = Math.min(1, p.ks.reduce((n, k) => n + w(k), 0))
      g.visible = s > 0.01
      g.scale.setScalar(Math.max(0.001, s))
    })
    if (arcGeo) {
      const a = stops[f.from].arc ?? 0; const b = stops[f.to].arc ?? 0
      const v = f.from === f.to ? b : a + (b - a) * t
      arcGeo.setDrawRange(0, Math.floor(((arcGeo.index?.count ?? 0) * v) / 6) * 6)
    }
  }, -1)

  return (
    <>
      <color attach="background" args={[PANEL]} />
      {/* far: the camera is held inside the relief now (resolve), so the fog only softens depth — at
          40 it washed the top half of a phone's map, whose camera stands further back */}
      <fog attach="fog" args={[PANEL, 60, 130]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[-6, 8, -6]} intensity={1.6} color="#fff0d8" />
      {ground && <mesh geometry={ground.geo} material={material} />}
      {ground && pins.map((p, i) => {
        const [x, z] = lonlat(...p.at)
        return (
          <group key={p.at.join(',')} position={[x, ground.heightAt(x, z), z]} ref={(g) => { pinObjs.current[i] = g }} visible={false}>
            <mesh position={[0, 0.11, 0]}><cylinderGeometry args={[0.008, 0.008, 0.22, 8]} /><meshLambertMaterial color={STAMP} /></mesh>
            <mesh position={[0, 0.23, 0]}><sphereGeometry args={[0.035, 16, 12]} /><meshLambertMaterial color={STAMP} /></mesh>
          </group>
        )
      })}
      {arcGeo && <mesh geometry={arcGeo}><meshLambertMaterial color={STAMP} /></mesh>}
    </>
  )
}

export default function Relief(props: Props) {
  const labelEls = useRef<Record<string, HTMLSpanElement | null>>({})
  const pointEls = useRef<(HTMLButtonElement | null)[]>([])
  const labels = useMemo(() => props.stops.flatMap((s, k) => (s.labels ?? []).map((l, j) => ({ ...l, id: `${k}-${j}` }))), [props.stops])
  return (
    <>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.75]}
        camera={{ fov: 35, near: 0.05, far: 120, position: [0, 24, 0.01] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor(PANEL)}
        fallback={
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ch11-map-fallback" src={`${ART}relief.jpg`} alt="" />
        }
      >
        <Scene {...props} labelEls={labelEls} pointEls={pointEls} />
      </Canvas>
      {/* the points — real buttons over the model, placed by the scene (rule 81) */}
      <div className="ch11-points">
        {(props.points ?? []).map((pt, i) => (
          <button
            type="button"
            key={pt.view}
            className={'ch11-point' + (i === props.near ? ' is-near' : '')}
            ref={(el) => { pointEls.current[i] = el }}
            style={{ opacity: 0 }}
            onClick={() => props.onPick?.(pt.view)}
          >
            <i aria-hidden="true" /><span>{pt.name}{pt.sub && <small>{pt.sub}</small>}</span>
          </button>
        ))}
      </div>
      <div className="ch11-labels" aria-hidden="true">
        {labels.map((l) => (
          <span key={l.id} className={'ch11-label' + (l.year ? ' is-year' : '')} ref={(el) => { labelEls.current[l.id] = el }} style={{ opacity: 0 }}>
            {l.text}
          </span>
        ))}
      </div>
    </>
  )
}
